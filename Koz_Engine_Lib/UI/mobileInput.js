(function initMobileInputLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMobileInputApi() {
  function touchDistance(t1, t2) {
    const dx = (Number(t1?.clientX) || 0) - (Number(t2?.clientX) || 0);
    const dy = (Number(t1?.clientY) || 0) - (Number(t2?.clientY) || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function touchMidpoint(t1, t2) {
    return {
      x: ((Number(t1?.clientX) || 0) + (Number(t2?.clientX) || 0)) / 2,
      y: ((Number(t1?.clientY) || 0) + (Number(t2?.clientY) || 0)) / 2,
    };
  }

  function isTouchMobile(input = {}) {
    const hasTouch = !!input.hasTouch;
    const maxTouchPoints = Number(input.maxTouchPoints) || 0;
    const width = Number(input.width) || 0;
    const maxWidth = Number(input.maxWidth) || 1024;
    return (hasTouch || maxTouchPoints > 0) && width < maxWidth;
  }

  function clampZoom(value, opts = {}) {
    const min = Number(opts.min);
    const max = Number(opts.max);
    const snap = Number(opts.snap);
    const snapEpsilon = Number(opts.snapEpsilon);
    const lo = Number.isFinite(min) ? min : 0.15;
    const hi = Number.isFinite(max) ? max : 2;
    const s = Number.isFinite(snap) ? snap : 1;
    const eps = Number.isFinite(snapEpsilon) ? snapEpsilon : 0.03;
    let out = Math.min(hi, Math.max(lo, Number(value) || lo));
    if (Math.abs(out - s) < eps) out = s;
    return out;
  }

  function cycleIndex(index, length) {
    const i = Number(index) || 0;
    const len = Math.max(1, Number(length) || 1);
    return (i + 1) % len;
  }

  function beginPinchGesture(input = {}) {
    const touches = Array.isArray(input.touches) ? input.touches : [];
    if (touches.length < 2) return null;
    const t1 = touches[0];
    const t2 = touches[1];
    const midpoint = touchMidpoint(t1, t2);
    return {
      active: true,
      initialDist: touchDistance(t1, t2),
      initialZoom: Number(input.currentZoom) || 1,
      midX: midpoint.x,
      midY: midpoint.y,
    };
  }

  function updatePinchGesture(state, input = {}) {
    if (!state || !state.active) return null;
    const touches = Array.isArray(input.touches) ? input.touches : [];
    if (touches.length < 2) {
      return { active: false };
    }

    const t1 = touches[0];
    const t2 = touches[1];
    const midpoint = touchMidpoint(t1, t2);
    const currentZoom = Number(input.currentZoom);
    const camX = Number(input.camX) || 0;
    const camY = Number(input.camY) || 0;
    const zoomBase = Number.isFinite(currentZoom) ? currentZoom : (Number(state.initialZoom) || 1);
    const rawZoom = state.initialDist > 0
      ? (Number(state.initialZoom) || 1) * (touchDistance(t1, t2) / state.initialDist)
      : zoomBase;
    const zoom = clampZoom(rawZoom, input.zoomOptions || {});
    const dx = midpoint.x - (Number(state.midX) || 0);
    const dy = midpoint.y - (Number(state.midY) || 0);
    const divisor = zoomBase || 1;

    return {
      active: true,
      initialDist: state.initialDist,
      initialZoom: state.initialZoom,
      midX: midpoint.x,
      midY: midpoint.y,
      zoom,
      camX: camX - (dx / divisor),
      camY: camY - (dy / divisor),
    };
  }

  function mapClientToCanvas(input = {}) {
    const rect = input.rect || {};
    const clientX = Number(input.clientX) || 0;
    const clientY = Number(input.clientY) || 0;
    const left = Number(rect.left) || 0;
    const top = Number(rect.top) || 0;
    const rectWidth = Number(rect.width) || 0;
    const rectHeight = Number(rect.height) || 0;
    const bufferWidth = Number(input.bufferWidth) || 0;
    const bufferHeight = Number(input.bufferHeight) || 0;
    const cssX = clientX - left;
    const cssY = clientY - top;
    const ratioX = (bufferWidth && rectWidth) ? (bufferWidth / rectWidth) : 1;
    const ratioY = (bufferHeight && rectHeight) ? (bufferHeight / rectHeight) : ratioX;
    return {
      x: Math.round(cssX * ratioX),
      y: Math.round(cssY * ratioY),
    };
  }

  return {
    isTouchMobile,
    clampZoom,
    cycleIndex,
    touchDistance,
    touchMidpoint,
    beginPinchGesture,
    updatePinchGesture,
    mapClientToCanvas,
  };
});
