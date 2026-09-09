"use strict";

const {
  normalizeSessionDescriptor,
  isSessionDescriptorExpired,
  matchesSessionDescriptor,
} = require("./sessionDescriptor");

const DEFAULT_RESUME_STORAGE_KEY = "koz.multiplayer.resume.v1";

function createMemoryStorage(seed) {
  const data = new Map(Object.entries(seed || {}));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

class ResumeStore {
  constructor(options) {
    const opts = options || {};
    if (!opts.storage) throw new TypeError("ResumeStore requires a storage adapter");
    this.storage = opts.storage;
    this.key = String(opts.key || DEFAULT_RESUME_STORAGE_KEY);
    this.now = typeof opts.now === "function" ? opts.now : Date.now;
  }

  save(descriptor) {
    const normalized = normalizeSessionDescriptor(descriptor, { now: this.now() });
    this.storage.setItem(this.key, JSON.stringify(normalized));
    return normalized;
  }

  load(requirements) {
    let parsed;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      parsed = normalizeSessionDescriptor(JSON.parse(raw), { now: this.now() });
    } catch {
      this.clear();
      return null;
    }
    if (isSessionDescriptorExpired(parsed, this.now())
      || !matchesSessionDescriptor(parsed, { ...(requirements || {}), now: this.now() })) {
      this.clear();
      return null;
    }
    return parsed;
  }

  clear() {
    this.storage.removeItem(this.key);
  }
}

function createResumeStore(options) {
  return new ResumeStore(options);
}

module.exports = {
  DEFAULT_RESUME_STORAGE_KEY,
  createMemoryStorage,
  ResumeStore,
  createResumeStore,
};
