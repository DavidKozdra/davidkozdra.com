(function initStagedAcquisitionLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createStagedAcquisitionApi() {
  function computeStageCosts(input) {
    const baseValue = Number(input && input.baseValue) || 0;
    const baseFloor = Number(input && input.baseFloor) || 0;
    const stages = Array.isArray(input && input.stages) ? input.stages : [];
    const base = Math.max(baseFloor, Math.floor(baseValue));

    const out = {};
    for (const s of stages) {
      if (!s || !s.key) continue;
      const raw = Math.floor(base * (Number(s.ratio) || 0));
      const min = Number(s.min) || 0;
      const max = Number.isFinite(Number(s.max)) ? Number(s.max) : Infinity;
      out[s.key] = Math.min(max, Math.max(min, raw));
    }
    return out;
  }

  function resolveCurrentStage(input) {
    const stages = Array.isArray(input && input.stages) ? input.stages : [];
    const completedSet = new Set(Array.isArray(input && input.completedKeys) ? input.completedKeys : []);
    const isComplete = !!(input && input.forceComplete);

    if (isComplete || stages.length === 0) {
      return { key: "complete", index: stages.length, completedCount: stages.length, total: stages.length };
    }

    for (let i = 0; i < stages.length; i++) {
      const key = stages[i];
      if (!completedSet.has(key)) {
        return { key, index: i, completedCount: i, total: stages.length };
      }
    }

    return { key: "complete", index: stages.length, completedCount: stages.length, total: stages.length };
  }

  return {
    computeStageCosts,
    resolveCurrentStage,
  };
});
