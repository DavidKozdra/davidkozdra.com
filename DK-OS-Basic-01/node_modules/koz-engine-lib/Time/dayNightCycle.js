let dayNightCoreApi = null;
if (typeof require === "function") {
  try {
    dayNightCoreApi = require("./dayNightCore");
  } catch (_err) {}
}

(function initDayNightCycleLib(root, factory) {
  const api = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createDayNightCycleApi(root) {
  function defaultCreateDayChangedEvent(detail) {
    if (typeof CustomEvent === "function") {
      return new CustomEvent("dayChanged", { detail });
    }
    return { type: "dayChanged", detail };
  }

  function defaultRenderBackground(lightFactor) {
    if (typeof background !== "function" || typeof lerp !== "function") return;
    background(lerp(15, 100, lightFactor), lerp(15, 160, lightFactor), lerp(30, 210, lightFactor));
  }

  function defaultRenderOverlay(timeOfDay, lightFactor) {
    if (
      typeof lerp !== "function" ||
      typeof push !== "function" ||
      typeof pop !== "function" ||
      typeof noStroke !== "function" ||
      typeof fill !== "function" ||
      typeof rect !== "function" ||
      typeof sin !== "function" ||
      typeof width === "undefined" ||
      typeof height === "undefined"
    ) {
      return;
    }

    const nightAlpha = lerp(160, 0, lightFactor);

    if (nightAlpha > 5) {
      push();
      noStroke();
      fill(10, 10, 40, nightAlpha);
      rect(0, 0, width, height);
      pop();
    }

    const dawnDusk = sin(timeOfDay * 2);
    if (dawnDusk > 0.3) {
      push();
      noStroke();
      fill(200, 100, 30, dawnDusk * 20);
      rect(0, 0, width, height);
      pop();
    }
  }

/**
 * Day/night cycle manager with time progression, seasons, and rendering.
 */
class DayNightCycle {
  /**
   * Creates a new DayNightCycle.
   * @param {number} [dayCycleLength=60] - Length of a day in seconds
   * @param {Object} [options] - Configuration options
   */
  constructor(dayCycleLength = 60, options = {}) {
      const opts = options || {};
      this.timeOfDay = 0;
      this.dayCycleLength = dayCycleLength;
      this.daysElapsed = 0;
      this.daysPerYear = 100;
      this.weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      this.seasonNames = ["Winter", "Spring", "Summer", "Fall"];
      this.seasonLength = this.daysPerYear / 4;
      this._core = opts.core || dayNightCoreApi;
      this._eventTarget = opts.eventTarget || root || null;
      this._createDayChangedEvent = typeof opts.createDayChangedEvent === "function"
        ? opts.createDayChangedEvent
        : defaultCreateDayChangedEvent;
      this._onDayChanged = typeof opts.onDayChanged === "function" ? opts.onDayChanged : null;
      this._autoSave = typeof opts.autoSave === "function" ? opts.autoSave : null;
      this._canAutoSave = typeof opts.canAutoSave === "function" ? opts.canAutoSave : null;
      this._renderBackground = typeof opts.renderBackground === "function"
        ? opts.renderBackground
        : defaultRenderBackground;
      this._renderOverlay = typeof opts.renderOverlay === "function"
        ? opts.renderOverlay
        : defaultRenderOverlay;
    }

    update(deltaTime) {
      /**
       * Updates the time of day. Call each frame.
       * @param {number} deltaTime - Time since last frame in ms
       */
      const prevTime = this.timeOfDay;
      const core = this._core;

      if (core && typeof core.advanceTime === "function") {
        const next = core.advanceTime(this.timeOfDay, deltaTime, this.dayCycleLength);
        this.timeOfDay = next.current;
      } else {
        const dt = deltaTime / 1000;
        this.timeOfDay = (this.timeOfDay + (dt * TWO_PI) / this.dayCycleLength) % TWO_PI;
      }

      if (prevTime > this.timeOfDay) {
        this.daysElapsed++;

        const detail = {
          daysElapsed: this.daysElapsed,
          season: this.getSeason(),
          year: this.getYear(),
        };
        const event = this._createDayChangedEvent(detail);

        if (this._eventTarget && typeof this._eventTarget.dispatchEvent === "function" && event) {
          this._eventTarget.dispatchEvent(event);
        }
        if (this._onDayChanged) {
          this._onDayChanged(detail);
        }

        if (this.daysElapsed % 5 === 0 && this._autoSave) {
          if (!this._canAutoSave || this._canAutoSave()) {
            this._autoSave();
          }
        }
      }

      this._renderBackground(this.getLightFactor());
    }

    renderOverlay() {
      /**
       * Renders the night overlay and dawn/dusk effects.
       */
      this._renderOverlay(this.timeOfDay, this.getLightFactor());
    }

    getLightFactor() {
      /**
       * Gets the light factor (0-1) for rendering.
       * @returns {number} Light factor
       */
      const core = this._core;
      if (core && typeof core.getLightFactor === "function") {
        return core.getLightFactor(this.timeOfDay);
      }
      return (cos(this.timeOfDay) + 1) * 0.5;
    }

    getCurrentTimeRadians() {
      /**
       * Gets current time in radians [0, 2*PI).
       * @returns {number} Time in radians
       */
      return this.timeOfDay;
    }

    setTimeRadians(t) {
      /**
       * Sets the time of day.
       * @param {number} t - Time in radians
       */
      this.timeOfDay = t % TWO_PI;
    }

    getDaysElapsed() {
      /**
       * Gets total days elapsed.
       * @returns {number} Days elapsed
       */
      return this.daysElapsed;
    }

    setDaysElapsed(d) {
      /**
       * Sets the days elapsed counter.
       * @param {number} d - Days elapsed
       */
      this.daysElapsed = d;
    }

    getDayOfWeek() {
      /**
       * Gets the current day of week name.
       * @returns {string} Day name
       */
      return this.weekdays[this.daysElapsed % 7];
    }

    getYear() {
      /**
       * Gets the current year number.
       * @returns {number} Year
       */
      const core = this._core;
      if (core && typeof core.getYear === "function") {
        return core.getYear(this.daysElapsed, this.daysPerYear);
      }
      return Math.floor(this.daysElapsed / this.daysPerYear) + 1;
    }

    getSeason() {
      /**
       * Gets the current season name.
       * @returns {string} Season name
       */
      const core = this._core;
      if (core && typeof core.getSeason === "function") {
        return core.getSeason(this.daysElapsed, this.daysPerYear, this.seasonNames);
      }
      const dayInYear = this.daysElapsed % this.daysPerYear;
      const seasonIndex = Math.floor(dayInYear / this.seasonLength);
      return this.seasonNames[seasonIndex];
    }

    getTimeString() {
      /**
       * Gets formatted time string (HH:MM).
       * @returns {string} Formatted time
       */
      const core = this._core;
      if (core && typeof core.getTimeString === "function") {
        return core.getTimeString(this.timeOfDay);
      }
      const hourFraction = this.timeOfDay / TWO_PI;
      const hour = Math.floor(hourFraction * 24);
      const minute = Math.floor((hourFraction * 24 - hour) * 60);
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    }
  }

  return { DayNightCycle };
});
