(function initPwaClientRegistration(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else if (root) {
    root.KozPwaClient = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createPwaClientRegistrationApi() {
  function noop() {}

  function createPwaClient(options) {
    const opts = options || {};
    const root = opts.root || (typeof globalThis !== "undefined" ? globalThis : {});
    const navigatorApi = opts.navigator || root.navigator;
    const locationApi = opts.location || root.location;
    const setIntervalFn = opts.setInterval || root.setInterval?.bind(root);
    const clearIntervalFn = opts.clearInterval || root.clearInterval?.bind(root);
    const setTimeoutFn = opts.setTimeout || root.setTimeout?.bind(root);
    const clearTimeoutFn = opts.clearTimeout || root.clearTimeout?.bind(root);
    const MessageChannelCtor = opts.MessageChannel || root.MessageChannel;
    const logger = opts.logger || { error: noop };
    const onStateChange = typeof opts.onStateChange === "function" ? opts.onStateChange : noop;
    const onUpdateAvailable = typeof opts.onUpdateAvailable === "function" ? opts.onUpdateAvailable : noop;
    const onControllerChange = typeof opts.onControllerChange === "function" ? opts.onControllerChange : noop;
    const onError = typeof opts.onError === "function" ? opts.onError : function defaultError(error) {
      logger.error?.("[Koz PWA]", error);
    };

    let registration = null;
    let intervalId = null;
    let disposed = false;
    let reloadOnControllerChange = false;
    let controllerChangeHandled = false;
    const removeListeners = [];

    function emit(state, detail) {
      onStateChange({ state, detail: detail || null, registration });
    }

    function observeInstalling(worker) {
      if (!worker || typeof worker.addEventListener !== "function") return;
      const onState = function onWorkerStateChange() {
        emit(`worker:${worker.state}`, { worker });
        if (worker.state === "installed" && navigatorApi?.serviceWorker?.controller) {
          onUpdateAvailable({ registration, worker, applyUpdate });
        }
      };
      worker.addEventListener("statechange", onState);
      removeListeners.push(function removeWorkerListener() {
        worker.removeEventListener?.("statechange", onState);
      });
    }

    function observeRegistration(reg) {
      if (!reg || typeof reg.addEventListener !== "function") return;
      const onUpdateFound = function onRegistrationUpdateFound() {
        emit("update-found", { worker: reg.installing });
        observeInstalling(reg.installing);
      };
      reg.addEventListener("updatefound", onUpdateFound);
      removeListeners.push(function removeRegistrationListener() {
        reg.removeEventListener?.("updatefound", onUpdateFound);
      });
      if (reg.installing) observeInstalling(reg.installing);
      if (reg.waiting && navigatorApi?.serviceWorker?.controller) {
        onUpdateAvailable({ registration: reg, worker: reg.waiting, applyUpdate });
      }
    }

    async function register(registerOptions) {
      if (disposed) throw new Error("PWA client has been destroyed");
      const serviceWorkers = navigatorApi?.serviceWorker;
      if (!serviceWorkers || typeof serviceWorkers.register !== "function") {
        emit("unsupported");
        return null;
      }

      const config = registerOptions || {};
      const scriptUrl = config.scriptUrl || opts.scriptUrl || "/sw.js";
      const scope = config.scope || opts.scope || "/";
      emit("registering", { scriptUrl, scope });
      try {
        registration = await serviceWorkers.register(scriptUrl, {
          scope,
          updateViaCache: "none",
        });
        observeRegistration(registration);
        emit("registered");

        const updateIntervalMs = Number(config.updateIntervalMs ?? opts.updateIntervalMs);
        if (updateIntervalMs > 0 && setIntervalFn) {
          intervalId = setIntervalFn(function scheduledUpdate() {
            checkForUpdate().catch(onError);
          }, updateIntervalMs);
        }
        return registration;
      } catch (error) {
        emit("registration-error", { error });
        onError(error);
        return null;
      }
    }

    async function checkForUpdate() {
      if (!registration || typeof registration.update !== "function") return null;
      emit("checking-update");
      try {
        const result = await registration.update();
        emit("update-checked");
        return result;
      } catch (error) {
        emit("update-check-error", { error });
        throw error;
      }
    }

    function applyUpdate(applyOptions) {
      const config = applyOptions || {};
      const worker = registration?.waiting;
      if (!worker || typeof worker.postMessage !== "function") return false;
      reloadOnControllerChange = config.reload !== false;
      controllerChangeHandled = false;
      worker.postMessage({ type: "KOZ_PWA_SKIP_WAITING" });
      emit("activating-update", { worker });
      return true;
    }

    async function warmOptionalCache() {
      const serviceWorkers = navigatorApi?.serviceWorker;
      const readyRegistration = await serviceWorkers?.ready || registration;
      const worker = readyRegistration?.active;
      if (!worker || typeof worker.postMessage !== "function") return false;
      worker.postMessage({ type: "KOZ_PWA_WARM_OPTIONAL" });
      emit("warming-optional-cache");
      return true;
    }

    async function getOfflineStatus(statusOptions) {
      const serviceWorkers = navigatorApi?.serviceWorker;
      const readyRegistration = await serviceWorkers?.ready || registration;
      const worker = readyRegistration?.active;
      if (!worker || typeof worker.postMessage !== "function" || !MessageChannelCtor) return null;
      const timeoutMs = Math.max(250, Number(statusOptions?.timeoutMs) || 3000);
      return new Promise(function requestStatus(resolve) {
        const channel = new MessageChannelCtor();
        let settled = false;
        let timeoutId = null;
        const finish = function finish(value) {
          if (settled) return;
          settled = true;
          if (timeoutId !== null && clearTimeoutFn) clearTimeoutFn(timeoutId);
          channel.port1?.close?.();
          channel.port2?.close?.();
          resolve(value);
        };
        channel.port1.onmessage = function receiveStatus(event) {
          finish(event.data || null);
        };
        timeoutId = setTimeoutFn ? setTimeoutFn(function statusTimeout() {
          finish(null);
        }, timeoutMs) : null;
        worker.postMessage({ type: "KOZ_PWA_STATUS" }, [channel.port2]);
      });
    }

    async function requestPersistentStorage() {
      const storage = navigatorApi?.storage;
      if (!storage || typeof storage.persist !== "function") return false;
      try {
        return !!(await storage.persist());
      } catch (error) {
        onError(error);
        return false;
      }
    }

    async function getStorageEstimate() {
      const storage = navigatorApi?.storage;
      if (!storage || typeof storage.estimate !== "function") return null;
      try {
        const estimate = await storage.estimate();
        return {
          usage: Number(estimate?.usage || 0),
          quota: Number(estimate?.quota || 0),
          persisted: typeof storage.persisted === "function" ? !!(await storage.persisted()) : null,
        };
      } catch (error) {
        onError(error);
        return null;
      }
    }

    function destroy() {
      disposed = true;
      if (intervalId !== null && clearIntervalFn) clearIntervalFn(intervalId);
      intervalId = null;
      while (removeListeners.length) removeListeners.pop()();
      registration = null;
    }

    const serviceWorkers = navigatorApi?.serviceWorker;
    if (serviceWorkers && typeof serviceWorkers.addEventListener === "function") {
      const handleControllerChange = function handlePwaControllerChange() {
        if (controllerChangeHandled) return;
        controllerChangeHandled = true;
        emit("controller-changed");
        onControllerChange({ registration });
        if (reloadOnControllerChange && typeof locationApi?.reload === "function") {
          locationApi.reload();
        }
      };
      serviceWorkers.addEventListener("controllerchange", handleControllerChange);
      removeListeners.push(function removeControllerListener() {
        serviceWorkers.removeEventListener?.("controllerchange", handleControllerChange);
      });
    }

    return {
      register,
      checkForUpdate,
      applyUpdate,
      warmOptionalCache,
      getOfflineStatus,
      requestPersistentStorage,
      getStorageEstimate,
      destroy,
      getRegistration: function getRegistration() { return registration; },
      isSupported: function isSupported() {
        return !!navigatorApi?.serviceWorker?.register;
      },
    };
  }

  return {
    createPwaClient,
  };
});
