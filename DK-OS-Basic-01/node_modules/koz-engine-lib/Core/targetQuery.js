(function initTargetQueryLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTargetQueryApi() {
  'use strict';

  // `visitCandidates` lets a host supply a spatial-grid query without this
  // module owning storage, entity classes, teams, or game-specific filters.
  function findNearestFromVisit({ x = 0, y = 0, radius = Infinity, visitCandidates, include = null } = {}) {
    if (typeof visitCandidates !== 'function') return null;
    const limit = Math.max(0, Number(radius));
    let nearest = null;
    let distanceSq = limit * limit;
    visitCandidates(candidate => {
      if (!candidate || (typeof include === 'function' && !include(candidate))) return;
      const dx = Number(candidate.x || 0) - x;
      const dy = Number(candidate.y || 0) - y;
      const nextDistanceSq = dx * dx + dy * dy;
      if (nextDistanceSq < distanceSq) { nearest = candidate; distanceSq = nextDistanceSq; }
    });
    return nearest;
  }
  return { findNearestFromVisit };
});
