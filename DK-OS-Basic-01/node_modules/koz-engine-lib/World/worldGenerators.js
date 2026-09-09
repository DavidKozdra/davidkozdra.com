(function initWorldGeneratorsLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorldGeneratorsApi() {
  function normalizeSize(value, fallback) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function createField(cols, rows, sample) {
    const width = normalizeSize(cols, 1);
    const height = normalizeSize(rows, 1);
    const sampler = typeof sample === "function" ? sample : function fallbackSample() { return 0; };
    const field = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        row.push(Number(sampler(x, y, width, height)) || 0);
      }
      field.push(row);
    }
    return field;
  }

  function smoothField(field, passes) {
    const count = Math.max(0, Math.floor(Number(passes)) || 0);
    let current = Array.isArray(field) ? field.map(function cloneRow(row) { return row.slice(); }) : [];

    for (let pass = 0; pass < count; pass++) {
      const next = [];
      for (let y = 0; y < current.length; y++) {
        const row = [];
        for (let x = 0; x < (current[y] || []).length; x++) {
          let sum = 0;
          let seen = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny < 0 || ny >= current.length || nx < 0 || nx >= current[ny].length) continue;
              sum += Number(current[ny][nx]) || 0;
              seen++;
            }
          }
          row.push(seen > 0 ? sum / seen : 0);
        }
        next.push(row);
      }
      current = next;
    }

    return current;
  }

  function normalizeField(field) {
    let min = Infinity;
    let max = -Infinity;
    for (const row of field || []) {
      for (const value of row || []) {
        const n = Number(value) || 0;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return (field || []).map(function zeroRow(row) {
        return (row || []).map(function zeroCell() { return 0; });
      });
    }

    const range = max - min;
    return (field || []).map(function normalizeRow(row) {
      return (row || []).map(function normalizeCell(value) {
        return ((Number(value) || 0) - min) / range;
      });
    });
  }

  function classifyField(field, classifier) {
    const resolve = typeof classifier === "function"
      ? classifier
      : function fallbackClassifier(value) { return value; };

    return (field || []).map(function classifyRow(row, y) {
      return (row || []).map(function classifyCell(value, x) {
        return resolve(value, x, y);
      });
    });
  }

  function buildWorldCells(cols, rows, config) {
    const opts = config || {};
    const baseField = createField(cols, rows, opts.sample);
    const smoothed = smoothField(baseField, opts.smoothingPasses || 0);
    const normalized = normalizeField(smoothed);
    return classifyField(normalized, opts.classify);
  }

  return {
    createField: createField,
    smoothField: smoothField,
    normalizeField: normalizeField,
    classifyField: classifyField,
    buildWorldCells: buildWorldCells,
  };
});
