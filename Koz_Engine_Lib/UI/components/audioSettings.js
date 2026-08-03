(function initAudioSettingsLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAudioSettingsApi() {
  'use strict';
  const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  class AudioSettings {
    constructor({ state = {}, keys = ['master', 'sfx', 'music'], onChange = null } = {}) { this.state = state; this.keys = keys; this.onChange = onChange; }
    set(key, value) { if (!this.keys.includes(key)) return false; this.state[key] = clamp(value); this.onChange?.(key, this.state[key], this.state); return true; }
    get(key) { return clamp(this.state[key]); }
    bindRange(input, output, key) {
      if (!input) return; input.value = this.get(key); if (output) output.textContent = String(this.get(key));
      input.addEventListener('input', () => { this.set(key, input.value); if (output) output.textContent = String(this.get(key)); });
    }
  }
  return { AudioSettings };
});
