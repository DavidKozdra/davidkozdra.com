(function initDayNightCoreLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createDayNightCoreApi() {
/**
 * Core day/night cycle calculations.
 * Pure functions for time advancement, lighting, seasons, and time formatting.
 */
const TAU = Math.PI * 2;

/**
 * Normalizes an angle to [0, 2*PI).
 * @param {number} value - Angle in radians
 * @returns {number} Normalized angle
 */
function normalizeRadians(value) {
    var t = Number(value) || 0;
    t %= TAU;
    return t < 0 ? t + TAU : t;
  }

/**
 * Advances time by a delta amount.
 * @param {number} timeOfDay - Current time in radians [0, 2*PI)
 * @param {number} deltaMs - Time delta in milliseconds
 * @param {number} dayCycleLengthSec - Length of a day in seconds
 * @returns {Object} Object with previous, current, and rolledDay
 */
function advanceTime(timeOfDay, deltaMs, dayCycleLengthSec) {
    var prev = normalizeRadians(timeOfDay);
    var dt = (Number(deltaMs) || 0) / 1000;
    var cycle = Math.max(1, Number(dayCycleLengthSec) || 60);
    var next = normalizeRadians(prev + (dt * TAU) / cycle);
    return {
      previous: prev,
      current: next,
      rolledDay: prev > next,
    };
  }

/**
 * Gets light factor (0-1) based on time of day.
 * @param {number} timeOfDay - Current time in radians
 * @returns {number} Light factor (0=full dark, 1=full bright)
 */
function getLightFactor(timeOfDay) {
    return (Math.cos(normalizeRadians(timeOfDay)) + 1) * 0.5;
  }

/**
 * Gets the current season based on days elapsed.
 * @param {number} daysElapsed - Total days elapsed
 * @param {number} [daysPerYear=100] - Days per year
 * @param {Array} [seasonNames] - Array of season names
 * @returns {string} Current season name
 */
function getSeason(daysElapsed, daysPerYear, seasonNames) {
    var totalDays = Math.max(1, Number(daysPerYear) || 100);
    var seasons = Array.isArray(seasonNames) && seasonNames.length ? seasonNames : ["Winter", "Spring", "Summer", "Fall"];
    var seasonLength = totalDays / seasons.length;
    var dayInYear = ((Number(daysElapsed) || 0) % totalDays + totalDays) % totalDays;
    var idx = Math.floor(dayInYear / seasonLength);
    return seasons[Math.min(Math.max(idx, 0), seasons.length - 1)];
  }

/**
 * Gets the current year number.
 * @param {number} daysElapsed - Total days elapsed
 * @param {number} [daysPerYear=100] - Days per year
 * @returns {number} Current year (1-indexed)
 */
function getYear(daysElapsed, daysPerYear) {
    return Math.floor((Number(daysElapsed) || 0) / (Math.max(1, Number(daysPerYear) || 100))) + 1;
  }

/**
 * Formats time of day as HH:MM string.
 * @param {number} timeOfDay - Current time in radians
 * @returns {string} Formatted time string (HH:MM)
 */
function getTimeString(timeOfDay) {
    var hourFraction = normalizeRadians(timeOfDay) / TAU;
    var hour = Math.floor(hourFraction * 24);
    var minute = Math.floor((hourFraction * 24 - hour) * 60);
    return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  }

  return {
    TAU: TAU,
    normalizeRadians: normalizeRadians,
    advanceTime: advanceTime,
    getLightFactor: getLightFactor,
    getSeason: getSeason,
    getYear: getYear,
    getTimeString: getTimeString,
  };
});
