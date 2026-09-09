(function initGameObjectLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameObjectApi() {
  let nextObjectId = 1;

  function clampNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  class GameObject {
    /**
     * @param {string} type
     * @param {number} x
     * @param {number} y
     * @param {Object} [options]
     * @param {"rect"|"circle"} [options.shape]
     * @param {number} [options.width]
     * @param {number} [options.height]
     * @param {number} [options.radius]
     * @param {string[]|Set<string>} [options.tags]
     */
    constructor(type, x, y, options) {
      const opts = options || {};
      this.id = opts.id || `go_${nextObjectId++}`;
      this.type = String(type || "generic");
      this.x = clampNumber(x, 0);
      this.y = clampNumber(y, 0);
      this.rotation = clampNumber(opts.rotation, 0);
      this.scaleX = clampNumber(opts.scaleX, 1);
      this.scaleY = clampNumber(opts.scaleY, 1);
      this.shape = opts.shape === "circle" ? "circle" : "rect";
      this.width = clampNumber(opts.width, 0);
      this.height = clampNumber(opts.height, 0);
      this.radius = clampNumber(opts.radius, 0);
      this.tags = normalizeTags(opts.tags);
      this.active = opts.active !== false;
      this.meta = opts.meta && typeof opts.meta === "object" ? opts.meta : {};
    }

    onCollision(other) {}

    draw() {}

    update() {}

    hasTag(tag) {
      return this.tags.has(tag);
    }

    addTag(tag) {
      if (typeof tag === "string" && tag) this.tags.add(tag);
      return this;
    }

    removeTag(tag) {
      this.tags.delete(tag);
      return this;
    }

    setRect(width, height) {
      this.shape = "rect";
      this.width = Math.max(0, clampNumber(width, 0));
      this.height = Math.max(0, clampNumber(height, 0));
      return this;
    }

    setCircle(radius) {
      this.shape = "circle";
      this.radius = Math.max(0, clampNumber(radius, 0));
      return this;
    }
  }

  function normalizeTags(tags) {
    if (tags instanceof Set) return new Set(tags);
    if (Array.isArray(tags)) return new Set(tags.filter((tag) => typeof tag === "string" && tag));
    return new Set();
  }

  function isRectObject(obj) {
    if (!obj) return false;
    if (obj.shape === "rect") return true;
    return Number.isFinite(obj.width) && Number.isFinite(obj.height);
  }

  function isCircleObject(obj) {
    if (!obj) return false;
    if (obj.shape === "circle") return true;
    return Number.isFinite(obj.radius);
  }

  function squareCollidesSquare(obj1, obj2) {
    const left1 = obj1.x;
    const right1 = obj1.x + obj1.width;
    const top1 = obj1.y;
    const bottom1 = obj1.y + obj1.height;

    const left2 = obj2.x;
    const right2 = obj2.x + obj2.width;
    const top2 = obj2.y;
    const bottom2 = obj2.y + obj2.height;

    return !(left1 > right2 || right1 < left2 || top1 > bottom2 || bottom1 < top2);
  }

  function circleCollidesCircle(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = obj1.radius + obj2.radius;
    return distanceSq < radiusSum * radiusSum;
  }

  function squareCollidesCircle(square, circle) {
    const circleDistanceX = Math.abs(circle.x - square.x - square.width / 2);
    const circleDistanceY = Math.abs(circle.y - square.y - square.height / 2);

    if (circleDistanceX > square.width / 2 + circle.radius) return false;
    if (circleDistanceY > square.height / 2 + circle.radius) return false;

    if (circleDistanceX <= square.width / 2) return true;
    if (circleDistanceY <= square.height / 2) return true;

    const cornerDistanceSq =
      (circleDistanceX - square.width / 2) ** 2 + (circleDistanceY - square.height / 2) ** 2;

    return cornerDistanceSq <= circle.radius ** 2;
  }

  function hasTagPair(obj1, obj2, pair) {
    if (!pair) return true;
    const a = typeof pair.a === "string" ? pair.a : "";
    const b = typeof pair.b === "string" ? pair.b : "";
    if (!a || !b) return false;
    const o1 = obj1 && obj1.tags instanceof Set ? obj1.tags : null;
    const o2 = obj2 && obj2.tags instanceof Set ? obj2.tags : null;
    if (!o1 || !o2) return false;
    return (o1.has(a) && o2.has(b)) || (o1.has(b) && o2.has(a));
  }

  function normalizeTagPairs(tagPairs) {
    if (!Array.isArray(tagPairs)) return [];
    const pairs = [];
    for (const pair of tagPairs) {
      if (Array.isArray(pair) && pair.length >= 2) {
        pairs.push({ a: pair[0], b: pair[1] });
      } else if (pair && typeof pair === "object") {
        pairs.push({ a: pair.a, b: pair.b });
      }
    }
    return pairs.filter((pair) => typeof pair.a === "string" && typeof pair.b === "string");
  }

  function collides(obj1, obj2) {
    if (!obj1 || !obj2) return false;
    if (obj1.active === false || obj2.active === false) return false;

    const obj1IsRect = isRectObject(obj1);
    const obj2IsRect = isRectObject(obj2);
    const obj1IsCircle = isCircleObject(obj1);
    const obj2IsCircle = isCircleObject(obj2);

    if (obj1IsRect && obj2IsRect) return squareCollidesSquare(obj1, obj2);
    if (obj1IsCircle && obj2IsCircle) return circleCollidesCircle(obj1, obj2);
    if (obj1IsRect && obj2IsCircle) return squareCollidesCircle(obj1, obj2);
    if (obj1IsCircle && obj2IsRect) return squareCollidesCircle(obj2, obj1);
    return false;
  }

  // --- Spatial hash for broadphase collision ---
  const _bhCellSize = 128;
  const _bhCells = new Map();

  function _bhKey(x, y) {
    return ((x >> 7) * 73856093) ^ ((y >> 7) * 19349669);
  }

  function _bhKeysForAABB(obj) {
    let minX, minY, maxX, maxY;
    if (obj.shape === "circle") {
      minX = (obj.x - obj.radius) | 0;
      minY = (obj.y - obj.radius) | 0;
      maxX = (obj.x + obj.radius) | 0;
      maxY = (obj.y + obj.radius) | 0;
    } else {
      minX = obj.x | 0;
      minY = obj.y | 0;
      maxX = (obj.x + (obj.width || 0)) | 0;
      maxY = (obj.y + (obj.height || 0)) | 0;
    }
    const keys = [];
    const cx0 = minX >> 7, cy0 = minY >> 7;
    const cx1 = maxX >> 7, cy1 = maxY >> 7;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        keys.push((cx * 73856093) ^ (cy * 19349669));
      }
    }
    return keys;
  }

  /**
   * Finds collisions in a list of objects and optionally filters by tag pairs.
   * Uses spatial hashing for broadphase when object count exceeds threshold.
   * @param {Array<GameObject>} objects
   * @param {Object} [options]
   * @param {Array<{a:string,b:string}|[string,string]>} [options.tagPairs]
   * @param {boolean} [options.invokeCallbacks]
   * @returns {Array<{a: GameObject, b: GameObject}>}
   */
  function findCollisions(objects, options) {
    const opts = options || {};
    const list = Array.isArray(objects) ? objects : [];
    const tagPairs = normalizeTagPairs(opts.tagPairs);
    const invokeCallbacks = opts.invokeCallbacks !== false;
    const collisions = [];

    // Use spatial hash broadphase for large object counts
    if (list.length > 64) {
      _bhCells.clear();
      const activeList = [];

      // Insert into spatial hash
      for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (!obj || obj.active === false) continue;
        obj._bhIdx = activeList.length;
        activeList.push(obj);
        const keys = _bhKeysForAABB(obj);
        for (let k = 0; k < keys.length; k++) {
          const key = keys[k];
          let cell = _bhCells.get(key);
          if (!cell) { cell = []; _bhCells.set(key, cell); }
          cell.push(obj);
        }
      }

      // Check only within same cells, deduplicate with index comparison
      const checked = new Set();
      for (const cell of _bhCells.values()) {
        for (let i = 0; i < cell.length; i++) {
          const a = cell[i];
          for (let j = i + 1; j < cell.length; j++) {
            const b = cell[j];
            // Deduplicate: ensure lower index first
            const ai = a._bhIdx, bi = b._bhIdx;
            const pairKey = ai < bi ? (ai * 131072 + bi) : (bi * 131072 + ai);
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);
            if (!collides(a, b)) continue;
            if (tagPairs.length > 0 && !tagPairs.some((pair) => hasTagPair(a, b, pair))) continue;
            collisions.push({ a, b });
            if (invokeCallbacks) {
              if (typeof a.onCollision === "function") a.onCollision(b);
              if (typeof b.onCollision === "function") b.onCollision(a);
            }
          }
        }
      }
      return collisions;
    }

    // Small list: brute force (still fast for < 64 objects)
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a || a.active === false) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b || b.active === false) continue;
        if (!collides(a, b)) continue;
        if (tagPairs.length > 0 && !tagPairs.some((pair) => hasTagPair(a, b, pair))) continue;
        collisions.push({ a, b });
        if (invokeCallbacks) {
          if (typeof a.onCollision === "function") a.onCollision(b);
          if (typeof b.onCollision === "function") b.onCollision(a);
        }
      }
    }

    return collisions;
  }

  function tagCollides(obj1, obj2, tagA, tagB) {
    if (!collides(obj1, obj2)) return false;
    return hasTagPair(obj1, obj2, { a: tagA, b: tagB });
  }

  return {
    GameObject,
    collides,
    tagCollides,
    findCollisions,
    squareCollidesSquare,
    circleCollidesCircle,
    squareCollidesCircle,
  };
});
