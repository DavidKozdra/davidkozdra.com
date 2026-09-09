(function initWorldEditorLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorldEditorApi() {
  const worldSpaceLib = typeof require === "function" ? require("./worldSpace") : null;
  const createWorldSpace = worldSpaceLib && worldSpaceLib.createWorldSpace;
  const cloneValue = worldSpaceLib && worldSpaceLib.cloneValue
    ? worldSpaceLib.cloneValue
    : function fallbackClone(value) {
        if (Array.isArray(value)) return value.map(fallbackClone);
        if (value && Object.prototype.toString.call(value) === "[object Object]") {
          const out = {};
          for (const key of Object.keys(value)) out[key] = fallbackClone(value[key]);
          return out;
        }
        return value;
      };

  function createWorldEditor(options) {
    const opts = options || {};
    const world = opts.world || createWorldSpace(opts.worldOptions || {});
    const undoStack = [];
    const redoStack = [];
    let selection = null;
    let strokeMap = null;

    function pushAction(action) {
      undoStack.push(action);
      if (undoStack.length > 200) undoStack.shift();
      redoStack.length = 0;
    }

    function getSelection() {
      if (selection && !world.findElementById(selection.elementId)) selection = null;
      return selection ? cloneValue(selection) : null;
    }

    function getSelectedElement() {
      const active = getSelection();
      return active ? world.findElementById(active.elementId) : null;
    }

    function clearSelection() {
      selection = null;
      return null;
    }

    function selectElementById(id) {
      const element = world.findElementById(id);
      selection = element ? { kind: element.kind, elementId: element.id } : null;
      return element;
    }

    function selectElementAt(x, y, kindOrder) {
      if (Array.isArray(kindOrder)) {
        for (const kind of kindOrder) {
          const element = world.findElementAt(x, y, kind);
          if (element) return selectElementById(element.id);
        }
        selection = null;
        return null;
      }

      const element = world.findElementAt(x, y);
      selection = element ? { kind: element.kind, elementId: element.id } : null;
      return element;
    }

    function listElements(kind) {
      return world.listElements(kind);
    }

    function beginStroke() {
      if (!strokeMap) strokeMap = new Map();
    }

    function ensureStroke() {
      if (!strokeMap) beginStroke();
    }

    function applyCellChange(x, y, nextValue) {
      if (!world.inBounds(x, y)) return false;
      ensureStroke();
      const key = `${x},${y}`;
      const prevValue = world.getCell(x, y);
      if (prevValue === nextValue) return false;
      let change = strokeMap.get(key);
      if (!change) {
        change = { x: x, y: y, prev: cloneValue(prevValue), next: cloneValue(nextValue) };
        strokeMap.set(key, change);
      } else {
        change.next = cloneValue(nextValue);
      }
      world.setCell(x, y, nextValue);
      return true;
    }

    function paintArea(cx, cy, nextValue, paintOptions) {
      const opts = paintOptions || {};
      const radius = Math.max(0, Math.floor(Number(opts.radius !== undefined ? opts.radius : opts.brushSize - 1)) || 0);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          applyCellChange(cx + dx, cy + dy, nextValue);
        }
      }
    }

    function paintLine(x0, y0, x1, y1, nextValue, paintOptions) {
      let cx = x0;
      let cy = y0;
      const dx = Math.abs(x1 - x0);
      const sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0);
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;

      while (true) {
        paintArea(cx, cy, nextValue, paintOptions);
        if (cx === x1 && cy === y1) break;
        const e2 = err * 2;
        if (e2 >= dy) {
          err += dy;
          cx += sx;
        }
        if (e2 <= dx) {
          err += dx;
          cy += sy;
        }
      }
    }

    function endStroke() {
      if (!strokeMap || strokeMap.size === 0) {
        strokeMap = null;
        return false;
      }
      pushAction({
        type: "cells",
        changes: Array.from(strokeMap.values()).map(cloneValue),
      });
      strokeMap = null;
      return true;
    }

    function floodFill(startX, startY, nextValue) {
      if (!world.inBounds(startX, startY)) return false;
      const oldValue = world.getCell(startX, startY);
      if (oldValue === nextValue) return false;

      // Use typed array bit-set instead of Set<string> for visited tracking
      const cols = world.cols, rows = world.rows;
      const ox = world.offsetX, oy = world.offsetY;
      const totalCells = cols * rows;
      const visited = new Uint8Array(totalCells);
      const clonedOld = cloneValue(oldValue);
      const clonedNext = cloneValue(nextValue);

      // Reuse stack arrays to avoid [x,y] allocations — use flat int stack
      const stack = new Int32Array(totalCells * 2);
      let sp = 0;
      stack[sp++] = startX;
      stack[sp++] = startY;

      const changes = [];
      while (sp > 0) {
        const y = stack[--sp];
        const x = stack[--sp];
        if (!world.inBounds(x, y)) continue;
        const lx = x - ox, ly = y - oy;
        const idx = ly * cols + lx;
        if (visited[idx]) continue;
        visited[idx] = 1;
        if (world.getCell(x, y) !== oldValue) continue;
        changes.push({ x: x, y: y, prev: clonedOld, next: clonedNext });
        world.setCell(x, y, nextValue);
        stack[sp++] = x - 1; stack[sp++] = y;
        stack[sp++] = x + 1; stack[sp++] = y;
        stack[sp++] = x;     stack[sp++] = y - 1;
        stack[sp++] = x;     stack[sp++] = y + 1;
      }

      if (changes.length === 0) return false;
      pushAction({ type: "cells", changes: changes });
      return true;
    }

    function placeElement(kind, x, y, data, placeOptions) {
      const opts = placeOptions || {};
      if (!world.inBounds(x, y)) return { element: null, created: false };
      if (typeof opts.allowPlacement === "function" && !opts.allowPlacement(x, y, data || {})) {
        return { element: null, created: false };
      }

      if (opts.uniqueKindPerTile) {
        const existingOnTile = world.findElementAt(x, y, kind);
        if (existingOnTile) {
          if (opts.select !== false) selectElementById(existingOnTile.id);
          return { element: existingOnTile, created: false };
        }
      }

      if (opts.uniqueKind) {
        const existingOfKind = world.listElements(kind)[0] || null;
        if (existingOfKind) {
          const before = cloneValue(existingOfKind);
          const after = Object.assign({}, existingOfKind, cloneValue(data || {}), { x: x, y: y, kind: kind });
          world.replaceElement(existingOfKind.id, after);
          if (opts.select !== false) selectElementById(existingOfKind.id);
          pushAction({ type: "updateElement", before: before, after: cloneValue(after) });
          return { element: world.findElementById(existingOfKind.id), created: false };
        }
      }

      const element = world.addElement(Object.assign({}, cloneValue(data || {}), {
        kind: kind,
        x: x,
        y: y,
      }));
      if (opts.select !== false) selectElementById(element.id);
      pushAction({
        type: "addElement",
        element: cloneValue(element),
        index: world.listElements().findIndex(function byId(entry) { return entry.id === element.id; }),
      });
      return { element: element, created: true };
    }

    function updateElement(id, patch) {
      const current = world.findElementById(id);
      if (!current) return null;
      const before = cloneValue(current);
      const next = world.updateElement(id, patch);
      if (!next) return null;
      pushAction({ type: "updateElement", before: before, after: cloneValue(next) });
      return next;
    }

    function deleteSelection() {
      const current = getSelectedElement();
      if (!current) return null;
      const index = world.listElements().findIndex(function byId(entry) {
        return entry.id === current.id;
      });
      const removed = world.removeElementById(current.id);
      selection = null;
      if (!removed) return null;
      pushAction({ type: "removeElement", element: cloneValue(removed), index: index });
      return removed;
    }

    function applyAction(action, direction) {
      const isUndo = direction === "undo";
      switch (action.type) {
        case "cells":
          for (const change of action.changes) {
            world.setCell(change.x, change.y, isUndo ? change.prev : change.next);
          }
          break;
        case "addElement":
          if (isUndo) {
            world.removeElementById(action.element.id);
            if (selection && selection.elementId === action.element.id) selection = null;
          } else {
            world.addElement(action.element, { index: action.index });
          }
          break;
        case "removeElement":
          if (isUndo) {
            world.addElement(action.element, { index: action.index });
          } else {
            world.removeElementById(action.element.id);
            if (selection && selection.elementId === action.element.id) selection = null;
          }
          break;
        case "updateElement":
          world.replaceElement(action.before.id, isUndo ? action.before : action.after);
          break;
      }
    }

    function undo() {
      endStroke();
      const action = undoStack.pop();
      if (!action) return false;
      applyAction(action, "undo");
      redoStack.push(action);
      return true;
    }

    function redo() {
      const action = redoStack.pop();
      if (!action) return false;
      applyAction(action, "redo");
      undoStack.push(action);
      return true;
    }

    function clearHistory() {
      undoStack.length = 0;
      redoStack.length = 0;
      strokeMap = null;
    }

    return {
      world: world,
      listElements: listElements,
      getSelection: getSelection,
      getSelectedElement: getSelectedElement,
      clearSelection: clearSelection,
      selectElementById: selectElementById,
      selectElementAt: selectElementAt,
      beginStroke: beginStroke,
      paintArea: paintArea,
      paintLine: paintLine,
      endStroke: endStroke,
      floodFill: floodFill,
      placeElement: placeElement,
      updateElement: updateElement,
      deleteSelection: deleteSelection,
      undo: undo,
      redo: redo,
      clearHistory: clearHistory,
    };
  }

  return {
    createWorldEditor: createWorldEditor,
  };
});
