(function initMinigameManagerLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMinigameManagerApi() {
  class MinigameManager {
    constructor(options) {
      const opts = options || {};
      this._registry = new Map();
      this._logger = opts.logger || console;
      this._ctx = opts.context || {};
      this._active = null;
      this._activeId = null;
    }

    register(id, factory) {
      if (!id || typeof id !== "string") throw new Error("Minigame id must be a string");
      if (typeof factory !== "function") throw new Error("Minigame factory must be a function");
      this._registry.set(id, factory);
      return this;
    }

    unregister(id) {
      if (this._activeId === id) this.stop();
      this._registry.delete(id);
      return this;
    }

    has(id) {
      return this._registry.has(id);
    }

    list() {
      return Array.from(this._registry.keys());
    }

    start(id, payload) {
      const makeGame = this._registry.get(id);
      if (!makeGame) throw new Error("Unknown minigame: " + id);

      this.stop();
      const game = makeGame({ id: id, context: this._ctx, payload: payload || {} });
      if (!game || typeof game !== "object") throw new Error("Minigame factory must return object");

      this._active = game;
      this._activeId = id;

      if (typeof game.onStart === "function") {
        game.onStart(payload || {});
      }
      return game;
    }

    stop(reason) {
      const active = this._active;
      if (active && typeof active.onStop === "function") {
        try {
          active.onStop({ reason: reason || "manual" });
        } catch (err) {
          if (this._logger && typeof this._logger.warn === "function") {
            this._logger.warn("[MinigameManager] onStop error", err);
          }
        }
      }
      this._active = null;
      this._activeId = null;
    }

    update(dt) {
      if (!this._active || typeof this._active.update !== "function") return null;
      return this._active.update(dt);
    }

    render(target) {
      if (!this._active || typeof this._active.render !== "function") return;
      this._active.render(target);
    }

    isActive() {
      return !!this._active;
    }

    activeId() {
      return this._activeId;
    }
  }

  return { MinigameManager: MinigameManager };
});
