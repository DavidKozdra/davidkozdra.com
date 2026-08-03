(function initStatusBookLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatusBookApi() {
  'use strict';

  function normalizeNonNegative(value) { return Math.max(0, Number(value || 0)); }
  function createStatusState() { return { stacks: 0, duration: 0, tick: 0 }; }
  function createStatusMap(keys, createState = createStatusState) {
    return Object.fromEntries((Array.isArray(keys) ? keys : []).map(key => [key, createState(key)]));
  }
  function ensureStatusMap(entity, keys, { property = 'statuses', createState = createStatusState } = {}) {
    if (!entity || typeof entity !== 'object') return createStatusMap(keys, createState);
    if (!entity[property] || typeof entity[property] !== 'object') entity[property] = createStatusMap(keys, createState);
    for (const key of keys || []) {
      const state = entity[property][key];
      if (!state || typeof state !== 'object') entity[property][key] = createState(key);
      const target = entity[property][key];
      target.stacks = normalizeNonNegative(target.stacks);
      target.duration = normalizeNonNegative(target.duration);
      target.tick = Number(target.tick || 0);
    }
    return entity[property];
  }
  function clearStatusState(state) {
    if (!state || typeof state !== 'object') return state;
    state.stacks = 0;
    state.duration = 0;
    state.tick = 0;
    return state;
  }
  function applyStackedStatus(state, { stacks = 0, duration = 0, maxStacks = Infinity } = {}) {
    if (!state || typeof state !== 'object') return null;
    state.stacks = Math.min(Math.max(0, Number(maxStacks)), normalizeNonNegative(state.stacks) + normalizeNonNegative(stacks));
    state.duration = Math.max(normalizeNonNegative(state.duration), normalizeNonNegative(duration));
    return { stacks: state.stacks, duration: state.duration };
  }
  return { createStatusState, createStatusMap, ensureStatusMap, clearStatusState, applyStackedStatus };
});
