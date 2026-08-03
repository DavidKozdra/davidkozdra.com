(function initKozEngineGlobalBridge(root) {
  /**
   * Browser/global bridge for loading Koz Engine modules.
   * Provides CommonJS-like require semantics in the browser and publishes
   * selected APIs to the global namespace.
   * @param {Object} root - The global object (window or globalThis)
   */
  if (!root) return;
  if (typeof XMLHttpRequest !== "function") return;

  const engineNamespace = root.KozEngine = root.KozEngine || {};
  const moduleCache = new Map();

  function ensurePath(target, path) {
    let cursor = target;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      cursor[key] = cursor[key] || {};
      cursor = cursor[key];
    }
    return { parent: cursor, key: path[path.length - 1] };
  }

  function registerNamespace(path, api) {
    const engineTarget = ensurePath(engineNamespace, path);
    engineTarget.parent[engineTarget.key] = api;
  }

  function publishGlobal(name, value) {
    if (typeof name !== "string" || !name) return;
    if (root[name] === undefined) {
      root[name] = value;
    }
  }

  function loadCommonJsModule(path) {
    const normalizedPath = normalizePath(withJsExtension(path));
    if (moduleCache.has(normalizedPath)) return moduleCache.get(normalizedPath);

    const request = new XMLHttpRequest();
    request.open("GET", normalizedPath, false);
    request.send(null);

    if (!((request.status >= 200 && request.status < 300) || request.status === 0)) {
      throw new Error(`Failed to load engine module: ${normalizedPath} (${request.status})`);
    }

    const module = { exports: {} };
    const exports = module.exports;
    const evaluate = new Function(
      "module",
      "exports",
      "require",
      `${request.responseText}\n//# sourceURL=${normalizedPath}`
    );

    evaluate(module, exports, function bridgeRequire(id) {
      if (typeof id !== "string" || !id) {
        throw new Error("CommonJS require id must be a non-empty string");
      }
      if (id.startsWith("./") || id.startsWith("../")) {
        return loadCommonJsModule(resolveRelativePath(normalizedPath, id));
      }
      if (id.startsWith("Koz_Engine_Lib/")) {
        return loadCommonJsModule(id);
      }
      throw new Error(`CommonJS require is not supported in browser bridge: ${id}`);
    });

    moduleCache.set(normalizedPath, module.exports);
    return module.exports;
  }

  function withJsExtension(path) {
    return path.endsWith(".js") ? path : `${path}.js`;
  }

  function normalizePath(path) {
    const parts = [];
    const segments = String(path || "").split("/");
    for (const segment of segments) {
      if (!segment || segment === ".") continue;
      if (segment === "..") {
        parts.pop();
        continue;
      }
      parts.push(segment);
    }
    return parts.join("/");
  }

  function dirname(path) {
    const normalized = normalizePath(path);
    const idx = normalized.lastIndexOf("/");
    return idx === -1 ? "" : normalized.slice(0, idx);
  }

  function resolveRelativePath(fromPath, requestPath) {
    const baseDir = dirname(fromPath);
    return normalizePath(`${baseDir}/${requestPath}`);
  }

  const moduleDefs = [
    {
      path: "Koz_Engine_Lib/AI/astar.js",
      register: ["AI", "astar"],
      globals: {
        aStar: (api) => api.aStar,
        MinHeap: (api) => api.MinHeap,
      },
    },
    {
      path: "Koz_Engine_Lib/AI/agentDispatcher.js",
      register: ["AI", "agentDispatcher"],
    },
    {
      path: "Koz_Engine_Lib/AI/actorStateMachine.js",
      register: ["AI", "actorStateMachine"],
    },
    {
      path: "Koz_Engine_Lib/AI/navigationAgent.js",
      register: ["AI", "navigationAgent"],
    },
    {
      path: "Koz_Engine_Lib/Core/geometry2d.js",
      register: ["Core", "geometry2d"],
    },
    {
      path: "Koz_Engine_Lib/Core/targetQuery.js",
      register: ["Core", "targetQuery"],
    },
    {
      path: "Koz_Engine_Lib/Time/stepTimer.js",
      register: ["Time", "stepTimer"],
    },
    {
      path: "Koz_Engine_Lib/Combat/statusBook.js",
      register: ["Combat", "statusBook"],
    },
    {
      path: "Koz_Engine_Lib/Combat/projectileMotion.js",
      register: ["Combat", "projectileMotion"],
    },
    {
      path: "Koz_Engine_Lib/Combat/collisionLayers.js",
      register: ["Combat", "collisionLayers"],
    },
    {
      path: "Koz_Engine_Lib/Rendering3D/worldMapping.js",
      register: ["Rendering3D", "worldMapping"],
    },
    {
      path: "Koz_Engine_Lib/Rendering3D/cameraRig.js",
      register: ["Rendering3D", "cameraRig"],
    },
    {
      path: "Koz_Engine_Lib/Rendering3D/roomGeometry.js",
      register: ["Rendering3D", "roomGeometry"],
    },
    {
      path: "Koz_Engine_Lib/Assets/atlasHelper.js",
      register: ["Assets", "atlasHelper"],
      globals: {
        AtlasManager: (api) => api.AtlasManager,
      },
    },
    {
      path: "Koz_Engine_Lib/World/seededRng.js",
      register: ["World", "seededRng"],
      globals: {
        KozSeededRNG: (api) => api.SeededRNG,
        KozRandom: (api) => function KozRandom(streamName) {
          return api.namedRandom(api.SeededRNG, streamName || "default");
        },
      },
    },
    {
      path: "Koz_Engine_Lib/World/worldSpace.js",
      register: ["World", "worldSpace"],
    },
    {
      path: "Koz_Engine_Lib/World/worldEditor.js",
      register: ["World", "worldEditor"],
    },
    {
      path: "Koz_Engine_Lib/World/worldGenerators.js",
      register: ["World", "worldGenerators"],
    },
    {
      path: "Koz_Engine_Lib/World/dungeonMaze.js",
      register: ["World", "dungeonMaze"],
    },
    {
      path: "Koz_Engine_Lib/Time/countdownTimer.js",
      register: ["Time", "countdownTimer"],
    },
    {
      path: "Koz_Engine_Lib/Core/gameStateManager.js",
      register: ["Core", "gameStateManager"],
      globals: {
        GameStateManager: (api) => api.GameStateManager,
      },
    },
    {
      path: "Koz_Engine_Lib/Core/extensionHost.js",
      register: ["Core", "extensionHost"],
    },
    {
      path: "Koz_Engine_Lib/Core/spatialGrid.js",
      register: ["Core", "spatialGrid"],
      globals: {
        SpatialGrid: (api) => api.SpatialGrid,
      },
    },
    {
      path: "Koz_Engine_Lib/Core/GameObject.js",
      register: ["Core", "gameObject"],
      globals: {
        GameObject: (api) => api.GameObject,
      },
    },
    {
      path: "Koz_Engine_Lib/Core/uiScreenController.js",
      register: ["Core", "uiScreenController"],
    },
    {
      path: "Koz_Engine_Lib/SaveLoad/schemaRegistry.js",
      register: ["SaveLoad", "schemaRegistry"],
    },
    {
      path: "Koz_Engine_Lib/SaveLoad/storageDrivers.js",
      register: ["SaveLoad", "storageDrivers"],
    },
    {
      path: "Koz_Engine_Lib/SaveLoad/saveApi.js",
      register: ["SaveLoad", "saveApi"],
    },
    {
      path: "Koz_Engine_Lib/Time/dayNightCore.js",
      register: ["Time", "dayNightCore"],
    },
    {
      path: "Koz_Engine_Lib/Time/dayNightCycle.js",
      register: ["Time", "dayNightCycle"],
      globals: {
        DayNightCycle: (api) => api.DayNightCycle,
      },
    },
    {
      path: "Koz_Engine_Lib/Events/eventEngine.js",
      register: ["Events", "eventEngine"],
    },
    {
      path: "Koz_Engine_Lib/Events/eventBus.js",
      register: ["Events", "eventBus"],
    },
    {
      path: "Koz_Engine_Lib/Events/eventSystem.js",
      register: ["Events", "eventSystem"],
      globals: {
        EventSystem: (api) => api.EventSystem,
      },
    },
    {
      path: "Koz_Engine_Lib/Events/tipTracker.js",
      register: ["Events", "tipTracker"],
    },
    {
      path: "Koz_Engine_Lib/Achievements/achievementSystem.js",
      register: ["Achievements", "achievementSystem"],
    },
    {
      path: "Koz_Engine_Lib/UI/mobileInput.js",
      register: ["UI", "mobileInput"],
    },
    {
      path: "Koz_Engine_Lib/UI/tabController.js",
      register: ["UI", "tabController"],
    },
    {
      path: "Koz_Engine_Lib/UI/controlBindings.js",
      register: ["UI", "controlBindings"],
    },
    {
      path: "Koz_Engine_Lib/UI/characterController.js",
      register: ["UI", "characterController"],
      globals: {
        CharacterController: (api) => api.CharacterController,
      },
    },
    {
      path: "Koz_Engine_Lib/PWA/clientRegistration.js",
      register: ["PWA", "clientRegistration"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/networkTransport.js",
      register: ["Multiplayer", "networkTransport"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/protocolMap.js",
      register: ["Multiplayer", "protocolMap"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/sessionDescriptor.js",
      register: ["Multiplayer", "sessionDescriptor"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/resumeStore.js",
      register: ["Multiplayer", "resumeStore"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/tabCoordinator.js",
      register: ["Multiplayer", "tabCoordinator"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/resilientSession.js",
      register: ["Multiplayer", "resilientSession"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/sequenceWindow.js",
      register: ["Multiplayer", "sequenceWindow"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/entityDelta.js",
      register: ["Multiplayer", "entityDelta"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/rateLimiter.js",
      register: ["Multiplayer", "rateLimiter"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/authorityCheckpoint.js",
      register: ["Multiplayer", "authorityCheckpoint"],
    },
    {
      path: "Koz_Engine_Lib/Multiplayer/Platforms/Cloudflare/durableObjectAdapter.js",
      register: ["Multiplayer", "Platforms", "Cloudflare", "durableObjectAdapter"],
    },
    { path: "Koz_Engine_Lib/UI/components/menuShell.js", register: ["UI", "components", "menuShell"] },
    { path: "Koz_Engine_Lib/UI/components/controlEditor.js", register: ["UI", "components", "controlEditor"] },
    { path: "Koz_Engine_Lib/UI/components/audioSettings.js", register: ["UI", "components", "audioSettings"] },
    { path: "Koz_Engine_Lib/UI/components/hudLayout.js", register: ["UI", "components", "hudLayout"] },
    { path: "Koz_Engine_Lib/UI/components/hudPreviewEditor.js", register: ["UI", "components", "hudPreviewEditor"] },
    {
      path: "Koz_Engine_Lib/Economy/stagedAcquisition.js",
      register: ["Economy", "stagedAcquisition"],
    },
    {
      path: "Koz_Engine_Lib/Items/itemFactory.js",
      register: ["Items", "itemFactory"],
    },
    {
      path: "Koz_Engine_Lib/Minigames/manager.js",
      register: ["Minigames", "manager"],
    },
    {
      path: "Koz_Engine_Lib/Minigames/minigamesRuntime.js",
      register: ["Minigames", "runtime"],
      globals: {
        MinigameManager: (api) => api.MinigameManager,
        MinigameBase: (api) => api.MinigameBase,
        HagglingMinigame: (api) => api.HagglingMinigame,
        LockPickingMinigame: (api) => api.LockPickingMinigame,
        DicePokerMinigame: (api) => api.DicePokerMinigame,
        MemoryMatchMinigame: (api) => api.MemoryMatchMinigame,
        WheelOfFortuneMinigame: (api) => api.WheelOfFortuneMinigame,
        BluffMeterMinigame: (api) => api.BluffMeterMinigame,
        NavigationDodgeMinigame: (api) => api.NavigationDodgeMinigame,
        ShipRaceMinigame: (api) => api.ShipRaceMinigame,
        FishingMinigame: (api) => api.FishingMinigame,
        MiningMinigame: (api) => api.MiningMinigame,
        HarvestMinigame: (api) => api.HarvestMinigame,
        WoodcuttingMinigame: (api) => api.WoodcuttingMinigame,
        SandDigMinigame: (api) => api.SandDigMinigame,
      },
      afterLoad: function afterMinigames(api) {
        if (root.minigameManager === undefined) {
          root.minigameManager = null;
        }
      },
    },
    {
      path: "Koz_Engine_Lib/VisualFX/particleSystemCore.js",
      register: ["VisualFX", "particleSystemCore"],
    },
    {
      path: "Koz_Engine_Lib/VisualFX/particleSystem.js",
      register: ["VisualFX", "particleSystem"],
      globals: {
        ParticleSystem: (api) => api.ParticleSystem,
      },
      afterLoad: function afterParticleSystem(api) {
        if (root.particleSystem === undefined) {
          root.particleSystem = api.createParticleSystem();
        }
        registerNamespace(["VisualFX", "particleSystem"], {
          ParticleSystem: api.ParticleSystem,
          particleSystem: root.particleSystem,
        });
      },
    },
    {
      path: "Koz_Engine_Lib/UI/modalPrimitives.js",
      register: ["UI", "modalPrimitives"],
    },
    {
      path: "Koz_Engine_Lib/UI/typewriterDialogue.js",
      register: ["UI", "typewriterDialogue"],
      globals: {
        TypewriterDialogueManager: (api) => api.TypewriterDialogueManager,
      },
    },
    {
      path: "Koz_Engine_Lib/UI/worldSpeechBubbles.js",
      register: ["UI", "worldSpeechBubbles"],
      globals: {
        WorldSpeechBubbleManager: (api) => api.WorldSpeechBubbleManager,
      },
    },
    {
      path: "Koz_Engine_Lib/Events/notificationCenter.js",
      register: ["Events", "notificationCenter"],
    },
    {
      path: "Koz_Engine_Lib/Events/notificationManager.js",
      register: ["Events", "notificationManager"],
      globals: {
        NotificationManager: (api) => api.NotificationManager,
      },
    },
    {
      path: "Koz_Engine_Lib/UI/uiManager.js",
      register: ["UI", "uiManager"],
      globals: {
        UIManager: (api) => api.UIManager,
      },
    },
    {
      path: "Koz_Engine_Lib/Audio/musicSystem.js",
      register: ["Audio", "musicSystem"],
      globals: {
        MusicSystem: (api) => api.MusicSystem,
      },
    },
    {
      path: "Koz_Engine_Lib/Audio/soundRegistry.js",
      register: ["Audio", "soundRegistry"],
    },
    {
      path: "Koz_Engine_Lib/Audio/mixerSystem.js",
      register: ["Audio", "mixerSystem"],
    },
  ];

  for (const def of moduleDefs) {
    const api = loadCommonJsModule(def.path);
    registerNamespace(def.register, api);

    if (def.globals) {
      for (const [name, factory] of Object.entries(def.globals)) {
        publishGlobal(name, factory(api));
      }
    }

    if (typeof def.afterLoad === "function") {
      def.afterLoad(api);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);

(function initKozRuntimeBootstrap(root) {
  if (!root) return;
  const Koz = (root.Koz = root.Koz || {});

  if (root.gameStateManager === undefined && typeof Object.defineProperty === "function") {
    Object.defineProperty(root, "gameStateManager", {
      configurable: true,
      enumerable: false,
      get() {
        return root.KozStateManager;
      },
      set(value) {
        root.KozStateManager = value;
      },
    });
  }

  Koz.init = function initKoz(options) {
    const opts = options || {};
    const engine = root.KozEngine || {};

    function resolveFromEngine(path) {
      const parts = String(path || "").split(".").filter(Boolean);
      let current = engine;
      for (const part of parts) {
        if (!current || !(part in current)) return undefined;
        current = current[part];
      }
      return current;
    }

    function requireFunction(path, label) {
      const fn = resolveFromEngine(path);
      if (typeof fn !== "function") {
        throw new Error(`Missing engine function: ${label || path}`);
      }
      return fn;
    }

    function requireConstructor(path, label) {
      return requireFunction(path, label);
    }

    const hasCore = !!root.KozEngine?.Core?.gameStateManager?.GameStateManager;
    const hasWorldSpace = !!root.KozEngine?.World?.worldSpace?.createWorldSpace;
    const hasWorldEditor = !!root.KozEngine?.World?.worldEditor?.createWorldEditor;
    if (!hasCore || !hasWorldSpace || !hasWorldEditor) {
      throw new Error("KozEngine is not fully loaded. Ensure koz-engine.global.js is loaded before init.");
    }

    const runtime = {
      engine: engine,
      resolve: resolveFromEngine,
      call(path, ...args) {
        return requireFunction(path, path)(...args);
      },
      construct(path, ...args) {
        const Ctor = requireConstructor(path, path);
        return new Ctor(...args);
      },
      createGameStateManager() {
        const Ctor = requireConstructor("Core.gameStateManager.GameStateManager", "GameStateManager");
        return new Ctor();
      },
      createConfiguredGameStateManager(config) {
        const cfg = config || {};
        const manager = this.createGameStateManager();
        const states = Array.isArray(cfg.states) ? cfg.states : [];
        for (const entry of states) {
          if (typeof entry === "string") {
            manager.addState(entry, {});
            continue;
          }
          if (entry && typeof entry.name === "string") {
            manager.addState(entry.name, {
              onEnter: typeof entry.onEnter === "function" ? entry.onEnter : undefined,
              onExit: typeof entry.onExit === "function" ? entry.onExit : undefined,
            });
          }
        }

        if (cfg.transitions && typeof cfg.transitions === "object") {
          manager.setTransitionRules(cfg.transitions);
        }
        if (typeof cfg.initialState === "string" && cfg.initialState) {
          manager.setState(cfg.initialState);
        }
        return manager;
      },
      createGameObject(type, x, y, options) {
        const Ctor = requireConstructor("Core.gameObject.GameObject", "GameObject");
        return new Ctor(type, x, y, options);
      },
      collides(obj1, obj2) {
        return requireFunction("Core.gameObject.collides", "collides")(obj1, obj2);
      },
      tagCollides(obj1, obj2, tagA, tagB) {
        return requireFunction("Core.gameObject.tagCollides", "tagCollides")(obj1, obj2, tagA, tagB);
      },
      findCollisions(objects, options) {
        return requireFunction("Core.gameObject.findCollisions", "findCollisions")(objects, options);
      },
      createWorldSpace(options) {
        return requireFunction("World.worldSpace.createWorldSpace", "createWorldSpace")(options);
      },
      createWorldEditor(options) {
        return requireFunction("World.worldEditor.createWorldEditor", "createWorldEditor")(options);
      },
    };

    if (opts.setGlobalRuntime !== false) {
      root.KozRuntime = runtime;
      root.KozReady = true;
      root.KozInitError = null;
    }

    return runtime;
  };

  Koz.autoInit = function autoInit() {
    const autoInitEnabled = root.KOZ_AUTO_INIT !== false;
    if (!autoInitEnabled) return null;
    if (root.KozRuntime) {
      root.KozReady = true;
      root.KozInitError = null;
      return root.KozRuntime;
    }
    try {
      return Koz.init({ setGlobalRuntime: true });
    } catch (error) {
      root.KozReady = false;
      root.KozInitError = error;
      throw error;
    }
  };

  Koz.autoInit();
})(typeof window !== "undefined" ? window : globalThis);
