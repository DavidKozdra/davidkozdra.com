(function initWorldMapping3dLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorldMapping3dApi() {
  "use strict";

  const EPSILON = 1e-6;

  function number(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeMappingOptions(options) {
    const source = options || {};
    const uniformScale = number(source.scale, 1) || 1;
    return {
      origin: {
        x: number(source.origin?.x),
        y: number(source.origin?.y),
        z: number(source.origin?.z),
      },
      scaleX: (number(source.scaleX, uniformScale) || uniformScale) * (source.flipX ? -1 : 1),
      scaleY: (number(source.scaleY, uniformScale) || uniformScale) * (source.flipY ? -1 : 1),
      elevationScale: number(source.elevationScale, uniformScale) || uniformScale,
      groundHeight: number(source.groundHeight),
    };
  }

  // Default convention for top-down simulations: game (x,y) becomes 3D (x,z),
  // while 3D y is elevation.
  function worldToThree(point, options) {
    const mapping = normalizeMappingOptions(options);
    const height = number(options?.height ?? point?.height ?? point?.elevation);
    return {
      x: mapping.origin.x + number(point?.x) * mapping.scaleX,
      y: mapping.origin.y + mapping.groundHeight + height * mapping.elevationScale,
      z: mapping.origin.z + number(point?.y) * mapping.scaleY,
    };
  }

  function threeToWorld(point, options) {
    const mapping = normalizeMappingOptions(options);
    return {
      x: (number(point?.x) - mapping.origin.x) / mapping.scaleX,
      y: (number(point?.z) - mapping.origin.z) / mapping.scaleY,
      height: (number(point?.y) - mapping.origin.y - mapping.groundHeight) / mapping.elevationScale,
    };
  }

  function normalizeVector2(vector) {
    const x = number(vector?.x);
    const y = number(vector?.y);
    const magnitude = Math.hypot(x, y);
    return magnitude > EPSILON ? { x: x / magnitude, y: y / magnitude } : { x: 0, y: 0 };
  }

  function normalizeVector3(vector) {
    const x = number(vector?.x);
    const y = number(vector?.y);
    const z = number(vector?.z);
    const magnitude = Math.hypot(x, y, z);
    return magnitude > EPSILON
      ? { x: x / magnitude, y: y / magnitude, z: z / magnitude }
      : { x: 0, y: 0, z: 0 };
  }

  function worldDirectionToThree(direction, options) {
    const mapping = normalizeMappingOptions(options);
    const result = {
      x: number(direction?.x) * mapping.scaleX,
      y: number(direction?.height ?? direction?.elevation) * mapping.elevationScale,
      z: number(direction?.y) * mapping.scaleY,
    };
    return options?.normalize === false ? result : normalizeVector3(result);
  }

  function threeDirectionToWorld(direction, options) {
    const mapping = normalizeMappingOptions(options);
    const result = {
      x: number(direction?.x) / mapping.scaleX,
      y: number(direction?.z) / mapping.scaleY,
      height: number(direction?.y) / mapping.elevationScale,
    };
    if (options?.normalize === false) return result;
    const normalized = normalizeVector2(result);
    return { ...normalized, height: result.height };
  }

  function worldAngleToYaw(angle, options) {
    const direction = worldDirectionToThree({
      x: Math.cos(number(angle)),
      y: Math.sin(number(angle)),
    }, options);
    return Math.atan2(direction.z, direction.x);
  }

  function yawToWorldAngle(yaw, options) {
    const direction = threeDirectionToWorld({
      x: Math.cos(number(yaw)),
      y: 0,
      z: Math.sin(number(yaw)),
    }, options);
    return Math.atan2(direction.y, direction.x);
  }

  function normalizeViewport(viewport, fallbackWidth = 1, fallbackHeight = 1) {
    return {
      x: number(viewport?.x),
      y: number(viewport?.y),
      width: Math.max(1, number(viewport?.width, fallbackWidth)),
      height: Math.max(1, number(viewport?.height, fallbackHeight)),
    };
  }

  function canvasToViewportNdc(x, y, viewport) {
    const bounds = normalizeViewport(viewport);
    return {
      x: ((number(x) - bounds.x) / bounds.width) * 2 - 1,
      y: 1 - ((number(y) - bounds.y) / bounds.height) * 2,
    };
  }

  function canvasToNdc(x, y, width, height) {
    return canvasToViewportNdc(x, y, { x: 0, y: 0, width, height });
  }

  function ndcToCanvas(x, y, viewport) {
    const bounds = normalizeViewport(viewport);
    return {
      x: bounds.x + (number(x) * 0.5 + 0.5) * bounds.width,
      y: bounds.y + (-number(y) * 0.5 + 0.5) * bounds.height,
    };
  }

  function intersectRayWithPlane(origin, direction, plane) {
    const rayOrigin = {
      x: number(origin?.x),
      y: number(origin?.y),
      z: number(origin?.z),
    };
    // Preserve the caller's ray parameterization. Three.js supplies normalized
    // directions, while deterministic tests and other backends may not.
    const rayDirection = {
      x: number(direction?.x),
      y: number(direction?.y),
      z: number(direction?.z),
    };
    const planePoint = {
      x: number(plane?.point?.x),
      y: number(plane?.point?.y),
      z: number(plane?.point?.z),
    };
    const planeNormal = normalizeVector3(plane?.normal || { x: 0, y: 1, z: 0 });
    const denominator = rayDirection.x * planeNormal.x
      + rayDirection.y * planeNormal.y
      + rayDirection.z * planeNormal.z;
    if (Math.abs(denominator) < EPSILON) return null;
    const distance = (
      (planePoint.x - rayOrigin.x) * planeNormal.x
      + (planePoint.y - rayOrigin.y) * planeNormal.y
      + (planePoint.z - rayOrigin.z) * planeNormal.z
    ) / denominator;
    if ((!plane?.allowBehind && distance < 0) || !Number.isFinite(distance)) return null;
    return {
      x: rayOrigin.x + rayDirection.x * distance,
      y: rayOrigin.y + rayDirection.y * distance,
      z: rayOrigin.z + rayDirection.z * distance,
      distance,
    };
  }

  function intersectRayWithGround(origin, direction, groundHeight = 0) {
    return intersectRayWithPlane(origin, direction, {
      point: { x: 0, y: number(groundHeight), z: 0 },
      normal: { x: 0, y: 1, z: 0 },
    });
  }

  function splitViewport(canvasWidth, canvasHeight, slotIndex = 0, slotCount = 1) {
    const layout = createViewportLayout(canvasWidth, canvasHeight, slotCount);
    const index = Math.max(0, Math.min(layout.length - 1, Math.trunc(number(slotIndex))));
    const { x, y, width, height } = layout[index];
    return { x, y, width, height };
  }

  function createViewportLayout(canvasWidth, canvasHeight, slotCount = 1, options) {
    const width = Math.max(1, number(canvasWidth, 1));
    const height = Math.max(1, number(canvasHeight, 1));
    const count = Math.max(1, Math.trunc(number(slotCount, 1)));
    const columns = count === 1 ? 1 : count <= 4 ? 2 : Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const viewWidth = width / columns;
    const viewHeight = height / rows;
    const coordinateSpace = options?.coordinateSpace === "webgl" ? "webgl" : "canvas";
    return Array.from({ length: count }, (_, slotIndex) => {
      const column = slotIndex % columns;
      const rowFromTop = Math.floor(slotIndex / columns);
      const canvasY = rowFromTop * viewHeight;
      return {
        slotIndex,
        x: column * viewWidth,
        y: coordinateSpace === "webgl" ? height - canvasY - viewHeight : canvasY,
        width: viewWidth,
        height: viewHeight,
        aspect: viewWidth / viewHeight,
        row: rowFromTop,
        column,
      };
    });
  }

  function findViewportAtCanvasPoint(x, y, layout) {
    return (layout || []).find(viewport => (
      number(x) >= viewport.x
      && number(x) < viewport.x + viewport.width
      && number(y) >= viewport.y
      && number(y) < viewport.y + viewport.height
    )) || null;
  }

  function clampWorldPointToRoom(point, room, options) {
    const inset = Math.max(0, number(options?.inset));
    const radius = Math.max(0, number(options?.radius));
    const minX = number(room?.x) + inset + radius;
    const minY = number(room?.y) + inset + radius;
    const maxX = number(room?.x) + Math.max(0, number(room?.width ?? room?.w)) - inset - radius;
    const maxY = number(room?.y) + Math.max(0, number(room?.height ?? room?.h)) - inset - radius;
    return {
      ...point,
      x: Math.max(Math.min(minX, maxX), Math.min(Math.max(minX, maxX), number(point?.x))),
      y: Math.max(Math.min(minY, maxY), Math.min(Math.max(minY, maxY), number(point?.y))),
    };
  }

  function projectWorldPoint(point, projectNdc, options) {
    if (typeof projectNdc !== "function") throw new TypeError("projectWorldPoint requires a projection callback");
    const threePoint = worldToThree(point, options);
    const clip = projectNdc(threePoint);
    const canvas = ndcToCanvas(clip?.x, clip?.y, options?.viewport);
    const depth = number(clip?.z, 2);
    return {
      ...canvas,
      depth,
      behind: depth > 1,
      visible: depth >= -1 && depth <= 1
        && number(clip?.x) >= -1 && number(clip?.x) <= 1
        && number(clip?.y) >= -1 && number(clip?.y) <= 1,
      threePoint,
    };
  }

  function unprojectCanvasToWorld(x, y, createRay, options) {
    if (typeof createRay !== "function") throw new TypeError("unprojectCanvasToWorld requires a ray callback");
    const ndc = canvasToViewportNdc(x, y, options?.viewport);
    const ray = createRay(ndc);
    const hit = intersectRayWithPlane(ray?.origin, ray?.direction, options?.plane || {
      point: { x: 0, y: number(options?.groundHeight), z: 0 },
      normal: { x: 0, y: 1, z: 0 },
    });
    return hit ? { ...threeToWorld(hit, options), distance: hit.distance, ndc } : null;
  }

  return {
    EPSILON,
    normalizeMappingOptions,
    normalizeVector2,
    normalizeVector3,
    worldToThree,
    threeToWorld,
    worldDirectionToThree,
    threeDirectionToWorld,
    worldAngleToYaw,
    yawToWorldAngle,
    normalizeViewport,
    canvasToNdc,
    canvasToViewportNdc,
    ndcToCanvas,
    intersectRayWithPlane,
    intersectRayWithGround,
    splitViewport,
    createViewportLayout,
    findViewportAtCanvasPoint,
    clampWorldPointToRoom,
    projectWorldPoint,
    unprojectCanvasToWorld,
  };
});
