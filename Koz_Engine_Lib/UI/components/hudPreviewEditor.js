(function initHudPreviewEditorLib(root, factory) {
  const layoutApi = typeof require === 'function'
    ? require('./hudLayout.js')
    : (root.KozEngine?.UI?.components?.hudLayout || root.KozLib);
  const api = factory(layoutApi || {});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createHudPreviewEditorApi(layoutApi) {
  'use strict';

  /**
   * Generic HUD preview editor. The host supplies its own widget definitions,
   * layout state, and persistence/render hooks; this component discovers boxes
   * by class and owns their registration plus edit gestures.
   */
  class HudPreviewEditor {
    constructor({
      root = null,
      targetClass = 'hud-preview-box',
      registry = null,
      getState = () => ({}),
      setState = () => {},
      getKey = element => element?.dataset?.preview || element?.dataset?.hudComponent || '',
      getResizeDirection = () => ({ x: 1, y: 1 }),
      onChange = null,
      onRegister = null,
      previewScale = 1,
    } = {}) {
      this.root = root;
      this.targetClass = String(targetClass || 'hud-preview-box').replace(/^\./, '');
      this.registry = registry;
      this.getState = getState;
      this.setState = setState;
      this.getKey = getKey;
      this.getResizeDirection = getResizeDirection;
      this.onChange = onChange;
      this.onRegister = onRegister;
      this.previewScale = Number(previewScale) || 1;
      this.components = new Map();
      this.drag = null;
      this.resize = null;
    }
    registerComponents(root = this.root) {
      const selector = `.${this.targetClass}`;
      const elements = Array.from(root?.querySelectorAll?.(selector) || []);
      elements.forEach(element => this.registerComponent(element));
      return this.components;
    }
    registerComponent(element) {
      const key = String(this.getKey(element) || '');
      if (!element || !key || this.components.has(key)) return false;
      this.components.set(key, element);
      element.dataset.hudPreviewRegistered = 'true';
      this._ensureControls(element, key);
      this._bindPointerEvents(element, key);
      this.onRegister?.(key, element);
      return true;
    }
    unregisterComponents() { this.components.clear(); this.drag = null; this.resize = null; }
    sync() {
      const state = this.getState() || {};
      for (const [key, element] of this.components) {
        const layout = state[key];
        if (!layout) continue;
        element.classList?.toggle('hud-preview-component--hidden', layout.visible === false);
        element.dataset.hudPreviewVisible = String(layout.visible !== false);
      }
    }
    _ensureControls(element, key) {
      const documentRef = element.ownerDocument || this.root?.ownerDocument || globalThis.document;
      if (!element.querySelector?.('.hud-preview-component__resize') && documentRef?.createElement) {
        const handle = documentRef.createElement('span');
        handle.className = 'hud-preview-component__resize';
        handle.dataset.hudPreviewResize = key;
        handle.setAttribute('aria-hidden', 'true');
        element.appendChild(handle);
      }
      if (!element.querySelector?.('.hud-preview-component__visibility') && documentRef?.createElement) {
        const button = documentRef.createElement('button');
        button.type = 'button'; button.className = 'hud-preview-component__visibility'; button.dataset.hudPreviewVisibility = key;
        button.setAttribute('aria-label', 'Toggle HUD component visibility');
        button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); this.toggleVisibility(key); });
        element.appendChild(button);
      }
    }
    _bindPointerEvents(element, key) {
      element.addEventListener?.('pointerdown', event => {
        const resize = event.target?.closest?.('[data-hud-preview-resize]');
        const state = this.getState()?.[key];
        if (!state || event.button > 0) return;
        element.setPointerCapture?.(event.pointerId);
        if (resize) this.resize = { key, pointerId: event.pointerId, x: event.clientX, y: event.clientY, scale: Number(state.scale ?? 1), direction: this.getResizeDirection(key) };
        else this.drag = { key, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: Number(state.x || 0), startY: Number(state.y || 0) };
        event.preventDefault();
      });
      element.addEventListener?.('pointermove', event => this._move(event));
      element.addEventListener?.('pointerup', event => this._end(event));
      element.addEventListener?.('pointercancel', event => this._end(event));
    }
    _move(event) {
      const state = this.getState() || {};
      if (this.drag?.pointerId === event.pointerId) {
        const entry = state[this.drag.key];
        if (!entry) return;
        this._update(this.drag.key, { x: this.drag.startX + (event.clientX - this.drag.x) / this.previewScale, y: this.drag.startY + (event.clientY - this.drag.y) / this.previewScale });
      }
      if (this.resize?.pointerId === event.pointerId) {
        const entry = state[this.resize.key];
        if (!entry) return;
        const dx = (event.clientX - this.resize.x) * Number(this.resize.direction?.x || 1);
        const dy = (event.clientY - this.resize.y) * Number(this.resize.direction?.y || 1);
        this._update(this.resize.key, { scale: Math.max(0.1, this.resize.scale + (dx + dy) / 220) });
      }
    }
    _end(event) { if (this.drag?.pointerId === event.pointerId) this.drag = null; if (this.resize?.pointerId === event.pointerId) this.resize = null; }
    toggleVisibility(key) { const entry = this.getState()?.[key]; return entry ? this._update(key, { visible: entry.visible === false }) : false; }
    _update(key, patch) {
      const state = this.getState();
      const changed = this.registry?.update ? this.registry.update(state, key, patch) : !!state?.[key];
      if (!changed) return false;
      if (!this.registry?.update) Object.assign(state[key], patch);
      this.setState(state, key, patch);
      this.sync();
      this.onChange?.(state, key, patch);
      return true;
    }
  }
  return { HudPreviewEditor };
});
