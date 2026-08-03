(function initAchievementSystemLib(root, factory) {
  let eventBusApi = null;
  if (typeof require === "function") {
    try {
      eventBusApi = require("../Events/eventBus");
    } catch {
      eventBusApi = null;
    }
  }
  const api = factory(eventBusApi);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createAchievementSystemApi(eventBusApi) {
  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function createMemoryAchievementStore(initialState) {
    let state = clone(initialState || { unlocked: {}, progress: {} });
    return {
      async load() {
        return clone(state);
      },
      async save(nextState) {
        state = clone(nextState || { unlocked: {}, progress: {} });
      },
      snapshot() {
        return clone(state);
      },
    };
  }

  function normalizeDefinition(definition) {
    if (!definition || typeof definition !== "object") {
      throw new TypeError("Achievement definition must be an object");
    }
    const id = String(definition.id || "").trim();
    if (!id) throw new TypeError("Achievement definition requires an id");
    const rules = definition.rules || (definition.rule ? [definition.rule] : []);
    return Object.freeze({
      ...definition,
      id,
      rules: Object.freeze((Array.isArray(rules) ? rules : [rules])
        .filter(Boolean)
        .map(rule => Object.freeze({ ...rule }))),
    });
  }

  function ruleValue(rule, payload, context) {
    if (typeof rule.value === "function") return rule.value(payload, context);
    if (typeof rule.value === "string") return payload?.[rule.value];
    if (rule.value !== undefined) return rule.value;
    return 1;
  }

  function reduceProgress(rule, current, payload, context) {
    if (typeof rule.reduce === "function") return rule.reduce(current, payload, context);
    const value = ruleValue(rule, payload, context);
    switch (rule.mode || "count") {
      case "sum":
      case "count":
        return Math.max(0, Number(current) || 0) + Math.max(0, Number(value) || 0);
      case "max":
        return Math.max(Math.max(0, Number(current) || 0), Math.max(0, Number(value) || 0));
      case "latest":
        return clone(value);
      case "unique": {
        const values = Array.isArray(current) ? current.slice() : [];
        const key = typeof rule.key === "function" ? rule.key(payload, context) : value;
        if (key !== undefined && key !== null && !values.includes(key)) values.push(clone(key));
        return values;
      }
      default:
        throw new Error(`Unsupported achievement progress mode: ${rule.mode}`);
    }
  }

  function progressAmount(value) {
    if (Array.isArray(value) || typeof value === "string") return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    return Math.max(0, Number(value) || 0);
  }

  class AchievementSystem {
    constructor(options) {
      const opts = options || {};
      const createBus = eventBusApi?.createEventBus;
      this.eventBus = opts.eventBus || (typeof createBus === "function" ? createBus() : null);
      if (!this.eventBus?.subscribe || !this.eventBus?.emit) {
        throw new TypeError("AchievementSystem requires an event bus");
      }
      this.store = opts.store || createMemoryAchievementStore();
      this.now = typeof opts.now === "function" ? opts.now : Date.now;
      this.shouldProcess = typeof opts.shouldProcess === "function" ? opts.shouldProcess : null;
      this.onUnlocked = typeof opts.onUnlocked === "function" ? opts.onUnlocked : null;
      this.onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;
      this.definitions = new Map();
      this.unlocked = new Map();
      this.lifetimeProgress = new Map();
      this.runProgress = new Map();
      this.unsubscribers = [];
      this.unlocking = new Map();
      this.ruleChains = new Map();
      this.saveChain = Promise.resolve();
      this.started = false;
      this.disposed = false;
      this.readyPromise = null;

      for (const definition of opts.definitions || []) this.register(definition);
    }

    register(definition) {
      const normalized = normalizeDefinition(definition);
      if (this.definitions.has(normalized.id)) {
        throw new Error(`Achievement already registered: ${normalized.id}`);
      }
      this.definitions.set(normalized.id, normalized);
      if (this.started) this._bindDefinition(normalized);
      return normalized;
    }

    async start() {
      if (this.disposed) throw new Error("AchievementSystem has been disposed");
      if (!this.readyPromise) {
        this.readyPromise = Promise.resolve(this.store.load?.()).then(snapshot => {
          const loaded = snapshot && typeof snapshot === "object" ? snapshot : {};
          this.unlocked = new Map(Object.entries(loaded.unlocked || {}));
          this.lifetimeProgress = new Map(Object.entries(loaded.progress || {}));
          if (!this.started) {
            this.started = true;
            for (const definition of this.definitions.values()) this._bindDefinition(definition);
          }
          return this;
        });
      }
      return this.readyPromise;
    }

    _bindDefinition(definition) {
      for (const rule of definition.rules) {
        const topics = Array.isArray(rule.event) ? rule.event : [rule.event];
        for (const topic of topics.filter(Boolean)) {
          this.unsubscribers.push(this.eventBus.subscribe(topic, async (payload, envelope) => {
            await this._applyRule(definition, rule, payload, envelope);
          }, { priority: rule.priority }));
        }
      }
    }

    _canProcess(topic, payload, definition, rule) {
      if (!this.shouldProcess) return true;
      return this.shouldProcess({ topic, payload, definition, rule, system: this }) !== false;
    }

    async _applyRule(definition, rule, payload, envelope) {
      const previous = this.ruleChains.get(definition.id) || Promise.resolve();
      const operation = previous.catch(function continueAfterRuleError() {}).then(() => (
        this._applyRuleNow(definition, rule, payload, envelope)
      ));
      this.ruleChains.set(definition.id, operation);
      return operation.finally(() => {
        if (this.ruleChains.get(definition.id) === operation) this.ruleChains.delete(definition.id);
      });
    }

    async _applyRuleNow(definition, rule, payload, envelope) {
      await this.start();
      if (this.isUnlockedSync(definition.id)) return false;
      if (!this._canProcess(envelope.topic, payload, definition, rule)) return false;
      if (typeof rule.where === "function" && !rule.where(payload, {
        definition,
        system: this,
        event: envelope,
      })) return false;

      const scope = rule.scope === "run" ? "run" : "lifetime";
      const current = this.getProgressSync(definition.id, { scope });
      const context = { definition, system: this, event: envelope, current, scope };
      const next = reduceProgress(rule, current, payload, context);
      await this.setProgress(definition.id, next, { scope, payload, rule });

      const amount = progressAmount(next);
      const target = Number(rule.target ?? definition.target);
      const shouldUnlock = typeof rule.when === "function"
        ? !!(await rule.when({ payload, progress: next, amount, target, definition, system: this }))
        : Number.isFinite(target) && amount >= target;
      if (shouldUnlock) return this.unlock(definition.id, { payload, progress: next, event: envelope.topic });
      return false;
    }

    subscribe(topic, handler, options) {
      if (typeof handler !== "function") throw new TypeError("Achievement subscription requires a handler");
      const unsubscribe = this.eventBus.subscribe(topic, async (payload, envelope) => {
        await this.start();
        if (!this._canProcess(envelope.topic, payload, null, null)) return;
        return handler(payload, {
          event: envelope,
          system: this,
          unlock: this.unlock.bind(this),
          setProgress: this.setProgress.bind(this),
          getProgress: this.getProgress.bind(this),
        });
      }, options);
      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    }

    async unlock(id, context) {
      await this.start();
      const key = String(id || "").trim();
      const definition = this.definitions.get(key);
      if (!definition) throw new Error(`Unknown achievement: ${key}`);
      if (this.unlocked.has(key)) return false;
      if (this.unlocking.has(key)) return this.unlocking.get(key);

      const operation = (async () => {
        const record = {
          id: key,
          unlockedAt: this.now(),
          context: clone(context || null),
        };
        this.unlocked.set(key, record);
        try {
          await this._queueSave();
        } catch (error) {
          this.unlocked.delete(key);
          throw error;
        }
        const detail = { id: key, definition, record: clone(record) };
        this.eventBus.emit("achievement:unlocked", detail);
        if (this.onUnlocked) await this.onUnlocked(detail);
        return true;
      })().finally(() => {
        this.unlocking.delete(key);
      });
      this.unlocking.set(key, operation);
      return operation;
    }

    async setProgress(id, value, options) {
      await this.start();
      const key = String(id || "").trim();
      if (!this.definitions.has(key)) throw new Error(`Unknown achievement: ${key}`);
      const opts = options || {};
      const scope = opts.scope === "run" ? "run" : "lifetime";
      const map = scope === "run" ? this.runProgress : this.lifetimeProgress;
      map.set(key, clone(value));
      if (scope === "lifetime") await this._queueSave();
      const detail = {
        id: key,
        definition: this.definitions.get(key),
        value: clone(value),
        amount: progressAmount(value),
        scope,
        payload: clone(opts.payload),
      };
      this.eventBus.emit("achievement:progress", detail);
      if (this.onProgress) await this.onProgress(detail);
      return clone(value);
    }

    getProgressSync(id, options) {
      const map = options?.scope === "run" ? this.runProgress : this.lifetimeProgress;
      return clone(map.get(String(id || "")));
    }

    async getProgress(id, options) {
      await this.start();
      return this.getProgressSync(id, options);
    }

    isUnlockedSync(id) {
      return this.unlocked.has(String(id || ""));
    }

    async isUnlocked(id) {
      await this.start();
      return this.isUnlockedSync(id);
    }

    async list() {
      await this.start();
      return [...this.definitions.values()].map(definition => ({
        definition,
        unlocked: this.unlocked.has(definition.id),
        record: clone(this.unlocked.get(definition.id) || null),
        progress: clone(this.lifetimeProgress.get(definition.id)),
        runProgress: clone(this.runProgress.get(definition.id)),
      }));
    }

    resetRunProgress() {
      this.runProgress.clear();
      this.eventBus.emit("achievement:run-progress-reset", {});
    }

    async clear() {
      await this.start();
      this.unlocked.clear();
      this.lifetimeProgress.clear();
      this.runProgress.clear();
      await this._queueSave();
      this.eventBus.emit("achievement:cleared", {});
    }

    async exportState() {
      await this.start();
      await this.flush();
      return this._snapshot();
    }

    async importState(snapshot) {
      await this.start();
      const source = snapshot && typeof snapshot === "object" ? snapshot : {};
      this.unlocked = new Map(Object.entries(source.unlocked || {}));
      this.lifetimeProgress = new Map(Object.entries(source.progress || {}));
      this.runProgress.clear();
      await this._queueSave();
      this.eventBus.emit("achievement:imported", {});
    }

    _snapshot() {
      return {
        unlocked: Object.fromEntries(this.unlocked),
        progress: Object.fromEntries(this.lifetimeProgress),
      };
    }

    _queueSave() {
      const snapshot = this._snapshot();
      this.saveChain = this.saveChain
        .catch(function allowSaveRetry() {})
        .then(() => this.store.save?.(clone(snapshot)));
      return this.saveChain;
    }

    async flush() {
      await this.saveChain;
    }

    dispose() {
      this.disposed = true;
      while (this.unsubscribers.length) this.unsubscribers.pop()();
    }
  }

  function createAchievementSystem(options) {
    return new AchievementSystem(options);
  }

  return {
    AchievementSystem,
    createAchievementSystem,
    createMemoryAchievementStore,
    normalizeDefinition,
    reduceProgress,
    progressAmount,
  };
});
