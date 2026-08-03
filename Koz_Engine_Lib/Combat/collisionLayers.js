(function initCollisionLayersLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCollisionLayersApi() {
  'use strict';
  function createCollisionLayers(names = []) {
    const layers = {};
    names.forEach((name, index) => { if (index < 31 && typeof name === 'string') layers[name] = 1 << index; });
    return Object.freeze(layers);
  }
  function maskFor(layers, ...names) { return names.reduce((mask, name) => mask | Number(layers?.[name] || 0), 0); }
  function canCollide(a, b) {
    if (!a || !b) return false;
    const aLayer = Number(a.collisionLayer || 0);
    const bLayer = Number(b.collisionLayer || 0);
    const aMask = Number(a.collisionMask ?? 0x7fffffff);
    const bMask = Number(b.collisionMask ?? 0x7fffffff);
    return (aMask & bLayer) !== 0 && (bMask & aLayer) !== 0;
  }
  // Sweeps a circle against an axis-aligned rectangle by raycasting against the
  // rectangle expanded by the circle radius (Minkowski sum).
  function sweepCircleRect({ x, y, radius = 0, dx, dy }, rect) {
    if (!rect) return null;
    const r = Math.max(0, Number(radius || 0));
    const minX = Number(rect.x || 0) - r, maxX = Number(rect.x || 0) + Number(rect.w ?? rect.width ?? 0) + r;
    const minY = Number(rect.y || 0) - r, maxY = Number(rect.y || 0) + Number(rect.h ?? rect.height ?? 0) + r;
    const vx = Number(dx || 0), vy = Number(dy || 0);
    let enter = 0, exit = 1, normalX = 0, normalY = 0;
    for (const [origin, velocity, min, max, axis] of [[Number(x || 0), vx, minX, maxX, 'x'], [Number(y || 0), vy, minY, maxY, 'y']]) {
      if (velocity === 0) { if (origin < min || origin > max) return null; continue; }
      const first = (min - origin) / velocity, second = (max - origin) / velocity;
      const near = Math.min(first, second), far = Math.max(first, second);
      if (near > enter) { enter = near; normalX = axis === 'x' ? (first < second ? -1 : 1) : 0; normalY = axis === 'y' ? (first < second ? -1 : 1) : 0; }
      exit = Math.min(exit, far);
      if (enter > exit) return null;
    }
    if (enter < 0 || enter > 1) return null;
    return { t: enter, x: Number(x || 0) + vx * enter, y: Number(y || 0) + vy * enter, normalX, normalY };
  }
  function findFirstSweepHit(circle, rects, include = null) {
    let nearest = null;
    for (const rect of rects || []) {
      if (typeof include === 'function' && !include(rect)) continue;
      const hit = sweepCircleRect(circle, rect);
      if (hit && (!nearest || hit.t < nearest.t)) nearest = { ...hit, rect };
    }
    return nearest;
  }
  return { createCollisionLayers, maskFor, canCollide, sweepCircleRect, findFirstSweepHit };
});
