(function initExtensionHostLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExtensionHostApi() {
  'use strict';

  const VALID_KINDS = Object.freeze(['service', 'component', 'adapter', 'content', 'system']);

  class ExtensionHost {
    constructor({ parent = null } = {}) {
      this.parent = parent instanceof ExtensionHost ? parent : null;
      this.entries = new Map(VALID_KINDS.map(kind => [kind, new Map()]));
    }

    register(kind, id, value, options = {}) {
      const bucket = this.entries.get(kind);
      const key = String(id || '').trim();
      if (!bucket || !key) throw new Error(`Invalid extension registration: ${kind}:${key}`);
      if (bucket.has(key) && options.replace !== true) throw new Error(`Extension already registered: ${kind}:${key}`);
      const entry = Object.freeze({ kind, id: key, value, metadata: Object.freeze({ ...(options.metadata || {}) }) });
      bucket.set(key, entry);
      return value;
    }

    registerService(id, value, options) { return this.register('service', id, value, options); }
    registerComponent(id, value, options) { return this.register('component', id, value, options); }
    registerAdapter(id, value, options) { return this.register('adapter', id, value, options); }
    registerContent(id, value, options) { return this.register('content', id, value, options); }
    registerSystem(id, value, options) { return this.register('system', id, value, options); }

    entry(kind, id) {
      const local = this.entries.get(kind)?.get(String(id || ''));
      return local || this.parent?.entry(kind, id) || null;
    }

    get(kind, id, fallback = undefined) { return this.entry(kind, id)?.value ?? fallback; }
    has(kind, id) { return this.entry(kind, id) !== null; }
    list(kind) {
      const combined = new Map((this.parent?.list(kind) || []).map(entry => [entry.id, entry]));
      for (const entry of this.entries.get(kind)?.values() || []) combined.set(entry.id, entry);
      return Array.from(combined.values());
    }
    require(kind, id) {
      const entry = this.entry(kind, id);
      if (!entry) throw new Error(`Required extension is unavailable: ${kind}:${id}`);
      return entry.value;
    }
    scope() { return new ExtensionHost({ parent: this }); }

    install(extension, options = {}) {
      if (!extension) return this;
      if (typeof extension === 'function') extension(this, options);
      else if (typeof extension.install === 'function') extension.install(this, options);
      else throw new Error('Extension must be a function or expose install(host, options)');
      return this;
    }
  }

  function createExtensionHost(options) { return new ExtensionHost(options); }
  return { VALID_KINDS, ExtensionHost, createExtensionHost };
});
