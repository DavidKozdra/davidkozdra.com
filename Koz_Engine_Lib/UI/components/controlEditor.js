(function initControlEditorLib(root, factory) {
  const bindings = typeof require === 'function'
    ? require('../controlBindings.js')
    : (root.KozEngine?.UI?.controlBindings || root.KozLib);
  const api = factory(bindings || {});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createControlEditorApi(bindingApi) {
  'use strict';
  class ControlEditor {
    constructor({ bindings = {}, defaults = {}, onChange = null, exclusive = false } = {}) {
      this.bindings = bindings; this.defaults = defaults; this.onChange = onChange; this.exclusive = exclusive; this.listeningAction = null;
    }
    begin(action) { this.listeningAction = String(action || ''); return !!this.listeningAction; }
    cancel() { this.listeningAction = null; }
    assign(action, value) {
      const key = String(action || ''); if (!key) return false;
      if (this.exclusive) bindingApi.assignExclusiveBinding?.(this.bindings, key, value, this.defaults);
      else this.bindings[key] = String(value || '');
      this.listeningAction = null; this.onChange?.(this.bindings, key); return true;
    }
    captureKeyboard(event) { if (!this.listeningAction || !event?.key) return false; return this.assign(this.listeningAction, String(event.key).toLowerCase()); }
    label(action, labels) { return bindingApi.formatBinding?.(this.bindings[action] ?? this.defaults[action], labels) || ''; }
  }
  return { ControlEditor };
});
