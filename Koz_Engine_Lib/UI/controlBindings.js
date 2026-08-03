(function initControlBindingsLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createControlBindingsApi() {
  'use strict';
  function formatBinding(value, labels = {}) {
    const key = String(value ?? '').toLowerCase();
    return labels[key] || key.toUpperCase();
  }
  // Assign a physical control to an action. When uniqueness matters (touch
  // face buttons), swap the prior action rather than leaving two controls bound.
  function assignExclusiveBinding(bindings, controlKey, nextAction, defaults = {}) {
    const map = bindings && typeof bindings === 'object' ? bindings : {};
    const key = String(controlKey || '');
    const previousAction = map[key] || defaults[key] || '';
    const next = String(nextAction || previousAction);
    const occupiedKey = Object.keys(map).find(candidate => candidate !== key && map[candidate] === next);
    if (occupiedKey) map[occupiedKey] = previousAction;
    map[key] = next;
    return map;
  }
  return { formatBinding, assignExclusiveBinding };
});
