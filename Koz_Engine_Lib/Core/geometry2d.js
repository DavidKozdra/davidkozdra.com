(function initGeometry2dLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGeometry2dApi() {
  'use strict';

  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value || 0))); }
  function normalizeAngle(angle) {
    let value = Number(angle || 0) % (Math.PI * 2);
    if (value > Math.PI) value -= Math.PI * 2;
    if (value < -Math.PI) value += Math.PI * 2;
    return value;
  }
  function turnAngleToward(current, target, maxStep) {
    const delta = normalizeAngle(Number(target || 0) - Number(current || 0));
    return Number(current || 0) + clamp(delta, -Math.abs(Number(maxStep || 0)), Math.abs(Number(maxStep || 0)));
  }
  function lineIntersectsRect(x1, y1, x2, y2, rect, padding = 0) {
    if (!rect) return false;
    const minX = Number(rect.x || 0) - padding;
    const minY = Number(rect.y || 0) - padding;
    const maxX = minX + Number(rect.w ?? rect.width ?? 0) + padding * 2;
    const maxY = minY + Number(rect.h ?? rect.height ?? 0) + padding * 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    let t0 = 0;
    let t1 = 1;
    for (const [p, q] of [[-dx, x1 - minX], [dx, maxX - x1], [-dy, y1 - minY], [dy, maxY - y1]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const ratio = q / p;
      if (p < 0) { if (ratio > t1) return false; if (ratio > t0) t0 = ratio; }
      else { if (ratio < t0) return false; if (ratio < t1) t1 = ratio; }
    }
    return true;
  }
  function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > 0 ? clamp(((cx - x1) * dx + (cy - y1) * dy) / lengthSq, 0, 1) : 0;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    const hitX = cx - x;
    const hitY = cy - y;
    return hitX * hitX + hitY * hitY <= radius * radius ? { x, y, angle: Math.atan2(dy, dx) } : null;
  }
  return { clamp, normalizeAngle, turnAngleToward, lineIntersectsRect, segmentHitsCircle };
});
