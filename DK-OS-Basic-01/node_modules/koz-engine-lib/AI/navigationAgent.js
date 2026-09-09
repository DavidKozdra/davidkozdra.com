(function initNavigationAgentLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createNavigationAgentApi() {
  'use strict';

  function distanceSq(a, b) { const dx = Number(a.x || 0) - Number(b.x || 0); const dy = Number(a.y || 0) - Number(b.y || 0); return dx * dx + dy * dy; }

  class NavigationAgent {
    constructor({ repathInterval = 0.3, targetMoveThreshold = 20, waypointRadius = 12 } = {}) {
      this.repathInterval = Math.max(0, Number(repathInterval || 0));
      this.targetMoveThreshold = Math.max(0, Number(targetMoveThreshold || 0));
      this.waypointRadius = Math.max(0, Number(waypointRadius || 0));
      this.path = [];
      this.waypointIndex = 0;
      this.repathElapsed = Infinity;
      this.lastTarget = null;
    }
    clearPath() { this.path = []; this.waypointIndex = 0; this.lastTarget = null; this.repathElapsed = Infinity; }
    setPath(path, target) {
      this.path = Array.isArray(path) ? path.filter(point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))).map(point => ({ x: Number(point.x), y: Number(point.y) })) : [];
      this.waypointIndex = 0;
      this.lastTarget = target ? { x: Number(target.x || 0), y: Number(target.y || 0) } : null;
      this.repathElapsed = 0;
    }
    update({ position, target, delta = 0, requestPath } = {}) {
      if (!position || !target) return { hasPath: false, directionX: 0, directionY: 0, waypoint: null, repathed: false };
      this.repathElapsed += Math.max(0, Number(delta || 0));
      const targetMoved = !this.lastTarget || distanceSq(target, this.lastTarget) >= this.targetMoveThreshold * this.targetMoveThreshold;
      let repathed = false;
      if (typeof requestPath === 'function' && (this.path.length === 0 || targetMoved || this.repathElapsed >= this.repathInterval)) {
        this.setPath(requestPath(position, target), target);
        repathed = true;
      }
      while (this.waypointIndex < this.path.length && distanceSq(position, this.path[this.waypointIndex]) <= this.waypointRadius * this.waypointRadius) this.waypointIndex += 1;
      const waypoint = this.path[this.waypointIndex] || { x: Number(target.x || 0), y: Number(target.y || 0) };
      const dx = waypoint.x - Number(position.x || 0);
      const dy = waypoint.y - Number(position.y || 0);
      const length = Math.hypot(dx, dy);
      return { hasPath: this.waypointIndex < this.path.length, directionX: length > 0 ? dx / length : 0, directionY: length > 0 ? dy / length : 0, waypoint, repathed };
    }
  }
  return { NavigationAgent };
});
