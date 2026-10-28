/* Generated from koz-engine-lib@0.1.0. Run npm run build to refresh. */
(function () {
'use strict';
const engine = {};
engine.particles = (function () { const module = { exports: {} };
(function initParticleSystemCoreLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createParticleSystemCoreApi() {
  class Particle {
    constructor() {
      this.alive = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 0;
      this.maxLife = 0;
      this.size = 4;
      this.color = "#fff";
      this.alpha = 1;
      this.frame = null;
      this.screen = false;
      this.drag = 0.98;
      this.gravity = 0;
      this.tag = null;
    }
  }

  class ParticleSystemCore {
    constructor(options) {
      const opts = options || {};
      this.poolSize = Math.max(1, Number(opts.poolSize) || 2048);
      this.maxPoolSize = Math.max(this.poolSize, Number(opts.maxPoolSize) || 16384);
      this.random = typeof opts.random === "function" ? opts.random : Math.random;
      this.particles = new Array(this.poolSize);
      for (let i = 0; i < this.poolSize; i++) this.particles[i] = new Particle();
      // Free list for O(1) allocation without overwriting alive particles
      this._freeList = [];
      for (let i = this.poolSize - 1; i >= 0; i--) this._freeList.push(i);
      this._activeCount = 0;
      // Burst config reuse buffer to avoid Object.assign allocations
      this._burstCfg = {};
    }

    _alloc() {
      if (this._freeList.length > 0) {
        const idx = this._freeList.pop();
        return this.particles[idx];
      }
      // Pool exhausted: grow if under max
      if (this.poolSize < this.maxPoolSize) {
        const growBy = Math.min(this.poolSize, this.maxPoolSize - this.poolSize);
        const oldSize = this.poolSize;
        this.poolSize += growBy;
        for (let i = oldSize; i < this.poolSize; i++) {
          this.particles[i] = new Particle();
          if (i > oldSize) this._freeList.push(i);
        }
        return this.particles[oldSize];
      }
      // Hard cap reached: overwrite oldest alive particle (fallback)
      for (let i = 0; i < this.poolSize; i++) {
        if (this.particles[i].alive) {
          this.particles[i].alive = false;
          this._activeCount--;
          return this.particles[i];
        }
      }
      return this.particles[0];
    }

    spawn(x, y, opts) {
      const cfg = opts || {};
      const p = this._alloc();
      p.alive = true;
      this._activeCount++;
      p.x = x;
      p.y = y;
      p.vx = cfg.vx != null ? cfg.vx : ((this.random() - 0.5) * (cfg.spreadX || 60));
      p.vy = cfg.vy != null ? cfg.vy : ((this.random() - 0.5) * (cfg.spreadY || 60));
      p.maxLife = cfg.life || (300 + this.random() * 400);
      p.life = p.maxLife;
      p.size = cfg.size || (2 + this.random() * 6);
      p.color = cfg.color || "#fff";
      p.alpha = 1;
      p.frame = cfg.frame || null;
      p.screen = !!cfg.screen;
      p.drag = cfg.drag || 0.98;
      p.gravity = cfg.gravity || 0;
      p.tag = cfg.tag || null;
      return p;
    }

    spawnBurst(x, y, opts) {
      const cfg = opts || {};
      const count = cfg.count || 24;
      const bc = this._burstCfg;
      // Copy config once, reuse for all particles in burst
      for (const k in cfg) bc[k] = cfg[k];
      for (let i = 0; i < count; i++) {
        const angle = this.random() * Math.PI * 2;
        const speed = (cfg.speed || 80) * (0.3 + this.random());
        bc.vx = Math.cos(angle) * speed;
        bc.vy = Math.sin(angle) * speed;
        this.spawn(x, y, bc);
      }
      // Clean reuse buffer
      for (const k in bc) delete bc[k];
    }

    update(dtMs) {
      const dt = Number(dtMs) || 0;
      const dtSec = dt * 0.001;
      let active = 0;
      for (let i = 0; i < this.poolSize; i++) {
        const p = this.particles[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          this._freeList.push(i);
          continue;
        }
        active++;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity * dtSec;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.alpha = p.life / p.maxLife;
      }
      this._activeCount = active;
    }

    activeParticles() {
      const result = [];
      for (let i = 0; i < this.poolSize; i++) {
        if (this.particles[i].alive) result.push(this.particles[i]);
      }
      return result;
    }

    activeCount() {
      return this._activeCount;
    }

    /**
     * Retire particles until the requested active ceiling is met. Callers can
     * nominate cheap-to-lose particles first (for example, off-screen FX)
     * without giving up the O(1) free-list allocation path.
     */
    trim(maxActive, discardFirst) {
      let excess = this._activeCount - Math.max(0, Number(maxActive) || 0);
      if (excess <= 0) return 0;

      const discard = typeof discardFirst === "function" ? discardFirst : null;
      const retire = (onlyPreferred) => {
        for (let i = 0; i < this.poolSize && excess > 0; i++) {
          const p = this.particles[i];
          if (!p.alive || (onlyPreferred && discard && !discard(p))) continue;
          p.alive = false;
          this._freeList.push(i);
          this._activeCount--;
          excess--;
        }
      };

      // Preserve important particles when possible, but always honour the cap.
      if (discard) retire(true);
      if (excess > 0) retire(false);
      return this._activeCount;
    }

    clear() {
      this._freeList.length = 0;
      for (let i = 0; i < this.poolSize; i++) {
        this.particles[i].alive = false;
        this._freeList.push(i);
      }
      this._activeCount = 0;
    }
  }

  return {
    Particle: Particle,
    ParticleSystemCore: ParticleSystemCore,
  };
});

return module.exports; })();
engine.events = (function () { const module = { exports: {} };
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

return module.exports; })();
globalThis.CardKingEngine = Object.freeze({ version: '0.1.0', ParticleSystemCore: engine.particles.ParticleSystemCore, EventBus: engine.events.EventBus });
})();
