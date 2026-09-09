"use strict";

class TokenBucket {
  constructor(options) {
    const opts = options || {};
    this.rate = Math.max(0.001, Number(opts.rate) || 1);
    this.capacity = Math.max(this.rate, Number(opts.capacity) || this.rate);
    this.tokens = Math.min(this.capacity, Math.max(0, Number(opts.tokens) || this.capacity));
    this.updatedAt = Math.max(0, Number(opts.updatedAt) || 0);
  }

  refill(now) {
    const timestamp = Math.max(this.updatedAt, Number(now) || 0);
    const elapsedSeconds = (timestamp - this.updatedAt) / 1000;
    this.updatedAt = timestamp;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.rate);
    return this.tokens;
  }

  consume(cost, now) {
    const requested = Math.max(0, Number(cost) || 0);
    this.refill(now);
    if (requested > this.tokens) return false;
    this.tokens -= requested;
    return true;
  }

  snapshot() {
    return {
      version: 1,
      rate: this.rate,
      capacity: this.capacity,
      tokens: this.tokens,
      updatedAt: this.updatedAt,
    };
  }
}

class PeerRateLimiter {
  constructor(options) {
    const opts = options || {};
    this.now = typeof opts.now === "function" ? opts.now : Date.now;
    this.messageRate = Math.max(1, Number(opts.messagesPerSecond) || 60);
    this.byteRate = Math.max(1, Number(opts.bytesPerSecond) || 64 * 1024);
    this.burstSeconds = Math.max(1, Number(opts.burstSeconds) || 2);
    this.peers = new Map();
  }

  accept(peerId, bytes) {
    const key = String(peerId || "");
    if (!key) throw new TypeError("Rate limiter peerId is required");
    const now = this.now();
    let entry = this.peers.get(key);
    if (!entry) {
      entry = {
        messages: new TokenBucket({
          rate: this.messageRate,
          capacity: this.messageRate * this.burstSeconds,
          updatedAt: now,
        }),
        bytes: new TokenBucket({
          rate: this.byteRate,
          capacity: this.byteRate * this.burstSeconds,
          updatedAt: now,
        }),
      };
      this.peers.set(key, entry);
    }
    const byteCost = Math.max(0, Number(bytes) || 0);
    entry.messages.refill(now);
    entry.bytes.refill(now);
    if (entry.messages.tokens < 1 || entry.bytes.tokens < byteCost) return false;
    entry.messages.tokens -= 1;
    entry.bytes.tokens -= byteCost;
    return true;
  }

  delete(peerId) {
    return this.peers.delete(String(peerId || ""));
  }

  clear() {
    this.peers.clear();
  }
}

module.exports = { TokenBucket, PeerRateLimiter };
