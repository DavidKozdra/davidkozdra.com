(function initNotificationManagerLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createNotificationManagerApi() {
  /**
   * Default notification colors for different message types.
   * @readonly
   * @enum {string}
   */
  const DEFAULT_COLORS = {
    error: "#b71c1c",
    success: "#388e3c",
    warning: "#f57c00",
    holiday: "#caa350",
    info: "#333",
  };

  /**
   * Gets the color for a notification type from a palette.
   * @param {string} type - Notification type (error, success, warning, info)
   * @param {Object} [palette] - Custom color palette
   * @returns {string} Hex color code
   */
  function getNotificationColor(type, palette) {
    var p = palette || DEFAULT_COLORS;
    return p[type] || p.info || "#333";
  }

  /**
   * Unified notification manager with queue management and UI rendering.
   * Handles displaying game notifications to the player with automatic expiration,
   * queue management, and optional interactive actions.
   */
  class NotificationManager {
    /**
     * Creates a new NotificationManager.
     * @param {Object} [options] - Configuration options
     * @param {number} [options.maxNotifications=5] - Maximum notifications to hold
     * @param {Function} [options.now] - Time function returning current timestamp
     * @param {Function} [options.setTimer] - Timer set function
     * @param {Function} [options.clearTimer] - Timer clear function
     * @param {Object} [options.colorPalette] - Custom color palette for notification types
     */
    constructor(options = {}) {
      const opts = options || {};

      // Queue management
      this.maxNotifications = Math.max(1, Number(opts.maxNotifications) || 5);
      this._now = typeof opts.now === "function" ? opts.now : function defaultNow() { return Date.now(); };
      this._setTimer = typeof opts.setTimer === "function"
        ? opts.setTimer
        : function defaultSetTimer(fn, ms) { return globalThis.setTimeout(fn, ms); };
      this._clearTimer = typeof opts.clearTimer === "function"
        ? opts.clearTimer
        : function defaultClearTimer(id) { return globalThis.clearTimeout(id); };
      this._seq = 0;
      this._entries = [];
      this._entryById = new Map();
      this._timers = new Map();
      this._domNodes = new Map();
      this._colorPalette = opts.colorPalette || DEFAULT_COLORS;

      // UI rendering (p5.js integration)
      const oldPanel = typeof select === "function" ? select("#notificationPanel") : null;
      if (oldPanel) oldPanel.remove();

      this.uiContainer = typeof createDiv === "function"
        ? createDiv().id("notificationPanel").style("position", "absolute")
            .style("top", "20px")
            .style("left", "50%")
            .style("transform", "translateX(-50%)")
            .style("z-index", "1000")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "center")
            .style("pointer-events", "none")
        : null;
    }

    /**
     * Adds a notification to the queue.
     * @param {Object} payload - Notification data
     * @param {string} payload.message - Notification text
     * @param {string} [payload.type='info'] - Notification type
     * @param {number} [payload.duration=5000] - Display duration in ms
     * @param {Function} [onExpire] - Called when notification expires
     * @returns {Object} Entry and any dropped notification
     * @private
     */
    _enqueue(payload, onExpire) {
      const data = payload || {};
      const duration = Math.max(0, Number(data.duration) || 5000);
      const entry = {
        id: "note-" + this._now() + "-" + (++this._seq),
        message: String(data.message || ""),
        type: String(data.type || "info"),
        duration: duration,
        action: data.action || null,
        createdAt: this._now(),
      };

      this._entries.push(entry);
      this._entryById.set(entry.id, entry);

      var dropped = null;
      if (this._entries.length > this.maxNotifications) {
        dropped = this._entries.shift();
        if (dropped && dropped.id) this._dismiss(dropped.id, "overflow");
      }

      const timerId = this._setTimer(() => {
        this._dismiss(entry.id, "timeout");
        if (typeof onExpire === "function") onExpire(entry);
      }, duration);
      this._timers.set(entry.id, timerId);

      return { entry: entry, dropped: dropped };
    }

    /**
     * Removes a notification from the queue by ID.
     * @param {string} id - Notification ID
     * @param {string} [reason] - Reason for dismissal
     * @private
     */
    _dismiss(id, reason) {
      const timerId = this._timers.get(id);
      if (timerId) {
        this._clearTimer(timerId);
        this._timers.delete(id);
      }

      if (!this._entryById.has(id)) return;
      this._entryById.delete(id);

      for (let index = 0; index < this._entries.length; index += 1) {
        if (this._entries[index] && this._entries[index].id === id) {
          this._entries.splice(index, 1);
          break;
        }
      }

      const domNode = this._domNodes.get(id);
      if (domNode) {
        try { domNode.remove(); } catch (_err) {}
        this._domNodes.delete(id);
      } else if (typeof select === "function") {
        select(`#${id}`)?.remove();
      }
    }

    /**
     * Checks if a notification exists in the queue.
     * @param {string} id - Notification ID
     * @returns {boolean} True if notification exists
     */
    has(id) {
      return this._entryById.has(id);
    }

    /**
     * Gets all notifications currently in the queue.
     * @returns {Array} Copy of notification entries
     */
    list() {
      return this._entries.slice();
    }

    /**
     * Logs a notification to be displayed.
     * @param {string} message - Notification text
     * @param {string} [type='info'] - Notification type (error, success, warning, info)
     * @param {number} [duration=5000] - Display duration in milliseconds
     * @param {Function|Object} [action] - Optional click action (function or {label, onClick})
     * @returns {string} Notification ID
     */
    log(message, type = "info", duration = 5000, action = null) {
      // Enqueue in internal queue
      const { entry } = this._enqueue(
        { message, type, duration, action },
        (entry) => {
          this._dismiss(entry.id, "timeout");
        }
      );

      const id = entry.id;

      // Render UI if p5.js is available
      if (!this.uiContainer || typeof createDiv !== "function") {
        return id;
      }

      const notification = createDiv(message)
        .id(id)
        .class("notification")
        .parent(this.uiContainer)
        .style("background", getNotificationColor(type, this._colorPalette))
        .style("color", "#fff")
        .style("padding", "10px 20px")
        .style("margin", "6px 0")
        .style("border-radius", "8px")
        .style("box-shadow", "0 0 12px rgba(0,0,0,0.3)")
        .style("font-size", "calc(16px * var(--font-scale, 1))")
        .style("min-width", "200px")
        .style("text-align", "center")
        .style("pointer-events", action ? "auto" : "none")
        .style("opacity", "0")
        .style("transition", "opacity 0.3s ease");
      this._domNodes.set(id, notification.elt || notification);

      if (action && typeof action.onClick === 'function') {
        const btn = createButton(action.label || "Action")
          .parent(notification)
          .style("margin-left", "10px")
          .style("padding", "4px 10px")
          .style("border", "none")
          .style("border-radius", "6px")
          .style("background", "#e7c66a")
          .style("color", "#1a1a1a")
          .style("font-size", "calc(13px * var(--font-scale, 1))")
          .style("font-weight", "bold")
          .style("cursor", "pointer")
          .style("pointer-events", "auto");
        btn.mousePressed(() => {
          try { action.onClick(); } catch (e) { console.warn('Notification action failed:', e); }
          this._dismiss(id);
        });
      }

      setTimeout(() => notification.style("opacity", "1"), 50);

      return id;
    }

    /**
     * Dismisses all active notifications.
     */
    dismissAll() {
      const entries = this._entries.slice();
      entries.forEach((entry) => {
        this._dismiss(entry.id);
      });
    }
  }

  return {
    DEFAULT_COLORS: DEFAULT_COLORS,
    getNotificationColor: getNotificationColor,
    NotificationManager: NotificationManager,
  };
});
