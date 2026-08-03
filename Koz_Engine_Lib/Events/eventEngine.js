(function initEventEngineLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createEventEngineApi() {
/**
 * Event evaluation engine for conditional event selection.
 * Provides functions to filter events based on conditions and pick random events.
 */
function evaluateConditionSet(eventDef, context) {
    if (!eventDef || !context) return true;

    if (eventDef.minDay && context.day < eventDef.minDay) return false;
    if (Array.isArray(eventDef.terrain) && eventDef.terrain.length > 0) {
      if (eventDef.terrain.indexOf(context.terrain) === -1) return false;
    }
    if (Array.isArray(eventDef.season) && eventDef.season.length > 0) {
      if (eventDef.season.indexOf(context.season) === -1) return false;
    }

    return true;
  }

/**
 * Filters events that are eligible based on context conditions.
 * @param {Array} events - Array of event definitions
 * @param {Object} context - Context with day, terrain, season
 * @returns {Array} Eligible events
 */
function filterEligibleEvents(events, context) {
    if (!Array.isArray(events) || events.length === 0) return [];
    return events.filter(function checkEligibility(eventDef) {
      return evaluateConditionSet(eventDef, context);
    });
  }

/**
 * Picks a random event from an array using a custom or default random function.
 * @param {Array} events - Array of event definitions
 * @param {Function} [randomFn] - Optional random function returning 0-1
 * @returns {Object|null} Random event or null if empty
 */
function pickRandomEvent(events, randomFn) {
    if (!Array.isArray(events) || events.length === 0) return null;
    const rng = typeof randomFn === "function" ? randomFn : Math.random;
    const idx = Math.floor(rng() * events.length);
    return events[Math.max(0, Math.min(events.length - 1, idx))] || null;
  }

/**
 * Appends an item to history array with a maximum length limit.
 * @param {Array} history - Current history array
 * @param {*} item - Item to append
 * @param {number} [maxHistory=30] - Maximum history length
 * @returns {Array} New history array
 */
function appendHistory(history, item, maxHistory) {
    const next = Array.isArray(history) ? history.slice() : [];
    next.push(item);
    const max = Math.max(1, Number(maxHistory) || 30);
    while (next.length > max) next.shift();
    return next;
  }

  return {
    evaluateConditionSet: evaluateConditionSet,
    filterEligibleEvents: filterEligibleEvents,
    pickRandomEvent: pickRandomEvent,
    appendHistory: appendHistory,
  };
});
