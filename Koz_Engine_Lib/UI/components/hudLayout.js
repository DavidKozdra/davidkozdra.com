(function initHudLayoutLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createHudLayoutApi() {
  'use strict';
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  class HudLayoutRegistry {
    constructor(definitions = [], { minScale = 0.5, maxScale = 2 } = {}) { this.definitions = new Map(definitions.filter(def => def?.key).map(def => [def.key, { ...def }])); this.minScale = minScale; this.maxScale = maxScale; }
    createState(saved = {}) { const state = {}; for (const [key] of this.definitions) { const value = saved[key] || {}; state[key] = { scale: value.scale == null ? null : Math.max(this.minScale, Math.min(this.maxScale, finite(value.scale, 1))), visible: value.visible !== false, x: finite(value.x), y: finite(value.y) }; } return state; }
    update(state, key, patch) { if (!state?.[key] || !this.definitions.has(key)) return false; Object.assign(state[key], patch || {}); state[key].x = finite(state[key].x); state[key].y = finite(state[key].y); if (state[key].scale != null) state[key].scale = Math.max(this.minScale, Math.min(this.maxScale, finite(state[key].scale, 1))); return true; }
    applyDom(root, state, fallbackScale = 1) { for (const [key, def] of this.definitions) { if (!def.selector || !root?.querySelector) continue; const element = root.querySelector(def.selector); const value = state?.[key]; if (!element || !value) continue; if (def.cssVar) element.style.setProperty(def.cssVar, String(value.scale ?? fallbackScale)); if (def.xVar) element.style.setProperty(def.xVar, `${value.x}px`); if (def.yVar) element.style.setProperty(def.yVar, `${value.y}px`); if (def.hideClass) root.body?.classList?.toggle(def.hideClass, !value.visible); } }
  }
  return { HudLayoutRegistry };
});
