(function initProjectAdaptersLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectAdaptersApi() {
  const DEFAULT_SCENE_ID = "scene_main";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createFallbackScene(project) {
    const source = project && typeof project === "object" ? project : {};
    return {
      id: source.activeSceneId || DEFAULT_SCENE_ID,
      name: "Main Scene",
      world: source.world && typeof source.world === "object" ? source.world : { cols: 30, rows: 20, defaultCell: null, grid: [], elements: [], meta: {} },
      objects: Array.isArray(source.objects) ? source.objects : [],
    };
  }

  function resolveActiveScene(project) {
    if (!project || typeof project !== "object") return null;
    const scenes = Array.isArray(project.scenes) ? project.scenes : [];
    if (scenes.length === 0) return createFallbackScene(project);
    return scenes.find(function byId(scene) {
      return scene && scene.id === project.activeSceneId;
    }) || scenes[0];
  }

  function getActiveWorldData(project) {
    const scene = resolveActiveScene(project);
    if (scene && scene.world && typeof scene.world === "object") return scene.world;
    return project && project.world && typeof project.world === "object" ? project.world : { cols: 30, rows: 20, defaultCell: null, grid: [], elements: [], meta: {} };
  }

  function getActiveObjects(project) {
    const scene = resolveActiveScene(project);
    if (scene && Array.isArray(scene.objects)) return scene.objects;
    return project && Array.isArray(project.objects) ? project.objects : [];
  }

  /**
   * Convert a worldSpace instance to the project.world format.
   * @param {Object} worldSpace - A worldSpace instance (has .serialize())
   * @returns {Object} Serialized world data for project.json
   */
  function worldSpaceToProject(worldSpace) {
    return worldSpace.serialize();
  }

  /**
   * Load project.world data into a worldSpace instance.
   * @param {Function} createWorldSpace - Factory from worldSpace.js
   * @param {Object} worldData - project.world from project.json
   * @returns {Object} A live worldSpace instance
   */
  function projectToWorldSpace(createWorldSpace, worldData) {
    const source = worldData && typeof worldData === "object" ? worldData : { cols: 30, rows: 20, defaultCell: null, grid: [], elements: [], meta: {} };
    const ws = createWorldSpace({
      cols: source.cols,
      rows: source.rows,
      offsetX: source.offsetX || 0,
      offsetY: source.offsetY || 0,
      defaultCell: source.defaultCell,
    });
    ws.replaceState(source);
    return ws;
  }

  /**
   * Convert project.objects into runtime GameObject instances.
   * @param {Function} GameObjectCtor - GameObject class
   * @param {Array} objects - project.objects array
   * @returns {Array} Array of GameObject instances
   */
  function projectToGameObjects(GameObjectCtor, objects, prefabs) {
    if (!Array.isArray(objects)) return [];
    const prefabById = new Map((Array.isArray(prefabs) ? prefabs : []).map(function toPrefabEntry(prefab) {
      return [prefab.id, prefab];
    }));
    return objects.map(function toGameObject(obj) {
      const transform = (obj.components && obj.components.Transform) || {};
      const sprite = (obj.components && obj.components.Sprite) || {};
      const collider = (obj.components && obj.components.Collider) || {};
      const prefab = obj && obj.prefabId ? prefabById.get(obj.prefabId) : null;
      return new GameObjectCtor(obj.type || "generic", transform.x || obj.x || 0, transform.y || obj.y || 0, {
        id: obj.id,
        shape: collider.shape || "rect",
        width: collider.width || sprite.width || 32,
        height: collider.height || sprite.height || 32,
        rotation: transform.rotation || 0,
        scaleX: transform.scaleX || 1,
        scaleY: transform.scaleY || 1,
        meta: {
          name: obj.name,
          prefabId: obj.prefabId || null,
          prefabName: prefab && prefab.name ? prefab.name : null,
          sourceObjectId: prefab && prefab.sourceObjectId ? prefab.sourceObjectId : null,
          components: clone(obj.components || {}),
        },
      });
    });
  }

  /**
   * Convert a runtime GameObject back to project object format.
   * @param {Object} gameObject - A GameObject instance
   * @returns {Object} project.objects entry
   */
  function gameObjectToProject(gameObject) {
    const components = (gameObject.meta && gameObject.meta.components) || {};
    const existingTransform = components.Transform || {};
    return {
      id: gameObject.id,
      name: (gameObject.meta && gameObject.meta.name) || gameObject.type,
      type: gameObject.type,
      x: gameObject.x,
      y: gameObject.y,
      components: {
        Transform: { 
          x: gameObject.x, 
          y: gameObject.y, 
          rotation: gameObject.rotation !== undefined ? gameObject.rotation : (existingTransform.rotation || 0),
          scaleX: gameObject.scaleX !== undefined ? gameObject.scaleX : (existingTransform.scaleX || 1),
          scaleY: gameObject.scaleY !== undefined ? gameObject.scaleY : (existingTransform.scaleY || 1),
        },
        Sprite: components.Sprite || { assetId: null, color: "#4ade80", width: 32, height: 32 },
        Collider: components.Collider || { shape: gameObject.shape, width: gameObject.width, height: gameObject.height },
        ScriptBinding: components.ScriptBinding || { scriptId: null },
        ScriptBindings: components.ScriptBindings || [],
        Animator: components.Animator || { clipId: null },
      },
    };
  }

  return {
    worldSpaceToProject: worldSpaceToProject,
    resolveActiveScene: resolveActiveScene,
    getActiveWorldData: getActiveWorldData,
    getActiveObjects: getActiveObjects,
    projectToWorldSpace: projectToWorldSpace,
    projectToGameObjects: projectToGameObjects,
    gameObjectToProject: gameObjectToProject,
  };
});
