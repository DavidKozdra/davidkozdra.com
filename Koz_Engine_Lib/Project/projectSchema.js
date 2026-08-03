(function initProjectSchemaLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectSchemaApi() {

  const CURRENT_VERSION = 1;
  const DEFAULT_SCENE_ID = "scene_main";
  const DEFAULT_RENDER_MODE = "2d";
  const LIGHTING_MODE_PIXEL = "pixel";
  const LIGHTING_MODE_SOFT = "soft";
  const LIGHTING_COLOR_PRESET_NONE = "none";
  const LIGHTING_COLOR_PRESETS = new Set(["none", "warm", "cool", "noir", "neon", "sunset", "moonlight"]);
  const DEFAULT_SCENE_LIGHTING = {
    enabled: false,
    mode: LIGHTING_MODE_PIXEL,
    flicker: false,
    volumetric: false,
    fogBoost: 0,
    dither: false,
    vignette: 0,
    colorPreset: LIGHTING_COLOR_PRESET_NONE,
    ambientColor: "#0b1220",
    ambientIntensity: 0.35,
    overlayOpacity: 0.82,
    fogColor: "#07111d",
    fogDensity: 0.65,
  };
  const DEFAULT_LIGHTING_MANAGER_COMPONENT = {
    enabled: false,
    mode: LIGHTING_MODE_PIXEL,
    flicker: false,
    volumetric: false,
    fogBoost: 0,
    dither: false,
    vignette: 0,
    colorPreset: LIGHTING_COLOR_PRESET_NONE,
    ambientColor: "#0b1220",
    ambientIntensity: 0.35,
    overlayOpacity: 0.82,
    fogColor: "#07111d",
    fogDensity: 0.65,
  };
  const DEFAULT_LIGHT_COMPONENT = {
    enabled: true,
    color: "#ffd27a",
    intensity: 1,
    radius: 180,
    falloff: 0.65,
    offsetX: 0,
    offsetY: 0,
    height: 18,
  };

  function normalizeRenderMode(value, fallback) {
    const mode = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (mode === "3d" || mode === "webgl-3d") return "webgl-3d";
    if (mode === "2d") return "2d";
    return fallback || DEFAULT_RENDER_MODE;
  }

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function clamp01(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  }

  function normalizeLightingMode(value, fallback) {
    const mode = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (mode === LIGHTING_MODE_SOFT) return LIGHTING_MODE_SOFT;
    if (mode === LIGHTING_MODE_PIXEL || mode === "crisp" || mode === "hard") return LIGHTING_MODE_PIXEL;
    return fallback || LIGHTING_MODE_PIXEL;
  }

  function normalizeLightingColorPreset(value, fallback) {
    const preset = typeof value === "string" ? value.trim().toLowerCase() : "";
    return LIGHTING_COLOR_PRESETS.has(preset) ? preset : (fallback || LIGHTING_COLOR_PRESET_NONE);
  }

  function normalizeSceneLighting(lighting) {
    const source = lighting && typeof lighting === "object" ? lighting : {};
    return {
      enabled: source.enabled === true,
      mode: normalizeLightingMode(source.mode, DEFAULT_SCENE_LIGHTING.mode),
      flicker: source.flicker === true,
      volumetric: source.volumetric === true,
      fogBoost: clamp01(source.fogBoost, DEFAULT_SCENE_LIGHTING.fogBoost),
      dither: source.dither === true,
      vignette: clamp01(source.vignette, DEFAULT_SCENE_LIGHTING.vignette),
      colorPreset: normalizeLightingColorPreset(source.colorPreset, DEFAULT_SCENE_LIGHTING.colorPreset),
      ambientColor: typeof source.ambientColor === "string" && source.ambientColor ? source.ambientColor : DEFAULT_SCENE_LIGHTING.ambientColor,
      ambientIntensity: clamp01(source.ambientIntensity, DEFAULT_SCENE_LIGHTING.ambientIntensity),
      overlayOpacity: clamp01(source.overlayOpacity, DEFAULT_SCENE_LIGHTING.overlayOpacity),
      fogColor: typeof source.fogColor === "string" && source.fogColor ? source.fogColor : DEFAULT_SCENE_LIGHTING.fogColor,
      fogDensity: clamp01(source.fogDensity, DEFAULT_SCENE_LIGHTING.fogDensity),
    };
  }

  function normalizeLightingManagerComponent(component) {
    const source = component && typeof component === "object" ? component : {};
    return {
      enabled: source.enabled === true,
      mode: normalizeLightingMode(source.mode, DEFAULT_LIGHTING_MANAGER_COMPONENT.mode),
      flicker: source.flicker === true,
      volumetric: source.volumetric === true,
      fogBoost: clamp01(source.fogBoost, DEFAULT_LIGHTING_MANAGER_COMPONENT.fogBoost),
      dither: source.dither === true,
      vignette: clamp01(source.vignette, DEFAULT_LIGHTING_MANAGER_COMPONENT.vignette),
      colorPreset: normalizeLightingColorPreset(source.colorPreset, DEFAULT_LIGHTING_MANAGER_COMPONENT.colorPreset),
      ambientColor: typeof source.ambientColor === "string" && source.ambientColor ? source.ambientColor : DEFAULT_LIGHTING_MANAGER_COMPONENT.ambientColor,
      ambientIntensity: clamp01(source.ambientIntensity, DEFAULT_LIGHTING_MANAGER_COMPONENT.ambientIntensity),
      overlayOpacity: clamp01(source.overlayOpacity, DEFAULT_LIGHTING_MANAGER_COMPONENT.overlayOpacity),
      fogColor: typeof source.fogColor === "string" && source.fogColor ? source.fogColor : DEFAULT_LIGHTING_MANAGER_COMPONENT.fogColor,
      fogDensity: clamp01(source.fogDensity, DEFAULT_LIGHTING_MANAGER_COMPONENT.fogDensity),
    };
  }

  function hasLightingManagerObject(objects) {
    return Array.isArray(objects) && objects.some(function hasManager(obj) {
      return obj && obj.components && obj.components.LightingManager;
    });
  }

  function hasCameraObject(objects) {
    return Array.isArray(objects) && objects.some(function hasCamera(obj) {
      return obj && (obj.type === "camera" || (obj.components && obj.components.Camera));
    });
  }

  function createLightingManagerObject(sceneId, lighting) {
    const normalized = normalizeLightingManagerComponent(lighting);
    return {
      id: "obj_" + (sceneId || DEFAULT_SCENE_ID) + "_lighting_manager",
      name: "Lighting Manager",
      type: "lighting_manager",
      x: 0,
      y: 0,
      components: {
        Transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        Sprite: { assetId: null, color: "#60a5fa", width: 20, height: 20 },
        Collider: { shape: "rect", width: 20, height: 20 },
        Collision: { enabled: false, isTrigger: false },
        RigidBody: { enabled: false, weight: 1, friction: 0.4 },
        Render: { layerId: "obj-fx", visible: false, zIndex: 0 },
        ScriptBinding: { scriptId: null },
        ScriptBindings: [],
        Animator: { clipId: null, autoplay: false },
        LightingManager: normalized,
      },
    };
  }

  function createSceneCameraObject(sceneId, world, options) {
    const sourceWorld = world && typeof world === "object" ? world : createDefaultWorld(30, 20, null);
    const cols = Number.isFinite(sourceWorld.cols) ? sourceWorld.cols : 30;
    const rows = Number.isFinite(sourceWorld.rows) ? sourceWorld.rows : 20;
    const offsetX = Number.isFinite(sourceWorld.offsetX) ? sourceWorld.offsetX : 0;
    const offsetY = Number.isFinite(sourceWorld.offsetY) ? sourceWorld.offsetY : 0;
    const centerX = Math.round((offsetX * 24) + (cols * 12));
    const centerY = Math.round((offsetY * 24) + (rows * 12));
    const opts = options || {};
    return {
      id: opts.id || "obj_" + (sceneId || DEFAULT_SCENE_ID) + "_camera",
      name: opts.name || "Main Camera",
      type: "camera",
      parentId: null,
      x: centerX,
      y: centerY,
      components: {
        Transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
        Camera: {
          enabled: true,
          targetObjectId: null,
          speed: 8,
          offsetX: 0,
          offsetY: 0,
          deadZoneWidth: 180,
          deadZoneHeight: 120,
          lookAheadX: 0,
          lookAheadY: 0,
          visibleMargin: 40,
          followX: true,
          followY: true,
          clampToWorld: true,
          maxSpeed: 2000,
        },
        Render: { layerId: "obj-main", visible: false, zIndex: 0 },
        ScriptBinding: { scriptId: null },
        ScriptBindings: [],
      },
    };
  }

  function ensureSceneObjects(sceneId, world, objects, lighting) {
    const next = Array.isArray(objects) ? deepClone(objects) : [];
    if (lighting && !hasLightingManagerObject(next)) {
      next.unshift(createLightingManagerObject(sceneId, lighting));
    }
    if (!hasCameraObject(next)) {
      next.unshift(createSceneCameraObject(sceneId, world));
    }
    return next;
  }

  function createDefaultWorld(cols, rows, defaultCell) {
    const safeCols = cols || 30;
    const safeRows = rows || 20;
    return {
      cols: safeCols,
      rows: safeRows,
      defaultCell: defaultCell !== undefined ? defaultCell : null,
      grid: createDefaultGrid(safeCols, safeRows, defaultCell !== undefined ? defaultCell : null),
      elements: [],
      meta: {},
    };
  }

  function setStarterWorldCell(world, cellX, cellY, value) {
    if (!world || !Array.isArray(world.grid)) return;
    const offsetX = Number.isFinite(world.offsetX) ? world.offsetX : 0;
    const offsetY = Number.isFinite(world.offsetY) ? world.offsetY : 0;
    const lx = cellX - offsetX;
    const ly = cellY - offsetY;
    if (ly < 0 || lx < 0 || ly >= world.grid.length) return;
    if (!Array.isArray(world.grid[ly]) || lx >= world.grid[ly].length) return;
    world.grid[ly][lx] = value;
  }

  function createBlankStarterWorld(world) {
    const next = deepClone(world || {});
    const cols = Number.isFinite(next.cols) ? next.cols : 30;
    const rows = Number.isFinite(next.rows) ? next.rows : 20;
    const offsetX = Number.isFinite(next.offsetX) ? next.offsetX : 0;
    const offsetY = Number.isFinite(next.offsetY) ? next.offsetY : 0;
    const centerCellX = offsetX + Math.floor(cols / 2);
    const floorLocalY = Math.min(rows - 1, Math.max(1, rows - 4));
    const floorCellY = offsetY + floorLocalY;

    for (let cellX = centerCellX - 6; cellX <= centerCellX + 6; cellX += 1) {
      setStarterWorldCell(next, cellX, floorCellY, "solid");
    }
    for (let cellX = centerCellX - 10; cellX <= centerCellX - 6; cellX += 1) {
      setStarterWorldCell(next, cellX, floorCellY - 3, "solid");
    }
    for (let cellX = centerCellX + 5; cellX <= centerCellX + 9; cellX += 1) {
      setStarterWorldCell(next, cellX, floorCellY - 5, "solid");
    }

    return next;
  }

  function createBlankStarterPlayer(world) {
    const cols = Number.isFinite(world && world.cols) ? world.cols : 30;
    const rows = Number.isFinite(world && world.rows) ? world.rows : 20;
    const offsetX = Number.isFinite(world && world.offsetX) ? world.offsetX : 0;
    const offsetY = Number.isFinite(world && world.offsetY) ? world.offsetY : 0;
    const centerCellX = offsetX + Math.floor(cols / 2);
    const floorLocalY = Math.min(rows - 1, Math.max(1, rows - 4));
    const floorCellY = offsetY + floorLocalY;
    const player = createGameObject("Player", (centerCellX * 24) - 14, (floorCellY * 24) - 36, {
      type: "player",
      color: "#f59e0b",
    });
    if (player.components && player.components.Sprite) {
      player.components.Sprite.width = 28;
      player.components.Sprite.height = 36;
    }
    if (player.components && player.components.Collider) {
      player.components.Collider.width = 28;
      player.components.Collider.height = 36;
    }
    return player;
  }

  function createScene(id, name, world, objects, options) {
    const opts = options || {};
    const sceneId = id || DEFAULT_SCENE_ID;
    const sceneWorld = world || createDefaultWorld(30, 20, null);
    const sceneObjects = ensureSceneObjects(sceneId, sceneWorld, objects, opts.lighting);
    return {
      id: sceneId,
      name: name || "Main Scene",
      renderMode: normalizeRenderMode(opts.renderMode, DEFAULT_RENDER_MODE),
      world: sceneWorld,
      objects: sceneObjects,
    };
  }

  function normalizeScene(scene, index, fallbackWorld, fallbackObjects) {
    const source = scene && typeof scene === "object" ? scene : {};
    const sceneId = source.id || (index === 0 ? DEFAULT_SCENE_ID : "scene_" + index);
    const sceneWorld = source.world && typeof source.world === "object"
      ? source.world
      : (fallbackWorld && typeof fallbackWorld === "object" ? fallbackWorld : createDefaultWorld(30, 20, null));
    const sceneObjects = ensureSceneObjects(
      sceneId,
      sceneWorld,
      Array.isArray(source.objects) ? source.objects : fallbackObjects,
      source.lighting
    );
    const normalized = {
      ...deepClone(source),
      id: sceneId,
      name: source.name || (index === 0 ? "Main Scene" : "Scene " + (index + 1)),
      renderMode: normalizeRenderMode(source.renderMode, DEFAULT_RENDER_MODE),
      world: sceneWorld,
      objects: sceneObjects,
    };
    delete normalized.lighting;
    return normalized;
  }

  function normalizeProjectScenes(project) {
    const source = project && typeof project === "object" ? project : {};
    const fallbackWorld = source.world && typeof source.world === "object"
      ? source.world
      : createDefaultWorld(30, 20, null);
    const fallbackObjects = Array.isArray(source.objects) ? source.objects : [];
    const projectRenderMode = normalizeRenderMode(source.meta && source.meta.renderMode, DEFAULT_RENDER_MODE);
    let scenes = [];

    if (Array.isArray(source.scenes) && source.scenes.length > 0) {
      scenes = source.scenes.map(function mapScene(scene, index) {
        const normalized = normalizeScene(scene, index, fallbackWorld, fallbackObjects);
        normalized.renderMode = normalizeRenderMode(scene && scene.renderMode, projectRenderMode);
        return normalized;
      });
    } else {
      scenes = [
        createScene(source.activeSceneId || DEFAULT_SCENE_ID, "Main Scene", fallbackWorld, fallbackObjects, { renderMode: projectRenderMode }),
      ];
    }

    const activeScene = scenes.find(function findScene(scene) {
      return scene && scene.id === source.activeSceneId;
    }) || scenes[0];

    source.scenes = scenes;
    source.activeSceneId = activeScene ? activeScene.id : DEFAULT_SCENE_ID;
    source.world = activeScene ? activeScene.world : fallbackWorld;
    source.objects = activeScene ? activeScene.objects : fallbackObjects;

    return source;
  }

  function validateWorld(world, prefix, errors) {
    if (!world || typeof world !== "object") {
      errors.push(prefix + " must be an object");
      return;
    }
    if (typeof world.cols !== "number" || world.cols < 1) {
      errors.push(prefix + ".cols must be a positive number");
    }
    if (typeof world.rows !== "number" || world.rows < 1) {
      errors.push(prefix + ".rows must be a positive number");
    }
    if (!Array.isArray(world.grid)) {
      errors.push(prefix + ".grid must be an array");
    }
  }

  function createDefaultProject(options) {
    const opts = options || {};
    const defaultWorld = createBlankStarterWorld(createDefaultWorld(opts.cols || 30, opts.rows || 20, opts.defaultCell));
    const defaultObjects = [createBlankStarterPlayer(defaultWorld)];
    const defaultRenderMode = normalizeRenderMode(opts.renderMode, DEFAULT_RENDER_MODE);
    const defaultScene = createScene(opts.sceneId || DEFAULT_SCENE_ID, opts.sceneName || "Main Scene", defaultWorld, defaultObjects, {
      renderMode: defaultRenderMode,
    });
    return {
      schemaVersion: CURRENT_VERSION,
      meta: {
        name: opts.name || "Untitled Project",
        version: "1.0.0",
        resolution: { width: opts.width || 960, height: opts.height || 540 },
        engineVersion: "0.1.0",
        renderMode: defaultRenderMode,
      },
      world: defaultScene.world,
      objects: defaultScene.objects,
      scenes: [defaultScene],
      activeSceneId: defaultScene.id,
      animations: [],
      scripts: [],
      assets: [],
      build: {
        profile: "web-prod",
        pwa: false,
      },
      settings: {
        preferredEditor: "vscode",
        editorCommand: "",
        editorArgs: [],
        autoSaveScripts: true,
        formatOnSave: false,
        confirmBeforeScriptDelete: true,
      },
    };
  }

  function createDefaultGrid(cols, rows, defaultCell) {
    const grid = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        row.push(defaultCell !== undefined ? JSON.parse(JSON.stringify(defaultCell)) : null);
      }
      grid.push(row);
    }
    return grid;
  }

  function validate(project) {
    const errors = [];
    if (!project || typeof project !== "object") {
      return { valid: false, errors: ["Project must be an object"] };
    }
    if (project.schemaVersion !== CURRENT_VERSION) {
      errors.push("schemaVersion must be " + CURRENT_VERSION);
    }
    if (!project.meta || typeof project.meta !== "object") {
      errors.push("meta is required and must be an object");
    } else {
      if (typeof project.meta.name !== "string") errors.push("meta.name must be a string");
      if (!project.meta.resolution || typeof project.meta.resolution.width !== "number") {
        errors.push("meta.resolution.width must be a number");
      }
      if (!project.meta.resolution || typeof project.meta.resolution.height !== "number") {
        errors.push("meta.resolution.height must be a number");
      }
    }

    validateWorld(project.world, "world", errors);

    if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
      errors.push("scenes must be a non-empty array");
    } else {
      project.scenes.forEach(function validateScene(scene, index) {
        if (!scene || typeof scene !== "object") {
          errors.push("scenes[" + index + "] must be an object");
          return;
        }
        if (typeof scene.id !== "string" || !scene.id) {
          errors.push("scenes[" + index + "].id must be a non-empty string");
        }
        if (typeof scene.name !== "string" || !scene.name) {
          errors.push("scenes[" + index + "].name must be a non-empty string");
        }
        if (typeof scene.renderMode !== "string" || !scene.renderMode) {
          errors.push("scenes[" + index + "].renderMode must be a non-empty string");
        } else if (scene.renderMode !== "2d" && scene.renderMode !== "webgl-3d") {
          errors.push("scenes[" + index + "].renderMode must be \"2d\" or \"webgl-3d\"");
        }
        if (scene.lighting !== undefined && (typeof scene.lighting !== "object" || scene.lighting === null || Array.isArray(scene.lighting))) {
          errors.push("scenes[" + index + "].lighting must be an object when provided");
        }
        validateWorld(scene.world, "scenes[" + index + "].world", errors);
        if (!Array.isArray(scene.objects)) {
          errors.push("scenes[" + index + "].objects must be an array");
        }
      });
      if (typeof project.activeSceneId !== "string" || !project.activeSceneId) {
        errors.push("activeSceneId must be a non-empty string");
      } else if (!project.scenes.some(function hasActiveScene(scene) { return scene && scene.id === project.activeSceneId; })) {
        errors.push("activeSceneId must reference an existing scene");
      }
    }

    if (!Array.isArray(project.objects)) errors.push("objects must be an array");
    if (!Array.isArray(project.animations)) errors.push("animations must be an array");
    if (!Array.isArray(project.scripts)) errors.push("scripts must be an array");
    if (!Array.isArray(project.assets)) errors.push("assets must be an array");
    if (!project.build || typeof project.build !== "object") {
      errors.push("build is required and must be an object");
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function migrate(data) {
    if (!data || typeof data !== "object") {
      return createDefaultProject();
    }
    if (data.schemaVersion === CURRENT_VERSION) {
      return normalizeProjectScenes(deepClone(data));
    }

    // Wrap legacy or missing-version data into v1
    const project = createDefaultProject({
      name: (data.meta && data.meta.name) || "Migrated Project",
    });

    // Preserve world data if it looks like serialized worldSpace
    if (data.world && typeof data.world.cols === "number") {
      project.world = deepClone(data.world);
    } else if (data.cols && data.grid) {
      // Raw worldSpace serialization at top level
      project.world = {
        cols: data.cols,
        rows: data.rows,
        defaultCell: data.defaultCell !== undefined ? data.defaultCell : null,
        grid: data.grid,
        elements: data.elements || [],
        meta: data.meta || {},
      };
    }

    if (typeof data.activeSceneId === "string" && data.activeSceneId) project.activeSceneId = data.activeSceneId;
    if (Array.isArray(data.objects)) project.objects = deepClone(data.objects);
    if (Array.isArray(data.scenes) && data.scenes.length > 0) {
      project.scenes = deepClone(data.scenes);
    } else {
      project.scenes = [createScene(project.activeSceneId || DEFAULT_SCENE_ID, "Main Scene", project.world, project.objects, {
        renderMode: normalizeRenderMode(data.meta && data.meta.renderMode, DEFAULT_RENDER_MODE),
      })];
    }
    if (Array.isArray(data.animations)) project.animations = deepClone(data.animations);
    if (Array.isArray(data.scripts)) project.scripts = deepClone(data.scripts);
    if (Array.isArray(data.assets)) project.assets = deepClone(data.assets);
    if (data.build && typeof data.build === "object") project.build = deepClone(data.build);
    if (data.settings && typeof data.settings === "object") {
      project.settings = {
        ...project.settings,
        ...deepClone(data.settings),
      };
    }

    project.schemaVersion = CURRENT_VERSION;
    return normalizeProjectScenes(project);
  }

  // Generate a unique ID for objects, scripts, animations
  let _idCounter = 0;
  function generateId(prefix) {
    _idCounter++;
    return (prefix || "id") + "_" + Date.now().toString(36) + "_" + _idCounter;
  }

  function createGameObject(name, x, y, options) {
    const opts = options || {};
    const type = opts.type || "generic";
    const isAudioType = type === "audio_source" || type === "music_source";
    const isLightType = type === "light";
    const isLightingManagerType = type === "lighting_manager";
    return {
      id: opts.id || generateId("obj"),
      name: name || "Object",
      type,
      x: x || 0,
      y: y || 0,
      components: {
        Transform: { x: x || 0, y: y || 0, rotation: 0, scaleX: 1, scaleY: 1 },
        Grid: { cols: opts.cols || 10, rows: opts.rows || 10, cellSize: opts.cellSize || 24, visible: true, layerId: null },
        Sprite: {
          assetId: null,
          color: opts.color || (isLightingManagerType ? "#60a5fa" : (isLightType ? "#fbbf24" : "#4ade80")),
          width: opts.width || (isLightingManagerType ? 20 : (isLightType ? 18 : 32)),
          height: opts.height || (isLightingManagerType ? 20 : (isLightType ? 18 : 32)),
        },
        Collider: {
          shape: isLightType ? "circle" : "rect",
          width: opts.width || (isLightingManagerType ? 20 : (isLightType ? 18 : 32)),
          height: opts.height || (isLightingManagerType ? 20 : (isLightType ? 18 : 32)),
        },
        Collision: { enabled: !isLightType && !isLightingManagerType, isTrigger: false },
        RigidBody: { enabled: false, weight: 1, friction: 0.4 },
        Render: { layerId: isLightType || isLightingManagerType ? "obj-fx" : "obj-main", visible: !isLightingManagerType, zIndex: 0 },
        ScriptBinding: { scriptId: null },
        ScriptBindings: [],
        Animator: { clipId: null, autoplay: false },
        ...(isLightingManagerType ? {
            LightingManager: {
              ...deepClone(DEFAULT_LIGHTING_MANAGER_COMPONENT),
              ...(opts.lightingManager && typeof opts.lightingManager === "object" ? deepClone(opts.lightingManager) : {}),
            },
          }
          : {}),
        ...(isLightType ? {
            Light: {
              ...deepClone(DEFAULT_LIGHT_COMPONENT),
              ...(opts.light && typeof opts.light === "object" ? deepClone(opts.light) : {}),
            },
          }
          : {}),
        ...(isAudioType
          ? {
              Sound: {
                assetId: null,
                category: type === "music_source" ? "music" : "sfx",
                autoplay: type === "music_source",
                loop: type === "music_source",
                volume: 1,
                maxDistance: type === "music_source" ? 0 : 320,
              },
            }
          : {}),
      },
    };
  }

  function createScript(name, source, options) {
    const opts = options || {};
    const lang = opts.language || 'javascript';
    const ext = lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang === 'lua' ? 'lua' : lang === 'python' ? 'py' : lang === 'css' ? 'css' : 'js';
    const safeName = (name || 'NewScript').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const defaultSource = lang === 'css'
      ? "/* Loaded when bound to an active component */\n#ui-root {\n  pointer-events: none;\n}\n"
      : "function onInit(self, engine) {\n  // Called once when the game starts\n}\n\nfunction onUpdate(self, engine, dt) {\n  // Called every frame\n}\n";
    return {
      id: opts.id || generateId("script"),
      name: name || "NewScript",
      filePath: opts.filePath || `scripts/${safeName}.${ext}`,
      language: lang,
      source: source || defaultSource,
    };
  }

  function getScriptFileName(script) {
    if (script.filePath) return script.filePath;
    const lang = script.language || 'javascript';
    const ext = lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang === 'lua' ? 'lua' : lang === 'python' ? 'py' : lang === 'css' ? 'css' : 'js';
    const safeName = (script.name || 'NewScript').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `scripts/${safeName}.${ext}`;
  }

  function createAnimationClip(name, options) {
    const opts = options || {};
    return {
      id: generateId("anim"),
      name: name || "NewClip",
      duration: opts.duration || 1.0,
      loop: opts.loop !== false,
      tracks: [],
    };
  }

  return {
    CURRENT_VERSION: CURRENT_VERSION,
    createDefaultProject: createDefaultProject,
    validate: validate,
    migrate: migrate,
    createScene: createScene,
    generateId: generateId,
    createGameObject: createGameObject,
    createScript: createScript,
    getScriptFileName: getScriptFileName,
    createAnimationClip: createAnimationClip,
    DEFAULT_SCENE_LIGHTING: DEFAULT_SCENE_LIGHTING,
    DEFAULT_LIGHTING_MANAGER_COMPONENT: DEFAULT_LIGHTING_MANAGER_COMPONENT,
    DEFAULT_LIGHT_COMPONENT: DEFAULT_LIGHT_COMPONENT,
  };
});
