"use strict";

class SequenceWindow {
  constructor(options) {
    const opts = options || {};
    this.limit = Math.max(8, Math.trunc(Number(opts.limit) || 512));
    this.seen = new Set();
    this.order = [];
    this.latestByChannel = new Map();
  }

  accept(sequence, options) {
    const value = Math.trunc(Number(sequence));
    if (!Number.isSafeInteger(value) || value < 0) return false;
    const opts = options || {};
    if (opts.replaceable) {
      const channel = String(opts.channel || "default");
      const latest = this.latestByChannel.get(channel);
      if (latest !== undefined && value <= latest) return false;
      this.latestByChannel.set(channel, value);
      return true;
    }
    if (this.seen.has(value)) return false;
    this.seen.add(value);
    this.order.push(value);
    while (this.order.length > this.limit) this.seen.delete(this.order.shift());
    return true;
  }

  reset(channel) {
    if (channel !== undefined) {
      this.latestByChannel.delete(String(channel));
      return;
    }
    this.seen.clear();
    this.order.length = 0;
    this.latestByChannel.clear();
  }

  snapshot() {
    return {
      version: 1,
      limit: this.limit,
      seen: [...this.order],
      latestByChannel: [...this.latestByChannel.entries()],
    };
  }

  restore(snapshot) {
    this.reset();
    for (const sequence of snapshot?.seen || []) this.accept(sequence);
    for (const [channel, sequence] of snapshot?.latestByChannel || []) {
      const value = Math.trunc(Number(sequence));
      if (Number.isSafeInteger(value) && value >= 0) this.latestByChannel.set(String(channel), value);
    }
    return this;
  }
}

module.exports = { SequenceWindow };
