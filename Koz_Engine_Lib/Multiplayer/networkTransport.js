"use strict";

const RELIABILITY = Object.freeze({
  RELIABLE: "reliable",
  UNRELIABLE: "unreliable",
});
const DEFAULT_CHANNEL = "control";
const IDENTITY_PROVIDERS = Object.freeze(["guest", "account", "steam", "platform"]);

function normalizeDeliveryOptions(options) {
  const source = options || {};
  const reliability = source.reliability || RELIABILITY.RELIABLE;
  if (!Object.values(RELIABILITY).includes(reliability)) {
    throw new RangeError(`Unsupported reliability: ${String(reliability)}`);
  }
  const channel = String(source.channel || DEFAULT_CHANNEL);
  if (!/^[a-z0-9_-]{1,32}$/i.test(channel)) throw new RangeError("Invalid transport channel");
  return { reliability, channel, replaceable: source.replaceable === true };
}

function normalizeIdentity(identity) {
  const source = identity || {};
  const provider = String(source.provider || "guest");
  if (!IDENTITY_PROVIDERS.includes(provider)) throw new RangeError("Invalid identity provider");
  const id = String(source.id || "").trim();
  if (!id) throw new TypeError("Identity id is required");
  return {
    provider,
    id,
    displayName: String(source.displayName || id).trim().slice(0, 64) || id,
  };
}

class NetworkTransport {
  constructor(options) {
    const opts = options || {};
    this.identity = normalizeIdentity(opts.identity || {
      provider: "guest",
      id: "offline",
      displayName: "Player",
    });
    this.initialized = false;
    this.sessionId = null;
    this.handlers = {
      message: new Set(),
      peerConnected: new Set(),
      peerDisconnected: new Set(),
    };
  }

  async initialize() {
    this.initialized = true;
  }

  async createSession() {
    throw new Error("createSession() must be implemented by a transport");
  }

  async joinSession() {
    throw new Error("joinSession() must be implemented by a transport");
  }

  async leaveSession() {
    this.sessionId = null;
  }

  send() {
    throw new Error("send() must be implemented by a transport");
  }

  broadcast() {
    throw new Error("broadcast() must be implemented by a transport");
  }

  onMessage(handler) {
    return this._subscribe("message", handler);
  }

  onPeerConnected(handler) {
    return this._subscribe("peerConnected", handler);
  }

  onPeerDisconnected(handler) {
    return this._subscribe("peerDisconnected", handler);
  }

  getLocalIdentity() {
    return { ...this.identity };
  }

  getPeerIdentity() {
    return null;
  }

  disconnectPeer() {
    return false;
  }

  dispose() {
    this.sessionId = null;
    this.initialized = false;
    Object.values(this.handlers).forEach(handlers => handlers.clear());
  }

  _subscribe(event, handler) {
    if (typeof handler !== "function") throw new TypeError(`${event} handler must be a function`);
    this.handlers[event].add(handler);
    return () => this.handlers[event].delete(handler);
  }

  _emit(event, ...args) {
    this.handlers[event].forEach(handler => handler(...args));
  }
}

function assertTransport(value) {
  const required = ["initialize", "createSession", "joinSession", "leaveSession", "send", "onMessage"];
  const missing = required.filter(name => typeof value?.[name] !== "function");
  if (missing.length) throw new TypeError(`Transport is missing: ${missing.join(", ")}`);
  return value;
}

module.exports = {
  RELIABILITY,
  DEFAULT_CHANNEL,
  IDENTITY_PROVIDERS,
  normalizeDeliveryOptions,
  normalizeIdentity,
  assertTransport,
  NetworkTransport,
};
