(function initStepTimerLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStepTimerApi() {
  'use strict';

  function advanceCountdown(remaining, delta) { return Math.max(0, Number(remaining || 0) - Math.max(0, Number(delta || 0))); }
  // A deterministic simulation timer: deliberately emits at most once per
  // update, so a long frame cannot burst several gameplay effects at once.
  function advanceInterval(remaining, delta, interval) {
    const period = Math.max(0.000001, Number(interval || 0));
    const next = Number(remaining || 0) - Math.max(0, Number(delta || 0));
    return next <= 0 ? { triggered: true, remaining: period } : { triggered: false, remaining: next };
  }
  return { advanceCountdown, advanceInterval };
});
