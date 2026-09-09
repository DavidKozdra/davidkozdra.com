(function initGameRuntimeLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameRuntimeApi() {
  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Creates a game runtime that loads and runs a project.
   * Designed to work both in the editor (play mode) and in exported builds.
   */
  function createGameRuntime(options) {
    const opts = options || {};
    const createWorldSpace = opts.createWorldSpace;
    const GameObjectCtor = opts.GameObject;
    const adapters = opts.adapters;

    let project = null;
    let activeScene = null;
    let worldSpace = null;
    let gameObjects = [];
    let scripts = {};
    let scriptInstances = [];
    let cssStyleElements = new Map();
    let animationClips = [];
    let _clipIndex = new Map();
    let _animStates = new Map();
    let audioService = null;
    let running = false;
    let elapsed = 0;
    let pressedKeys = new Set();
    let removeInputListeners = null;
    // --- Performance: object ID index for O(1) lookups ---
    let _objectIndex = new Map();
    let _cachedEngineApi = null;
    let _engineApiDirty = true;

    function resolveKeyCode(event) {
      if (!event) return 0;
      const numeric = Number(event.keyCode || event.which);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
      const code = typeof event.code === "string" ? event.code : "";
      if (code === "Space") return 32;
      if (code === "ArrowLeft") return 37;
      if (code === "ArrowUp") return 38;
      if (code === "ArrowRight") return 39;
      if (code === "ArrowDown") return 40;
      if (code === "ShiftLeft" || code === "ShiftRight") return 16;
      if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
      const key = typeof event.key === "string" ? event.key : "";
      if (key === " ") return 32;
      if (key === "ArrowLeft") return 37;
      if (key === "ArrowUp") return 38;
      if (key === "ArrowRight") return 39;
      if (key === "ArrowDown") return 40;
      if (key === "Shift") return 16;
      if (/^[a-z]$/i.test(key)) return key.toUpperCase().charCodeAt(0);
      return 0;
    }

    function installInputListeners() {
      if (removeInputListeners || typeof window === "undefined") return;
      const handleDown = function handleDown(event) {
        const code = resolveKeyCode(event);
        if (code) pressedKeys.add(code);
      };
      const handleUp = function handleUp(event) {
        const code = resolveKeyCode(event);
        if (code) pressedKeys.delete(code);
      };
      const clearKeys = function clearKeys() {
        pressedKeys.clear();
      };
      window.addEventListener("keydown", handleDown, true);
      window.addEventListener("keyup", handleUp, true);
      window.addEventListener("blur", clearKeys);
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", clearKeys);
      }
      removeInputListeners = function removeListeners() {
        window.removeEventListener("keydown", handleDown, true);
        window.removeEventListener("keyup", handleUp, true);
        window.removeEventListener("blur", clearKeys);
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", clearKeys);
        }
        pressedKeys.clear();
        removeInputListeners = null;
      };
    }

    function _rebuildObjectIndex() {
      _objectIndex.clear();
      for (let i = 0; i < gameObjects.length; i++) {
        _objectIndex.set(gameObjects[i].id, gameObjects[i]);
      }
    }

    function _normalizeLookupValue(value) {
      return typeof value === "string" ? value.trim() : "";
    }

    function _findObjectByName(name) {
      const lookup = _normalizeLookupValue(name);
      if (!lookup) return null;
      const lower = lookup.toLowerCase();
      let caseInsensitiveMatch = null;
      for (let i = 0; i < gameObjects.length; i++) {
        const obj = gameObjects[i];
        if (!obj) continue;
        const meta = obj.meta && typeof obj.meta === "object" ? obj.meta : {};
        const fields = [meta.name, meta.prefabName];
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j];
          if (typeof field !== "string" || !field) continue;
          if (field === lookup) return obj;
          if (!caseInsensitiveMatch && field.toLowerCase() === lower) caseInsensitiveMatch = obj;
        }
      }
      return caseInsensitiveMatch;
    }

    function _findObjectById(value) {
      const lookup = _normalizeLookupValue(value);
      if (!lookup) return null;
      const exactId = _objectIndex.get(lookup);
      if (exactId) return exactId;
      const lower = lookup.toLowerCase();
      let caseInsensitiveMatch = null;
      for (let i = 0; i < gameObjects.length; i++) {
        const obj = gameObjects[i];
        if (!obj) continue;
        const meta = obj.meta && typeof obj.meta === "object" ? obj.meta : {};
        const fields = [meta.sourceObjectId, meta.prefabId];
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j];
          if (typeof field !== "string" || !field) continue;
          if (field === lookup) return obj;
          if (!caseInsensitiveMatch && field.toLowerCase() === lower) caseInsensitiveMatch = obj;
        }
        if (!caseInsensitiveMatch && typeof obj.id === "string" && obj.id.toLowerCase() === lower) {
          caseInsensitiveMatch = obj;
        }
      }
      return caseInsensitiveMatch;
    }

    function _findObjectsByType(type) {
      const lookup = _normalizeLookupValue(type);
      if (!lookup) return [];
      const lower = lookup.toLowerCase();
      return gameObjects.filter(function byType(obj) {
        if (!obj || typeof obj.type !== "string") return false;
        return obj.type === lookup || obj.type.toLowerCase() === lower;
      });
    }

    function _findObjectByType(type) {
      const matches = _findObjectsByType(type);
      return matches.length > 0 ? matches[0] : null;
    }

    function _findObjectByLookup(value) {
      const lookup = _normalizeLookupValue(value);
      if (!lookup) return null;
      return _findObjectByName(lookup) || _findObjectById(lookup) || _findObjectByType(lookup);
    }

    function loadProject(projectData) {
      clearActiveCssStyles();
      project = clone(projectData || {});
      activeScene = resolveActiveScene(project);
      if (activeScene) {
        if (!Array.isArray(project.scenes) || project.scenes.length === 0) project.scenes = [activeScene];
        project.activeSceneId = activeScene.id;
        project.world = activeScene.world;
        project.objects = activeScene.objects;
      }
      worldSpace = adapters.projectToWorldSpace(createWorldSpace, project.world);
      gameObjects = adapters.projectToGameObjects(GameObjectCtor, project.objects, project.prefabs || []);
      _rebuildObjectIndex();
      _engineApiDirty = true;
      animationClips = project.animations || [];
      _clipIndex.clear();
      for (const clip of animationClips) _clipIndex.set(clip.id, clip);
      _animStates.clear();
      scripts = {};
      scriptInstances = [];
      audioService = createRuntimeAudioService(project.assets || [], gameObjects);

      // Index scripts by id
      if (Array.isArray(project.scripts)) {
        for (const script of project.scripts) {
          scripts[script.id] = script;
        }
      }

      // Initialize animation states from Animator components
      for (const obj of gameObjects) {
        const components = obj.meta && obj.meta.components;
        const animator = components && components.Animator;
        if (animator && animator.clipId && _clipIndex.has(animator.clipId)) {
          _animStates.set(obj.id, {
            clipId: animator.clipId,
            localTime: 0,
            speed: 1,
            playing: !!animator.autoplay,
            paused: false,
            frameIndex: null,
          });
        }
      }

      // Create script instances for objects with ScriptBinding or ScriptBindings
      for (const obj of gameObjects) {
        const components = obj.meta && obj.meta.components;
        // Support both legacy singular (ScriptBinding) and array form (ScriptBindings)
        const legacyBinding = components && components.ScriptBinding;
        const bindings = components && components.ScriptBindings;
        
        // Handle legacy single binding
        if (legacyBinding && legacyBinding.scriptId && scripts[legacyBinding.scriptId]) {
          const boundScript = scripts[legacyBinding.scriptId];
          if (boundScript.language === "css") {
            applyCssScript(boundScript);
          } else {
            const instance = createScriptInstance(boundScript, obj, legacyBinding.properties);
            if (instance) scriptInstances.push(instance);
          }
        }

        // Handle array of bindings
        if (Array.isArray(bindings)) {
          for (const binding of bindings) {
            if (binding && binding.active !== false && binding.scriptId && scripts[binding.scriptId]) {
              const boundScript = scripts[binding.scriptId];
              if (boundScript.language === "css") {
                applyCssScript(boundScript);
              } else {
                const instance = createScriptInstance(boundScript, obj, binding.properties);
                if (instance) scriptInstances.push(instance);
              }
            }
          }
        }
      }
    }

    function applyCssScript(script) {
      if (!script || !script.id || cssStyleElements.has(script.id)) return;
      if (typeof document === "undefined") return;
      const target = document.head || document.documentElement || document.body;
      if (!target || typeof target.appendChild !== "function") return;
      const styleEl = document.createElement("style");
      styleEl.type = "text/css";
      styleEl.setAttribute("data-koz-script-id", script.id);
      styleEl.textContent = String(script.source || "");
      target.appendChild(styleEl);
      cssStyleElements.set(script.id, styleEl);
    }

    function clearActiveCssStyles() {
      cssStyleElements.forEach(function removeStyle(styleEl) {
        if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      });
      cssStyleElements = new Map();
    }

    function createScriptInstance(script, gameObject, bindingProps) {
      try {
        const sandbox = {
          self: gameObject,
          console: { log: console.log.bind(console), warn: console.warn.bind(console), error: console.error.bind(console) },
        };

        // Parse script functions from source — props are available in the closure
        const wrappedSource = `(function(self, props, console, keyIsDown, LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, SPACE) {
          ${script.source}
          return { onInit: typeof onInit === 'function' ? onInit : null, onUpdate: typeof onUpdate === 'function' ? onUpdate : null };
        })`;

        const props = bindingProps ? clone(bindingProps) : {};
        const factory = new Function("return " + wrappedSource)();
        const hooks = factory(sandbox.self, props, sandbox.console, function keyIsDown(code) {
          return pressedKeys.has(Number(code) || 0);
        }, 37, 39, 38, 40, 32);
        return {
          scriptId: script.id,
          gameObject: gameObject,
          hooks: hooks,
          props: props,
        };
      } catch (err) {
        console.error("Script compile error (" + script.name + "):", err.message);
        return null;
      }
    }

    function init() {
      running = true;
      elapsed = 0;
      installInputListeners();
      if (audioService) audioService.autoplayFromComponents();

      const engine = createEngineApi();
      for (const instance of scriptInstances) {
        if (instance.hooks.onInit) {
          try {
            instance.hooks.onInit(instance.gameObject, engine);
          } catch (err) {
            console.error("Script onInit error:", err.message);
          }
        }
      }
    }

    function update(dt) {
      if (!running) return;
      elapsed += dt;

      // Evaluate per-object animations driven by Animator component
      _animStates.forEach(function evalAnimState(state, objId) {
        if (!state.playing || state.paused) return;
        state.localTime += dt * state.speed;
        var clip = _clipIndex.get(state.clipId);
        if (!clip) return;
        var duration = clip.duration || 1;
        if (clip.loop) {
          state.localTime = state.localTime % duration;
        } else if (state.localTime >= duration) {
          state.localTime = duration;
          state.playing = false;
        }
        evaluateClipForObject(clip, state.localTime, objId);
      });

      // Evaluate unbound clips (clips whose tracks target objects without an Animator)
      for (const clip of animationClips) {
        evaluateUnboundClip(clip, elapsed);
      }

      // Run script updates
      const engine = createEngineApi();
      for (const instance of scriptInstances) {
        if (instance.hooks.onUpdate) {
          try {
            instance.hooks.onUpdate(instance.gameObject, engine, dt);
          } catch (err) {
            console.error("Script onUpdate error:", err.message);
          }
        }
      }
    }

    function evaluateClipForObject(clip, localTime, objId) {
      if (!clip.tracks || clip.tracks.length === 0) return;
      for (const track of clip.tracks) {
        if (track.targetObjectId !== objId) continue;
        const obj = _objectIndex.get(objId);
        if (!obj || !track.keyframes || track.keyframes.length === 0) continue;
        const value = sampleTrack(track, localTime);
        if (value !== null) obj[track.property] = value;
      }
    }

    function evaluateUnboundClip(clip, time) {
      if (!clip.tracks || clip.tracks.length === 0) return;
      const duration = clip.duration || 1;
      const localTime = clip.loop ? (time % duration) : Math.min(time, duration);
      for (const track of clip.tracks) {
        if (_animStates.has(track.targetObjectId)) continue;
        const obj = _objectIndex.get(track.targetObjectId);
        if (!obj || !track.keyframes || track.keyframes.length === 0) continue;
        const value = sampleTrack(track, localTime);
        if (value !== null) obj[track.property] = value;
      }
    }

    function sampleTrack(track, time) {
      const kfs = track.keyframes;
      if (kfs.length === 0) return null;
      if (kfs.length === 1) return kfs[0].value;
      if (time <= kfs[0].time) return kfs[0].value;
      if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

      for (let i = 0; i < kfs.length - 1; i++) {
        if (time >= kfs[i].time && time <= kfs[i + 1].time) {
          const range = kfs[i + 1].time - kfs[i].time;
          const t = range > 0 ? (time - kfs[i].time) / range : 0;
          return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * t;
        }
      }
      return kfs[kfs.length - 1].value;
    }

    function stop() {
      running = false;
      if (audioService) audioService.destroy();
      if (typeof removeInputListeners === "function") removeInputListeners();
      clearActiveCssStyles();
    }

    function _resolveObjId(target) {
      if (!target) return null;
      if (typeof target === "string") return target;
      if (typeof target === "object" && target.id) return target.id;
      return null;
    }

    function _ensureAnimState(objId) {
      var state = _animStates.get(objId);
      if (!state) {
        state = { clipId: null, localTime: 0, speed: 1, playing: false, paused: false, frameIndex: null };
        _animStates.set(objId, state);
      }
      return state;
    }

    function createAnimatorApi() {
      return {
        play: function animPlay(target, clipId) {
          var objId = _resolveObjId(target);
          if (!objId) return false;
          var clip = _clipIndex.get(clipId);
          if (!clip) return false;
          var state = _ensureAnimState(objId);
          state.clipId = clipId;
          state.localTime = 0;
          state.playing = true;
          state.paused = false;
          return true;
        },
        stop: function animStop(target) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var state = _animStates.get(objId);
          if (state) { state.playing = false; state.paused = false; state.localTime = 0; }
        },
        pause: function animPause(target) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var state = _animStates.get(objId);
          if (state && state.playing) state.paused = true;
        },
        resume: function animResume(target) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var state = _animStates.get(objId);
          if (state && state.paused) state.paused = false;
        },
        setSpeed: function animSetSpeed(target, speed) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var state = _ensureAnimState(objId);
          state.speed = Number.isFinite(speed) ? speed : 1;
        },
        isPlaying: function animIsPlaying(target) {
          var objId = _resolveObjId(target);
          if (!objId) return false;
          var state = _animStates.get(objId);
          return !!(state && state.playing && !state.paused);
        },
        getClipId: function animGetClipId(target) {
          var objId = _resolveObjId(target);
          if (!objId) return null;
          var state = _animStates.get(objId);
          return state ? state.clipId : null;
        },
        setFrame: function animSetFrame(target, index) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var obj = _objectIndex.get(objId);
          if (!obj) return;
          var idx = Math.max(0, Math.floor(Number(index) || 0));
          obj._frameIndex = idx;
        },
        getFrame: function animGetFrame(target) {
          var objId = _resolveObjId(target);
          if (!objId) return 0;
          var obj = _objectIndex.get(objId);
          if (!obj) return 0;
          return typeof obj._frameIndex === "number" ? obj._frameIndex : 0;
        },
        getFrameCount: function animGetFrameCount(target) {
          var objId = _resolveObjId(target);
          if (!objId) return 0;
          var obj = _objectIndex.get(objId);
          if (!obj) return 0;
          var components = obj.meta && obj.meta.components;
          var sprite = components && components.Sprite;
          var frameIds = sprite && Array.isArray(sprite.frameAssetIds) ? sprite.frameAssetIds : [];
          return frameIds.length > 0 ? frameIds.length : (sprite && sprite.assetId ? 1 : 0);
        },
        setFPS: function animSetFPS(target, fps) {
          var objId = _resolveObjId(target);
          if (!objId) return;
          var obj = _objectIndex.get(objId);
          if (!obj) return;
          var components = obj.meta && obj.meta.components;
          var sprite = components && components.Sprite;
          if (sprite) sprite.fps = Number.isFinite(fps) ? fps : 8;
        },
      };
    }

    function createEngineApi() {
      if (_cachedEngineApi && !_engineApiDirty) {
        _cachedEngineApi.elapsed = elapsed;
        return _cachedEngineApi;
      }
      _cachedEngineApi = {
        worldSpace: worldSpace,
        gameObjects: gameObjects,
        elapsed: elapsed,
        scene: activeScene,
        sceneId: activeScene ? activeScene.id : (project && project.activeSceneId) || null,
        sceneName: activeScene ? activeScene.name : null,
        audio: audioService ? audioService.api : null,
        findObject: function findObject(value) {
          return _findObjectByLookup(value);
        },
        findObjectById: function findObjectById(value) {
          return _findObjectById(value);
        },
        findObjectsByType: function findObjectsByType(type) {
          return _findObjectsByType(type);
        },
        findObjectByType: function findObjectByType(type) {
          return _findObjectByType(type);
        },
        keyIsDown: function runtimeKeyIsDown(code) {
          return pressedKeys.has(Number(code) || 0);
        },
        animator: createAnimatorApi(),
      };
      _engineApiDirty = false;
      return _cachedEngineApi;
    }

    function resolveActiveScene(projectData) {
      if (adapters && typeof adapters.resolveActiveScene === "function") {
        return adapters.resolveActiveScene(projectData);
      }
      if (!projectData || typeof projectData !== "object") return null;
      const scenes = Array.isArray(projectData.scenes) ? projectData.scenes : [];
      if (scenes.length === 0) {
        return {
          id: projectData.activeSceneId || "scene_main",
          name: "Main Scene",
          world: projectData.world || { cols: 30, rows: 20, defaultCell: null, grid: [], elements: [], meta: {} },
          objects: Array.isArray(projectData.objects) ? projectData.objects : [],
        };
      }
      return scenes.find(function byId(scene) {
        return scene && scene.id === projectData.activeSceneId;
      }) || scenes[0];
    }

    function createRuntimeAudioService(assets, objects) {
      let masterVolume = 1;
      let currentMusic = null;
      const handles = new Set();
      const assetById = new Map((Array.isArray(assets) ? assets : []).map((asset) => [asset.id, asset]));

      function clamp01(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 1;
        return Math.max(0, Math.min(1, n));
      }

      function resolveAudioSrc(assetId) {
        const asset = assetById.get(assetId);
        if (!asset) return null;
        return asset.previewUrl || asset.url || asset.src || null;
      }

      function resolveObject(target) {
        if (!target) return null;
        if (typeof target === "string") return _objectIndex.get(target) || null;
        if (typeof target === "object" && target.id) return target;
        return null;
      }

      function stopHandle(handle) {
        if (!handle) return;
        try {
          handle.audio.pause();
          handle.audio.currentTime = 0;
        } catch (_err) {}
        handles.delete(handle);
        if (currentMusic === handle) currentMusic = null;
      }

      function play(assetId, options = {}) {
        if (typeof Audio === "undefined") return null;
        const src = resolveAudioSrc(assetId);
        if (!src) return null;
        const audio = new Audio(src);
        const handle = {
          audio,
          sourceObjectId: options.sourceObjectId || null,
          baseVolume: clamp01(options.volume ?? 1),
          category: options.category === "music" ? "music" : "sfx",
        };
        audio.loop = !!options.loop;
        audio.volume = clamp01(handle.baseVolume * masterVolume);
        audio.addEventListener("ended", function onEnded() {
          if (!audio.loop) handles.delete(handle);
          if (currentMusic === handle && !audio.loop) currentMusic = null;
        });
        handles.add(handle);
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function ignoredPlaybackError() {});
        }
        return handle;
      }

      const api = {
        play: function playApi(assetId, options) {
          return play(assetId, options);
        },
        playMusic: function playMusicApi(assetId, options = {}) {
          if (currentMusic) stopHandle(currentMusic);
          currentMusic = play(assetId, { ...options, loop: options.loop !== false, category: "music" });
          return currentMusic;
        },
        stopMusic: function stopMusicApi() {
          if (currentMusic) stopHandle(currentMusic);
          currentMusic = null;
        },
        playObjectSound: function playObjectSoundApi(target, overrides = {}) {
          const obj = resolveObject(target);
          if (!obj) return null;
          const components = obj.meta && obj.meta.components;
          const sound = components && components.Sound;
          if (!sound || !sound.assetId) return null;
          const options = {
            loop: overrides.loop !== undefined ? overrides.loop : !!sound.loop,
            volume: overrides.volume !== undefined ? overrides.volume : (Number.isFinite(sound.volume) ? sound.volume : 1),
            category: overrides.category || (sound.category === "music" ? "music" : "sfx"),
            sourceObjectId: obj.id,
          };
          if (options.category === "music") return api.playMusic(sound.assetId, options);
          return play(sound.assetId, options);
        },
        stopObjectSound: function stopObjectSoundApi(target) {
          const obj = resolveObject(target);
          if (!obj) return;
          Array.from(handles).forEach(function eachHandle(handle) {
            if (handle.sourceObjectId === obj.id) stopHandle(handle);
          });
        },
        stop: function stopApi(handle) {
          stopHandle(handle);
        },
        stopAll: function stopAllApi() {
          Array.from(handles).forEach(function eachHandle(handle) {
            stopHandle(handle);
          });
          currentMusic = null;
        },
        setMasterVolume: function setMasterVolumeApi(value) {
          masterVolume = clamp01(value);
          handles.forEach(function eachHandle(handle) {
            handle.audio.volume = clamp01(handle.baseVolume * masterVolume);
          });
          return masterVolume;
        },
        getMasterVolume: function getMasterVolumeApi() {
          return masterVolume;
        },
      };

      return {
        api,
        autoplayFromComponents: function autoplayFromComponents() {
          objects.forEach(function eachObject(obj) {
            const components = obj.meta && obj.meta.components;
            const sound = components && components.Sound;
            if (!sound || !sound.assetId || !sound.autoplay) return;
            api.playObjectSound(obj);
          });
        },
        destroy: function destroy() {
          api.stopAll();
        },
      };
    }

    return {
      loadProject: loadProject,
      init: init,
      update: update,
      stop: stop,
      get project() { return project; },
      get activeScene() { return activeScene; },
      get activeSceneId() { return activeScene ? activeScene.id : null; },
      get worldSpace() { return worldSpace; },
      get gameObjects() { return gameObjects; },
      get running() { return running; },
      get elapsed() { return elapsed; },
    };
  }

  return {
    createGameRuntime: createGameRuntime,
  };
});
