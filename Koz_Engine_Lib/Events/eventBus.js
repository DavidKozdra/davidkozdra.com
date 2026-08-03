(function initEventBusLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createEventBusApi() {
  function normalizeTopic(topic) {
    const value = String(topic || "").trim();
    if (!value) throw new TypeError("Event topic must be a non-empty string");
    return value;
  }

  function defaultErrorHandler(error, context) {
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(`[EventBus] listener failed for "${context.topic}"`, error);
    }
  }

  class EventBus {
    constructor(options) {
      const opts = options || {};
      this._listeners = new Map();
      this._nextId = 1;
      this._sequence = 1;
      this._shouldPublish = typeof opts.shouldPublish === "function" ? opts.shouldPublish : null;
      this._onError = typeof opts.onError === "function" ? opts.onError : defaultErrorHandler;
    }

    subscribe(topic, listener, options) {
      const key = normalizeTopic(topic);
      if (typeof listener !== "function") {
        throw new TypeError(`Event listener for "${key}" must be a function`);
      }
      const opts = options || {};
      if (opts.signal?.aborted) return function alreadyAborted() { return false; };

      const record = {
        id: this._nextId++,
        sequence: this._sequence++,
        topic: key,
        listener,
        once: opts.once === true,
        priority: Number(opts.priority) || 0,
        signal: opts.signal || null,
        abortListener: null,
      };
      if (!this._listeners.has(key)) this._listeners.set(key, new Map());
      this._listeners.get(key).set(record.id, record);

      const unsubscribe = () => this._removeRecord(record);
      if (record.signal && typeof record.signal.addEventListener === "function") {
        record.abortListener = unsubscribe;
        record.signal.addEventListener("abort", unsubscribe, { once: true });
      }
      unsubscribe.id = record.id;
      unsubscribe.topic = key;
      return unsubscribe;
    }

    on(topic, listener, options) {
      return this.subscribe(topic, listener, options);
    }

    once(topic, listener, options) {
      return this.subscribe(topic, listener, { ...(options || {}), once: true });
    }

    off(topic, listener) {
      const key = normalizeTopic(topic);
      const bucket = this._listeners.get(key);
      if (!bucket) return 0;
      let removed = 0;
      for (const record of [...bucket.values()]) {
        if (!listener || record.listener === listener || record.id === listener) {
          if (this._removeRecord(record)) removed += 1;
        }
      }
      return removed;
    }

    _removeRecord(record) {
      const bucket = this._listeners.get(record.topic);
      if (!bucket || !bucket.delete(record.id)) return false;
      if (record.signal && record.abortListener && typeof record.signal.removeEventListener === "function") {
        record.signal.removeEventListener("abort", record.abortListener);
      }
      if (bucket.size === 0) this._listeners.delete(record.topic);
      return true;
    }

    _matchingListeners(topic) {
      const matched = [];
      for (const [pattern, bucket] of this._listeners) {
        const matches = pattern === topic
          || pattern === "*"
          || (pattern.endsWith("*") && topic.startsWith(pattern.slice(0, -1)));
        if (matches) matched.push(...bucket.values());
      }
      return matched.sort(function byPriorityThenSequence(a, b) {
        return b.priority - a.priority || a.sequence - b.sequence;
      });
    }

    _reportError(error, context, errors) {
      errors.push({ error, ...context });
      try {
        this._onError(error, context);
      } catch {
        // Error reporting must not break event delivery.
      }
    }

    emit(topic, payload, metadata) {
      const key = normalizeTopic(topic);
      const meta = metadata && typeof metadata === "object" ? metadata : {};
      const errors = [];
      const pending = [];
      const envelope = Object.freeze({
        topic: key,
        metadata: meta,
        bus: this,
      });

      if (this._shouldPublish) {
        try {
          if (this._shouldPublish(key, payload, meta) === false) {
            return { topic: key, delivered: 0, filtered: true, errors, pending };
          }
        } catch (error) {
          this._reportError(error, { topic: key, phase: "filter" }, errors);
          return { topic: key, delivered: 0, filtered: true, errors, pending };
        }
      }

      const listeners = this._matchingListeners(key);
      let delivered = 0;
      for (const record of listeners) {
        if (record.signal?.aborted) {
          this._removeRecord(record);
          continue;
        }
        if (record.once) this._removeRecord(record);
        delivered += 1;
        try {
          const result = record.listener(payload, envelope);
          if (result && typeof result.then === "function") {
            pending.push(Promise.resolve(result).catch(error => {
              this._reportError(error, {
                topic: key,
                phase: "listener",
                listenerId: record.id,
                listenerTopic: record.topic,
              }, errors);
            }));
          }
        } catch (error) {
          this._reportError(error, {
            topic: key,
            phase: "listener",
            listenerId: record.id,
            listenerTopic: record.topic,
          }, errors);
        }
      }

      return {
        topic: key,
        delivered,
        filtered: false,
        errors,
        pending,
      };
    }

    publish(topic, payload, metadata) {
      return this.emit(topic, payload, metadata);
    }

    async emitAsync(topic, payload, metadata) {
      const receipt = this.emit(topic, payload, metadata);
      await Promise.all(receipt.pending);
      return receipt;
    }

    async publishAsync(topic, payload, metadata) {
      return this.emitAsync(topic, payload, metadata);
    }

    waitFor(topic, options) {
      const opts = options || {};
      const timeoutMs = Number(opts.timeoutMs);
      const setTimer = opts.setTimeout || (typeof setTimeout === "function" ? setTimeout : null);
      const clearTimer = opts.clearTimeout || (typeof clearTimeout === "function" ? clearTimeout : null);

      return new Promise((resolve, reject) => {
        let timer = null;
        const unsubscribe = this.once(topic, function resolveEvent(payload, envelope) {
          if (timer !== null && clearTimer) clearTimer(timer);
          resolve({ payload, envelope });
        }, { signal: opts.signal });

        if (opts.signal?.aborted) {
          reject(new Error(`Event wait aborted: ${topic}`));
          return;
        }
        if (opts.signal && typeof opts.signal.addEventListener === "function") {
          opts.signal.addEventListener("abort", function rejectAbort() {
            unsubscribe();
            reject(new Error(`Event wait aborted: ${topic}`));
          }, { once: true });
        }
        if (timeoutMs > 0 && setTimer) {
          timer = setTimer(function rejectTimeout() {
            unsubscribe();
            reject(new Error(`Timed out waiting for event: ${topic}`));
          }, timeoutMs);
        }
      });
    }

    clear(topic) {
      if (topic === undefined) {
        const count = this.listenerCount();
        for (const bucket of this._listeners.values()) {
          for (const record of bucket.values()) this._removeRecord(record);
        }
        return count;
      }
      return this.off(topic);
    }

    listenerCount(topic) {
      if (topic !== undefined) return this._listeners.get(normalizeTopic(topic))?.size || 0;
      let count = 0;
      for (const bucket of this._listeners.values()) count += bucket.size;
      return count;
    }
  }

  function createEventBus(options) {
    return new EventBus(options);
  }

  return {
    EventBus,
    createEventBus,
    normalizeTopic,
  };
});
