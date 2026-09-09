(function initSoundRegistryLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSoundRegistryApi() {
  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function quantizeVolume(value, steps = 20) {
    const clamped = clamp(value, 0, 1);
    const count = Math.max(1, Number(steps) || 20);
    return Math.round(clamped * count) / count;
  }

  function computePositionalVolume(distance, maxDistance) {
    const dist = Math.max(0, Number(distance) || 0);
    const maxDist = Math.max(0.0001, Number(maxDistance) || 1);
    return clamp(1 - (dist / maxDist), 0, 1);
  }

  function buildRepeatedSources(path, variants = 21) {
    const count = Math.max(1, Number(variants) || 21);
    return Array.from({ length: count }, () => path);
  }

  function createSoundRegistry() {
    const sounds = new Map();
    return {
      register(id, config = {}) {
        const key = String(id || "");
        if (!key) throw new Error("Sound id is required");
        const paths = Array.isArray(config.paths)
          ? config.paths.map((path) => String(path || "")).filter(Boolean)
          : [];
        const fallbackPath = String(config.path || "");
        if (!paths.length && fallbackPath) paths.push(fallbackPath);
        sounds.set(key, {
          id: key,
          path: paths[0] || fallbackPath,
          paths,
          volume: clamp(config.volume ?? 1, 0, 1),
          // Mix priority (0..1): drives voice stealing and music ducking in the
          // mixerSystem. lowCutHz is the per-sound high-pass corner; null means
          // "use the mixer default".
          priority: clamp(config.priority ?? 0.5, 0, 1),
          mixDb: clamp(config.mixDb ?? 0, -60, 24),
          duckMusicGain: config.duckMusicGain == null
            ? null
            : clamp(config.duckMusicGain, 0, 1),
          lowCutHz: config.lowCutHz == null ? null : clamp(config.lowCutHz, 0, 20000),
          variants: buildRepeatedSources(paths[0] || fallbackPath, config.variants || 21),
        });
        return sounds.get(key);
      },
      get(id) {
        return sounds.get(String(id || "")) || null;
      },
      list() {
        return Array.from(sounds.values());
      },
      clear() {
        sounds.clear();
      },
    };
  }

  return {
    clamp,
    quantizeVolume,
    computePositionalVolume,
    buildRepeatedSources,
    createSoundRegistry,
  };
});
