let UIScreenControllerCtor = null;
if (typeof require === "function") {
  try {
    ({ UIScreenController: UIScreenControllerCtor } = require("../Core/uiScreenController"));
  } catch (_err) {}
}

(function initUIManagerLib(root, factory) {
  const api = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createUIManagerApi(root) {
  class UIManager {
    constructor(options = {}) {
      const opts = options || {};
      const Controller = opts.controllerClass || opts.UIScreenController || UIScreenControllerCtor;
      this._controller = opts.controller || (
        (typeof Controller === "function")
          ? new Controller(opts.logger || console)
          : null
      );

      // Fallback to preserve behavior if core screen controller is unavailable.
      if (!this._controller) {
        this._controller = {
          screens: {},
          activeScreens: new Set(),
          currentState: null,
          _fadeTimers: {},
          registerScreen: function (name, spec) {
            this.screens[name] = {
              initialized: false,
              container: null,
              create: spec.create,
              show: spec.show || (() => {}),
              hide: spec.hide || (() => {}),
              update: spec.update || (() => {}),
              validStates: spec.validStates || [],
            };
          },
          _cancelFade: function (name) {
            if (this._fadeTimers[name]) {
              clearTimeout(this._fadeTimers[name]);
              delete this._fadeTimers[name];
            }
          },
          scheduleFadeHide: function (name, delay = 200) {
            this._cancelFade(name);
            const s = this.screens[name];
            if (!s || !s.container) return;
            this._fadeTimers[name] = setTimeout(() => {
              s.container.hide();
              delete this._fadeTimers[name];
            }, delay);
          },
          onStateChange: function (newState) {
            this.currentState = newState;
            for (const n in this.screens) {
              const s = this.screens[n];
              const should = s.validStates.includes(newState);
              if (should) {
                this._cancelFade(n);
                if (!s.initialized) {
                  s.container = s.create();
                  s.initialized = true;
                }
                s.container.show();
                try { s.show(); } catch (_e) { s.container.hide(); continue; }
                this.activeScreens.add(n);
              } else if (s.initialized) {
                try { s.hide(); } catch (_e) {}
                if (!this._fadeTimers[n]) s.container.hide();
                this.activeScreens.delete(n);
              }
            }
          },
          hideAll: function () {
            for (const n of this.activeScreens) this.hideScreen(n);
            this.activeScreens.clear();
          },
          hideScreen: function (name) {
            const s = this.screens[name];
            if (s && s.container) {
              this._cancelFade(name);
              try { s.hide(); } catch (_e) {}
              s.container.hide();
              this.activeScreens.delete(name);
            }
          },
          showScreen: function (name) {
            const s = this.screens[name];
            if (!s) return;
            this._cancelFade(name);
            if (!s.initialized) {
              s.container = s.create();
              s.initialized = true;
            }
            s.container.show();
            try { s.show(); } catch (_e) { s.container.hide(); return; }
            this.activeScreens.add(name);
          },
          updateAll: function () {
            const active = [...this.activeScreens];
            for (const n of active) {
              const s = this.screens[n];
              if (s && s.update) {
                try { s.update(); } catch (_e) {}
              }
            }
          },
        };
      }

      this.screens = this._controller.screens;
      this.activeScreens = this._controller.activeScreens;
      this.currentState = this._controller.currentState;
      this._boundStateManager = null;
      this._frameRequestId = null;
      this._frameCallback = null;
      this._resizeHandler = null;
      this._beforeUnloadHandler = null;
      this._runtimeInitScheduled = false;
      this._autoRuntimeInit = opts.autoRuntimeInit !== false;
    }

    registerScreen(name, { create, show = () => {}, hide = () => {}, update = () => {}, validStates = [] }) {
      this._controller.registerScreen(name, { create, show, hide, update, validStates });
      this._scheduleRuntimeInit();
    }

    _cancelFade(name) {
      this._controller._cancelFade(name);
    }

    scheduleFadeHide(name, delay = 200) {
      this._controller.scheduleFadeHide(name, delay);
    }

    onGameStateChange(newState) {
      this._controller.onStateChange(newState);
      this.currentState = this._controller.currentState;
    }

    hideAll() {
      this._controller.hideAll();
    }

    hideScreen(name) {
      this._controller.hideScreen(name);
    }

    showScreen(name) {
      this._controller.showScreen(name);
    }

    updateAll() {
      this._controller.updateAll();
    }

    bindToStateManager(stateManager, options = {}) {
      const opts = options || {};
      const manager = stateManager || null;
      if (!manager || typeof manager.onChange !== "function") {
        if (typeof opts.fallbackState === "string" && opts.fallbackState) {
          this.onGameStateChange(opts.fallbackState);
        }
        return false;
      }
      if (this._boundStateManager === manager) return true;

      this._boundStateManager = manager;
      manager.onChange((_from, to) => this.onGameStateChange(to));

      const initialSync = opts.initialSync !== false;
      if (initialSync && typeof manager.getState === "function") {
        const current = manager.getState();
        if (current) this.onGameStateChange(current);
      }
      return true;
    }

    startAutoUpdate(options = {}) {
      if (this._frameRequestId !== null) return;
      const opts = options || {};
      const beforeUpdate = typeof opts.beforeUpdate === "function" ? opts.beforeUpdate : null;

      const frame = () => {
        if (beforeUpdate) beforeUpdate();
        this.updateAll();
        this._frameRequestId = requestAnimationFrame(frame);
      };

      this._frameCallback = frame;
      this._frameRequestId = requestAnimationFrame(frame);
    }

    stopAutoUpdate() {
      if (this._frameRequestId === null) return;
      cancelAnimationFrame(this._frameRequestId);
      this._frameRequestId = null;
      this._frameCallback = null;
    }

    useGlobalStateManager(options = {}) {
      const globalStateManager = root && root.KozStateManager ? root.KozStateManager : null;
      return this.bindToStateManager(globalStateManager, options);
    }

    _deriveFallbackState() {
      const knownStates = new Set();
      for (const screen of Object.values(this.screens || {})) {
        const list = Array.isArray(screen.validStates) ? screen.validStates : [];
        for (const state of list) {
          if (typeof state === "string" && state) knownStates.add(state);
        }
      }

      const preferred = ["READY", "RUNNING", "PAUSED"];
      for (const state of preferred) {
        if (knownStates.has(state)) return state;
      }
      for (const state of knownStates) return state;
      return "READY";
    }

    _syncUiToCanvas() {
      const doc = root && root.document ? root.document : null;
      if (!doc || typeof doc.querySelector !== "function") return;

      const canvas = doc.querySelector("canvas");
      if (!canvas || typeof canvas.getBoundingClientRect !== "function") return;

      const rect = canvas.getBoundingClientRect();
      const roots = doc.querySelectorAll ? doc.querySelectorAll(".app-ui,[data-koz-ui-root]") : [];
      for (const node of roots) {
        if (!node || !node.style) continue;
        node.style.left = `${rect.left}px`;
        node.style.top = `${rect.top}px`;
        node.style.width = `${rect.width}px`;
        node.style.height = `${rect.height}px`;
      }
    }

    _scheduleRuntimeInit() {
      if (!this._autoRuntimeInit || this._runtimeInitScheduled) return;
      this._runtimeInitScheduled = true;

      const start = () => {
        this.initRuntimeUi();
        if (root && root.document && root.document.body) {
          this.bindDefaultStateActions(root.document.body);
        }
      };

      if (typeof queueMicrotask === "function") queueMicrotask(start);
      else setTimeout(start, 0);
    }

    initRuntimeUi(options = {}) {
      const opts = options || {};
      const fallbackState = typeof opts.fallbackState === "string" ? opts.fallbackState : this._deriveFallbackState();
      const userBeforeUpdate = typeof opts.beforeUpdate === "function" ? opts.beforeUpdate : null;
      const syncToCanvas = opts.syncToCanvas !== false;
      const retryBind = opts.retryBind !== false;
      const autoLifecycle = opts.autoLifecycle !== false;
      const beforeUpdate = () => {
        if (syncToCanvas) this._syncUiToCanvas();
        if (userBeforeUpdate) userBeforeUpdate();
      };

      this.useGlobalStateManager({ initialSync: true, fallbackState });

      if (autoLifecycle && root && typeof root.addEventListener === "function") {
        if (!this._beforeUnloadHandler) {
          this._beforeUnloadHandler = () => this.stopAutoUpdate();
          root.addEventListener("beforeunload", this._beforeUnloadHandler);
        }
        if (!this._resizeHandler) {
          this._resizeHandler = () => beforeUpdate();
          root.addEventListener("resize", this._resizeHandler);
        }
      }

      this.startAutoUpdate({
        beforeUpdate: () => {
          if (retryBind && !this._boundStateManager) {
            this.useGlobalStateManager({ initialSync: true, fallbackState });
          }
          beforeUpdate();
        },
      });
    }

    bindDefaultStateActions(rootNode, options = {}) {
      const node = rootNode || null;
      if (!node || typeof node.addEventListener !== "function") return;
      if (node.__kozBoundStateActions) return;

      const opts = options || {};
      const managerSelector = typeof opts.getStateManager === "function"
        ? opts.getStateManager
        : () => (root && root.KozStateManager ? root.KozStateManager : null);

      const actionToState = {
        start: "RUNNING",
        ready: "READY",
        reset: "READY",
        ...(opts.actionToState || {}),
      };

      node.addEventListener("click", (event) => {
        const button = event.target && typeof event.target.closest === "function"
          ? event.target.closest("button[data-action]")
          : null;
        if (!button) return;

        const action = button.dataset ? button.dataset.action : null;
        if (!action) return;

        const manager = managerSelector();
        if (!manager) return;

        if (action === "pause") {
          if (manager.is("RUNNING")) manager.setState("PAUSED");
          else if (manager.is("PAUSED")) manager.setState("RUNNING");
          return;
        }

        const nextState = actionToState[action];
        if (nextState) manager.setState(nextState);
      });

      node.__kozBoundStateActions = true;
    }
  }

  if (root && typeof root === "object") {
    if (!root.KozUIManager) {
      root.KozUIManager = new UIManager();
    }
    if (root.uiManager === undefined && typeof Object.defineProperty === "function") {
      Object.defineProperty(root, "uiManager", {
        configurable: true,
        enumerable: false,
        get() {
          return root.KozUIManager;
        },
        set(value) {
          root.KozUIManager = value;
        },
      });
    }
  }

  return { UIManager };
});
