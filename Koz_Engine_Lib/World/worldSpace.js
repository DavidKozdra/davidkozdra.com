(function initWorldSpaceLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorldSpaceApi() {
/**
 * World space utilities for grid management.
 * Provides functions for creating and manipulating game world grids.
 */
function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === "[object Object]";
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isPlainObject(value)) {
      const out = {};
      for (const key of Object.keys(value)) out[key] = cloneValue(value[key]);
      return out;
    }
    return value;
  }

  function normalizeSize(value, fallback) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function normalizeCoord(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : 0;
  }

  function makeCellFactory(defaultCell) {
    if (typeof defaultCell === "function") {
      return function cellFactory(x, y) {
        return cloneValue(defaultCell(x, y));
      };
    }

    return function cellFactory() {
      return cloneValue(defaultCell);
    };
  }

  function createGrid(cols, rows, defaultCell) {
    const cellFactory = makeCellFactory(defaultCell);
    const grid = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        row.push(cellFactory(x, y));
      }
      grid.push(row);
    }
    return grid;
  }

  function normalizeElement(input, fallbackId) {
    const source = cloneValue(input || {});
    const next = source;
    next.id = Number.isFinite(Number(source.id)) ? Number(source.id) : fallbackId;
    next.kind = String(source.kind || "element");
    next.x = normalizeCoord(source.x);
    next.y = normalizeCoord(source.y);
    return next;
  }

  function createWorldSpace(options) {
    const opts = options || {};
    let cols = normalizeSize(opts.cols, 1);
    let rows = normalizeSize(opts.rows, 1);
    let offsetX = normalizeCoord(opts.offsetX);
    let offsetY = normalizeCoord(opts.offsetY);
    let defaultCell = opts.defaultCell !== undefined ? opts.defaultCell : null;
    let grid = createGrid(cols, rows, defaultCell);
    let elements = [];
    let nextElementId = 1;
    const meta = cloneValue(opts.meta || {});

    // --- Performance indexes ---
    const _idIndex = new Map();       // id -> element
    const _posIndex = new Map();      // "x,y" -> element[]

    function _posKey(x, y) { return x + "," + y; }

    function _indexAdd(el) {
      _idIndex.set(el.id, el);
      const pk = _posKey(el.x, el.y);
      let arr = _posIndex.get(pk);
      if (!arr) { arr = []; _posIndex.set(pk, arr); }
      arr.push(el);
    }

    function _indexRemove(el) {
      _idIndex.delete(el.id);
      const pk = _posKey(el.x, el.y);
      const arr = _posIndex.get(pk);
      if (arr) {
        const idx = arr.indexOf(el);
        if (idx !== -1) arr.splice(idx, 1);
        if (arr.length === 0) _posIndex.delete(pk);
      }
    }

    function _indexMove(el, oldX, oldY) {
      const oldPk = _posKey(oldX, oldY);
      const arr = _posIndex.get(oldPk);
      if (arr) {
        const idx = arr.indexOf(el);
        if (idx !== -1) arr.splice(idx, 1);
        if (arr.length === 0) _posIndex.delete(oldPk);
      }
      const newPk = _posKey(el.x, el.y);
      let newArr = _posIndex.get(newPk);
      if (!newArr) { newArr = []; _posIndex.set(newPk, newArr); }
      newArr.push(el);
    }

    function _rebuildIndexes() {
      _idIndex.clear();
      _posIndex.clear();
      for (const el of elements) _indexAdd(el);
    }

    function inBounds(x, y) {
      return x >= offsetX && x < offsetX + cols && y >= offsetY && y < offsetY + rows;
    }

    function getCell(x, y) {
      if (!inBounds(x, y)) return undefined;
      return grid[y - offsetY][x - offsetX];
    }

    function setCell(x, y, value) {
      if (!inBounds(x, y)) return false;
      grid[y - offsetY][x - offsetX] = cloneValue(value);
      return true;
    }

    function fillCells(value) {
      const nextFactory = makeCellFactory(value);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          grid[y][x] = nextFactory(x + offsetX, y + offsetY);
        }
      }
      defaultCell = value;
      return grid;
    }

    function resize(nextCols, nextRows, resizeOptions) {
      const sizeOpts = resizeOptions || {};
      const targetCols = normalizeSize(nextCols, cols);
      const targetRows = normalizeSize(nextRows, rows);
      const nextDefaultCell = sizeOpts.defaultCell !== undefined ? sizeOpts.defaultCell : defaultCell;
      const nextGrid = createGrid(targetCols, targetRows, nextDefaultCell);

      for (let y = 0; y < Math.min(rows, targetRows); y++) {
        for (let x = 0; x < Math.min(cols, targetCols); x++) {
          nextGrid[y][x] = cloneValue(grid[y][x]);
        }
      }

      const removedElements = [];
      const keptElements = [];
      for (const element of elements) {
        if (element.x >= offsetX && element.x < offsetX + targetCols && element.y >= offsetY && element.y < offsetY + targetRows) {
          keptElements.push(element);
        } else {
          removedElements.push(cloneValue(element));
        }
      }

      cols = targetCols;
      rows = targetRows;
      defaultCell = nextDefaultCell;
      grid = nextGrid;
      elements = keptElements;
      return { removedElements: removedElements };
    }

    function listElements(filterOrKind) {
      if (typeof filterOrKind === "function") {
        return elements.filter(filterOrKind);
      }
      if (typeof filterOrKind === "string" && filterOrKind) {
        return elements.filter(function byKind(element) {
          return element.kind === filterOrKind;
        });
      }
      return elements.slice();
    }

    function indexOfElement(id) {
      const targetId = Number(id);
      const el = _idIndex.get(targetId);
      if (!el) return -1;
      return elements.indexOf(el);
    }

    function findElementById(id) {
      return _idIndex.get(Number(id)) || null;
    }

    function findElementAt(x, y, filterOrKind) {
      const arr = _posIndex.get(_posKey(x, y));
      if (!arr || arr.length === 0) return null;
      if (!filterOrKind) return arr[0];
      if (typeof filterOrKind === "string") {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].kind === filterOrKind) return arr[i];
        }
        return null;
      }
      if (typeof filterOrKind === "function") {
        for (let i = 0; i < arr.length; i++) {
          if (filterOrKind(arr[i])) return arr[i];
        }
        return null;
      }
      return null;
    }

    function addElement(input, addOptions) {
      const opts = addOptions || {};
      const element = normalizeElement(input, nextElementId);
      if (element.id >= nextElementId) nextElementId = element.id + 1;
      const rawIndex = Math.floor(Number(opts.index));
      const index = Number.isFinite(rawIndex)
        ? Math.max(0, Math.min(elements.length, rawIndex))
        : elements.length;
      elements.splice(index, 0, element);
      _indexAdd(element);
      return element;
    }

    function updateElement(id, patch) {
      const current = findElementById(id);
      if (!current) return null;
      const oldX = current.x, oldY = current.y;
      const nextPatch = cloneValue(patch || {});
      const next = Object.assign(current, nextPatch);
      next.x = normalizeCoord(next.x);
      next.y = normalizeCoord(next.y);
      next.kind = String(next.kind || "element");
      if (next.x !== oldX || next.y !== oldY) _indexMove(next, oldX, oldY);
      return next;
    }

    function replaceElement(id, snapshot) {
      const old = findElementById(id);
      if (!old) return null;
      const idx = elements.indexOf(old);
      _indexRemove(old);
      const replacement = normalizeElement(snapshot, Number(id));
      if (replacement.id >= nextElementId) nextElementId = replacement.id + 1;
      elements[idx] = replacement;
      _indexAdd(replacement);
      return replacement;
    }

    function removeElementById(id) {
      const el = findElementById(id);
      if (!el) return null;
      _indexRemove(el);
      const idx = elements.indexOf(el);
      return elements.splice(idx, 1)[0] || null;
    }

    function clearElements(filterOrKind) {
      if (!filterOrKind) {
        const removed = elements.slice();
        elements = [];
        _idIndex.clear();
        _posIndex.clear();
        return removed;
      }

      const removed = [];
      const kept = [];
      for (const element of elements) {
        const matches = typeof filterOrKind === "function"
          ? filterOrKind(element)
          : element.kind === filterOrKind;
        if (matches) {
          _indexRemove(element);
          removed.push(element);
        } else {
          kept.push(element);
        }
      }
      elements = kept;
      return removed;
    }

    function replaceState(snapshot) {
      const source = snapshot || {};
      cols = normalizeSize(source.cols, cols);
      rows = normalizeSize(source.rows, rows);
      if (Number.isFinite(Number(source.offsetX))) offsetX = normalizeCoord(source.offsetX);
      if (Number.isFinite(Number(source.offsetY))) offsetY = normalizeCoord(source.offsetY);
      defaultCell = source.defaultCell !== undefined ? source.defaultCell : defaultCell;
      grid = createGrid(cols, rows, defaultCell);

      if (Array.isArray(source.grid)) {
        for (let y = 0; y < Math.min(rows, source.grid.length); y++) {
          const row = Array.isArray(source.grid[y]) ? source.grid[y] : [];
          for (let x = 0; x < Math.min(cols, row.length); x++) {
            grid[y][x] = cloneValue(row[x]);
          }
        }
      }

      elements = [];
      nextElementId = 1;
      _idIndex.clear();
      _posIndex.clear();
      if (Array.isArray(source.elements)) {
        source.elements.forEach(function restoreElement(element, index) {
          addElement(element, { index: index });
        });
      }
    }

    function serialize() {
      return {
        cols: cols,
        rows: rows,
        offsetX: offsetX,
        offsetY: offsetY,
        defaultCell: cloneValue(defaultCell),
        grid: cloneValue(grid),
        elements: cloneValue(elements),
        meta: cloneValue(meta),
      };
    }

    return {
      get cols() { return cols; },
      get rows() { return rows; },
      get offsetX() { return offsetX; },
      get offsetY() { return offsetY; },
      get grid() { return grid; },
      get meta() { return meta; },
      inBounds: inBounds,
      getCell: getCell,
      setCell: setCell,
      fillCells: fillCells,
      resize: resize,
      listElements: listElements,
      findElementById: findElementById,
      findElementAt: findElementAt,
      addElement: addElement,
      updateElement: updateElement,
      replaceElement: replaceElement,
      removeElementById: removeElementById,
      clearElements: clearElements,
      replaceState: replaceState,
      serialize: serialize,
    };
  }

  return {
    cloneValue: cloneValue,
    createGrid: createGrid,
    createWorldSpace: createWorldSpace,
    gridToWorld: function gridToWorld(gridX, gridY, cellSize, transform) {
      const t = transform || {};
      const x = gridX * (t.scaleX || 1) * cellSize + (t.x || 0);
      const y = gridY * (t.scaleY || 1) * cellSize + (t.y || 0);
      const rotation = (t.rotation || 0) * Math.PI / 180;
      if (rotation !== 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        return { x: rx, y: ry };
      }
      return { x, y };
    },
    worldToGrid: function worldToGrid(worldX, worldY, cellSize, transform) {
      const t = transform || {};
      const rotation = -((t.rotation || 0) * Math.PI / 180);
      let x = worldX - (t.x || 0);
      let y = worldY - (t.y || 0);
      if (rotation !== 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        x = rx;
        y = ry;
      }
      const sx = t.scaleX || 1;
      const sy = t.scaleY || 1;
      return { 
        gridX: Math.floor(x / (sx * cellSize)), 
        gridY: Math.floor(y / (sy * cellSize)) 
      };
    },
  };
});
