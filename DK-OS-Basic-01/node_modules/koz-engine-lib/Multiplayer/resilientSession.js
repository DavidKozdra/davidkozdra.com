"use strict";

const INTENTIONAL_REASONS = new Set(["left", "leave", "quit", "menu", "disposed", "changed-session"]);

class ResilientSessionController {
  constructor(options) {
    const opts = options || {};
    if (typeof opts.connect !== "function") throw new TypeError("Resilient session requires connect()");
    this.connectSession = opts.connect;
    this.disconnectSession = typeof opts.disconnect === "function" ? opts.disconnect : null;
    this.resumeStore = opts.resumeStore || null;
    this.coordinator = opts.coordinator || null;
    this.applyDescriptor = typeof opts.applyDescriptor === "function" ? opts.applyDescriptor : null;
    this.createDescriptor = typeof opts.createDescriptor === "function" ? opts.createDescriptor : null;
    this.listeners = new Set();
    this.state = "idle";
    this.resource = null;
    this.descriptor = null;
  }

  async connect(resource, options) {
    const opts = options || {};
    const name = String(resource || "").trim();
    if (!name) throw new TypeError("Session resource is required");
    this.resource = name;
    if (this.coordinator && !(await this.coordinator.acquire(name))) {
      const error = new Error("This multiplayer session is active in another tab");
      error.code = "SESSION_ACTIVE_IN_ANOTHER_TAB";
      throw error;
    }
    this.state = "connecting";
    this._emit();
    const stored = opts.resume === false ? null : this.resumeStore?.load({ roomId: name });
    if (stored) {
      this.descriptor = stored;
      this.applyDescriptor?.(stored);
    }
    try {
      const result = await this.connectSession(name, { ...opts, descriptor: stored });
      this.state = "connected";
      this._emit();
      return result;
    } catch (error) {
      this.state = "failed";
      this.coordinator?.release();
      this._emit(error);
      throw error;
    }
  }

  persist(value) {
    const descriptor = value || this.createDescriptor?.();
    if (!descriptor) return null;
    this.descriptor = this.resumeStore ? this.resumeStore.save(descriptor) : descriptor;
    this._emit();
    return this.descriptor;
  }

  peek(requirements) {
    return this.resumeStore?.load(requirements) || null;
  }

  clear() {
    this.descriptor = null;
    this.resumeStore?.clear();
  }

  async disconnect(reason) {
    const normalized = String(reason || "disconnected");
    this.state = "disconnecting";
    this._emit();
    try {
      await this.disconnectSession?.(normalized);
    } finally {
      if (INTENTIONAL_REASONS.has(normalized)) this.clear();
      this.coordinator?.release();
      this.state = "idle";
      this._emit();
    }
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Resilient session listener must be a function");
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot() {
    return { state: this.state, resource: this.resource, descriptor: this.descriptor };
  }

  _emit(error) {
    const snapshot = { ...this.snapshot(), error: error || null };
    this.listeners.forEach(listener => listener(snapshot));
  }

  dispose() {
    this.coordinator?.dispose?.();
    this.listeners.clear();
  }
}

function createResilientSession(options) {
  return new ResilientSessionController(options);
}

module.exports = { INTENTIONAL_REASONS, ResilientSessionController, createResilientSession };
