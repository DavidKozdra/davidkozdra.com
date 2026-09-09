(function initTipTrackerLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createTipTrackerApi() {
/**
 * Tracks which tips have been shown to the player.
 * Prevents repeat tips and provides progress tracking.
 */
class TipTracker {
  /**
   * Creates a new TipTracker.
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.storage] - Storage interface (getItem, setItem, removeItem)
   * @param {string} [options.storageKey='tip_tracker'] - Key for persisted state
   * @param {boolean} [options.enabled=true] - Whether tips are enabled
   */
  constructor(options = {}) {
      this._storage = options.storage || null;
      this._storageKey = String(options.storageKey || "tip_tracker");
      this._shown = new Set();
      this._enabled = options.enabled !== false;
      this._load();
    }

    _load() {
      /**
       * Loads saved tip state from storage.
       * @private
       */
      if (!this._storage || typeof this._storage.getItem !== "function") return;
      try {
        const raw = this._storage.getItem(this._storageKey);
        const arr = JSON.parse(raw || "[]");
        if (Array.isArray(arr)) this._shown = new Set(arr);
      } catch (_e) {
        this._shown = new Set();
      }
    }

    _save() {
      /**
       * Saves tip state to storage.
       * @private
       */
      if (!this._storage || typeof this._storage.setItem !== "function") return;
      try {
        this._storage.setItem(this._storageKey, JSON.stringify([...this._shown]));
      } catch (_e) {
        // ignore storage failures
      }
    }

    shouldShow(id, opts = {}) {
      /**
       * Determines if a tip should be shown.
       * @param {string} id - Tip identifier
       * @param {Object} [opts] - Options
       * @param {boolean} [opts.force] - Force showing regardless of history
       * @returns {boolean} True if tip should be shown
       */
      if (!this._enabled) return false;
      if (opts.force) return true;
      return !this._shown.has(id);
    }

    markShown(id) {
      /**
       * Marks a tip as having been shown.
       * @param {string} id - Tip identifier
       */
      this._shown.add(id);
      this._save();
    }

    markMany(ids) {
      /**
       * Marks multiple tips as shown.
       * @param {Array} ids - Array of tip identifiers
       */
      if (!Array.isArray(ids)) return;
      for (const id of ids) this._shown.add(id);
      this._save();
    }

    hasShown(id) {
      /**
       * Checks if a tip has been shown.
       * @param {string} id - Tip identifier
       * @returns {boolean} True if tip was shown
       */
      return this._shown.has(id);
    }

    reset() {
      /**
       * Resets all tip tracking.
       */
      this._shown.clear();
      this._enabled = true;
      if (this._storage && typeof this._storage.removeItem === "function") {
        this._storage.removeItem(this._storageKey);
      }
    }

    getProgress(total) {
      /**
       * Gets progress information for tips.
       * @param {number} total - Total number of tips
       * @returns {Object} Progress object with shown count and total
       */
      return { shown: this._shown.size, total: Number(total) || 0 };
    }

    /** @returns {boolean} Whether tips are enabled */
    get enabled() { return this._enabled; }
    /** @param {boolean} v - Set whether tips are enabled */
    set enabled(v) { this._enabled = !!v; }
  }

  return { TipTracker };
});
