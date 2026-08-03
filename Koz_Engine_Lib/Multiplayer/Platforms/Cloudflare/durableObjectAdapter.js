"use strict";

const DEFAULT_CHECKPOINT_KEY = "koz.multiplayer.checkpoint.v1";
const SOCKET_ATTACHMENT_VERSION = 1;

function assertContext(context) {
  if (!context || typeof context.acceptWebSocket !== "function" || !context.storage) {
    throw new TypeError("Cloudflare adapter requires a Durable Object context");
  }
  return context;
}

function normalizeSocketAttachment(value) {
  const source = value || {};
  const peerId = String(source.peerId || "").trim();
  if (!peerId) throw new TypeError("Socket attachment peerId is required");
  return {
    version: SOCKET_ATTACHMENT_VERSION,
    peerId,
    identity: source.identity && typeof source.identity === "object" ? { ...source.identity } : null,
    joined: source.joined === true,
    connectedAt: Math.max(0, Number(source.connectedAt) || Date.now()),
    metadata: source.metadata && typeof source.metadata === "object" ? { ...source.metadata } : {},
  };
}

class DurableObjectAdapter {
  constructor(options) {
    const opts = options || {};
    this.context = assertContext(opts.context);
    this.storage = this.context.storage;
    this.checkpointKey = String(opts.checkpointKey || DEFAULT_CHECKPOINT_KEY);
    this.webSocketTags = Array.isArray(opts.webSocketTags) ? opts.webSocketTags.map(String) : [];
  }

  acceptSocket(socket, attachment, tags) {
    const normalized = normalizeSocketAttachment(attachment);
    const socketTags = Array.isArray(tags) ? tags.map(String) : this.webSocketTags;
    this.context.acceptWebSocket(socket, socketTags);
    socket.serializeAttachment(normalized);
    return normalized;
  }

  updateSocketAttachment(socket, patch) {
    const current = this.readSocketAttachment(socket) || {};
    const next = normalizeSocketAttachment({ ...current, ...(patch || {}) });
    socket.serializeAttachment(next);
    return next;
  }

  readSocketAttachment(socket) {
    try {
      const value = socket.deserializeAttachment();
      return value?.version === SOCKET_ATTACHMENT_VERSION ? value : null;
    } catch {
      return null;
    }
  }

  listSockets(tag) {
    return this.context.getWebSockets(tag).map(socket => ({
      socket,
      attachment: this.readSocketAttachment(socket),
    }));
  }

  async readCheckpoint() {
    return (await this.storage.get(this.checkpointKey)) || null;
  }

  async writeCheckpoint(checkpoint) {
    await this.storage.put(this.checkpointKey, checkpoint);
    return checkpoint;
  }

  async clearCheckpoint() {
    return this.storage.delete(this.checkpointKey);
  }

  async scheduleAlarm(timestamp) {
    await this.storage.setAlarm(Math.max(Date.now(), Number(timestamp) || Date.now()));
  }

  async clearAlarm() {
    await this.storage.deleteAlarm();
  }

  setAutoResponse(request, response) {
    if (typeof WebSocketRequestResponsePair !== "function") {
      throw new Error("WebSocketRequestResponsePair is unavailable");
    }
    this.context.setWebSocketAutoResponse(new WebSocketRequestResponsePair(String(request), String(response)));
  }
}

function createDurableObjectAdapter(options) {
  return new DurableObjectAdapter(options);
}

module.exports = {
  DEFAULT_CHECKPOINT_KEY,
  SOCKET_ATTACHMENT_VERSION,
  normalizeSocketAttachment,
  DurableObjectAdapter,
  createDurableObjectAdapter,
};
