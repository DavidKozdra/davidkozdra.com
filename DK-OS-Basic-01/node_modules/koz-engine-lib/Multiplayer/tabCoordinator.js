"use strict";

const DEFAULT_LEASE_MS = 12_000;
const DEFAULT_HEARTBEAT_MS = 4_000;
const DEFAULT_CHANNEL_NAME = "koz.multiplayer.tabs.v1";
const DEFAULT_LEASE_PREFIX = "koz.multiplayer.lease.v1:";

function randomId(random) {
  const source = typeof random === "function" ? random : Math.random;
  return `${Date.now().toString(36)}-${Math.floor(source() * 0x100000000).toString(36)}`;
}

class TabCoordinator {
  constructor(options) {
    const opts = options || {};
    this.tabId = String(opts.tabId || randomId(opts.random));
    this.storage = opts.storage || null;
    this.locks = opts.locks || null;
    this.now = typeof opts.now === "function" ? opts.now : Date.now;
    this.setInterval = opts.setInterval || globalThis.setInterval?.bind(globalThis);
    this.clearInterval = opts.clearInterval || globalThis.clearInterval?.bind(globalThis);
    this.leaseMs = Math.max(2_000, Number(opts.leaseMs) || DEFAULT_LEASE_MS);
    this.heartbeatMs = Math.max(500, Math.min(this.leaseMs / 2, Number(opts.heartbeatMs) || DEFAULT_HEARTBEAT_MS));
    this.channelName = String(opts.channelName || DEFAULT_CHANNEL_NAME);
    this.leasePrefix = String(opts.leasePrefix || DEFAULT_LEASE_PREFIX);
    this.channel = opts.channel || (typeof opts.createChannel === "function"
      ? opts.createChannel(this.channelName)
      : null);
    this.listeners = new Set();
    this.resource = null;
    this.leaseToken = null;
    this.heartbeatTimer = null;
    this.releaseLock = null;
    this.lockRequest = null;
    this.boundMessage = event => this._receive(event?.data ?? event);
    this.channel?.addEventListener?.("message", this.boundMessage);
    if (this.channel && !this.channel.addEventListener) this.channel.onmessage = this.boundMessage;
  }

  async acquire(resource) {
    const name = String(resource || "").trim();
    if (!name) throw new TypeError("Tab lease resource is required");
    if (this.resource === name) return true;
    if (this.resource) this.release();
    if (this.locks?.request) return this._acquireWebLock(name);
    return this._acquireStorageLease(name);
  }

  async _acquireWebLock(resource) {
    let settle;
    const acquired = new Promise(resolve => { settle = resolve; });
    let release;
    const hold = new Promise(resolve => { release = resolve; });
    this.lockRequest = this.locks.request(
      `${this.leasePrefix}${resource}`,
      { ifAvailable: true, mode: "exclusive" },
      async lock => {
        if (!lock) {
          settle(false);
          return;
        }
        this.resource = resource;
        this.leaseToken = randomId();
        this.releaseLock = release;
        settle(true);
        this._publish({ type: "acquired", resource });
        await hold;
      },
    ).catch(() => settle(false));
    return acquired;
  }

  _leaseKey(resource) {
    return `${this.leasePrefix}${resource}`;
  }

  _readLease(resource) {
    try {
      const value = JSON.parse(this.storage?.getItem(this._leaseKey(resource)) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  _acquireStorageLease(resource) {
    if (!this.storage) {
      this.resource = resource;
      this.leaseToken = randomId();
      return true;
    }
    const current = this._readLease(resource);
    if (current && current.expiresAt > this.now() && current.tabId !== this.tabId) return false;
    const token = randomId();
    const lease = { tabId: this.tabId, token, expiresAt: this.now() + this.leaseMs };
    this.storage.setItem(this._leaseKey(resource), JSON.stringify(lease));
    const confirmed = this._readLease(resource);
    if (confirmed?.tabId !== this.tabId || confirmed?.token !== token) return false;
    this.resource = resource;
    this.leaseToken = token;
    this._startHeartbeat();
    this._publish({ type: "acquired", resource });
    return true;
  }

  _startHeartbeat() {
    if (this.heartbeatTimer !== null || !this.setInterval) return;
    this.heartbeatTimer = this.setInterval(() => {
      if (!this.resource || !this.storage) return;
      const current = this._readLease(this.resource);
      if (current?.tabId !== this.tabId || current?.token !== this.leaseToken) {
        const lostResource = this.resource;
        this._clearOwnership();
        this._emit({ type: "lost", resource: lostResource, tabId: this.tabId });
        return;
      }
      current.expiresAt = this.now() + this.leaseMs;
      this.storage.setItem(this._leaseKey(this.resource), JSON.stringify(current));
    }, this.heartbeatMs);
  }

  requestTakeover(resource) {
    const name = String(resource || this.resource || "").trim();
    if (!name) return false;
    this._publish({ type: "takeover-requested", resource: name });
    return true;
  }

  release() {
    const resource = this.resource;
    if (!resource) return false;
    if (this.storage) {
      const current = this._readLease(resource);
      if (current?.tabId === this.tabId && current?.token === this.leaseToken) {
        this.storage.removeItem(this._leaseKey(resource));
      }
    }
    this.releaseLock?.();
    this._clearOwnership();
    this._publish({ type: "released", resource });
    return true;
  }

  _clearOwnership() {
    if (this.heartbeatTimer !== null && this.clearInterval) this.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.resource = null;
    this.leaseToken = null;
    this.releaseLock = null;
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("Tab coordinator listener must be a function");
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(message) {
    this.listeners.forEach(listener => listener(message));
  }

  _publish(message) {
    const envelope = { ...message, tabId: this.tabId, sentAt: this.now() };
    this.channel?.postMessage?.(envelope);
    this._emit(envelope);
  }

  _receive(message) {
    if (!message || message.tabId === this.tabId) return;
    this._emit(message);
  }

  dispose() {
    this.release();
    this.channel?.removeEventListener?.("message", this.boundMessage);
    if (this.channel && !this.channel.removeEventListener) this.channel.onmessage = null;
    this.channel?.close?.();
    this.listeners.clear();
  }
}

function createTabCoordinator(options) {
  return new TabCoordinator(options);
}

module.exports = {
  DEFAULT_LEASE_MS,
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_CHANNEL_NAME,
  DEFAULT_LEASE_PREFIX,
  TabCoordinator,
  createTabCoordinator,
};
