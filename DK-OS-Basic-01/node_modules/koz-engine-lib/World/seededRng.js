(function initSeededRngLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSeededRngApi() {
/**
 * Seeded random number generator for deterministic gameplay.
 * Provides reproducible random sequences for world generation and replays.
 */
const DEFAULT_NONZERO_SEED = 0x9e3779b9;

/**
 * FNV-1a hash function for string-to-number hashing.
 * @param {string} str - Input string
 * @returns {number} Hash value
 */
function fnv1a(str) {
    const text = String(str || "");
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

/**
 * A random stream with its own state, derived from a base seed.
 */
class SeededStream {
  /**
   * Creates a new SeededStream.
   * @param {number} seed - Base seed
   * @param {number} [state] - Initial state (defaults to seed)
   */
  constructor(seed, state) {
      this._seed = (seed >>> 0) || DEFAULT_NONZERO_SEED;
      this._state = (state !== undefined ? Number(state) : this._seed) >>> 0;
      if (this._state === 0) this._state = DEFAULT_NONZERO_SEED;
    }

    random() {
      /**
       * Returns a random float in [0, 1).
       * @returns {number} Random value
       */
      let state = this._state >>> 0;
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      this._state = (state >>> 0) || DEFAULT_NONZERO_SEED;
      return this._state / 4294967296;
    }

    int(min, max) {
      /**
       * Returns a random integer in [min, max].
       * @param {number} min - Minimum value
       * @param {number} max - Maximum value
       * @returns {number} Random integer
       */
      const lo = Math.floor(Math.min(min, max));
      const hi = Math.floor(Math.max(min, max));
      return lo + Math.floor(this.random() * (hi - lo + 1));
    }

    chance(probability) {
      /**
       * Returns true with given probability.
       * @param {number} probability - Probability [0, 1]
       * @returns {boolean} True if roll succeeds
       */
      return this.random() < probability;
    }

    pick(list) {
      /**
       * Returns a random element from a list.
       * @param {Array} list - Array to pick from
       * @returns {*} Random element
       */
      if (!Array.isArray(list) || list.length === 0) return undefined;
      return list[Math.floor(this.random() * list.length)];
    }

    shuffle(list) {
      /**
       * Returns a shuffled copy of the list (Fisher-Yates).
       * @param {Array} list - Array to shuffle
       * @returns {Array} New shuffled array
       */
      const out = Array.isArray(list) ? list.slice() : [];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    }

    getState() {
      /**
       * Gets the current RNG state for saving.
       * @returns {number} Current state
       */
      return this._state >>> 0;
    }

    setState(state) {
      /**
       * Restores RNG state from saved state.
       * @param {number} state - State to restore
       */
      this._state = Number(state) >>> 0;
      if (this._state === 0) this._state = DEFAULT_NONZERO_SEED;
    }
  }

  /**
   * Global RNG manager for seeded runs with multiple named streams.
   */
  const SeededRNG = {
    _baseSeed: 0,
    _streams: new Map(),
    _origMathRandom: null,
    _globalStreamName: "global",

    startRun(seed, opts = {}) {
      /**
       * Starts a new seeded run.
       * @param {number} seed - Base seed for the run
       * @param {Object} [opts] - Options
       * @param {boolean} [opts.installGlobalMathRandom=true] - Replace Math.random
       * @param {string} [opts.globalStreamName] - Stream name for Math.random
       */
      this._baseSeed = Number(seed) >>> 0;
      this._streams.clear();
      const installGlobal = opts.installGlobalMathRandom !== false;
      if (installGlobal) this.installGlobalMathRandom(opts.globalStreamName || "global");
      else this.uninstallGlobalMathRandom();
    },

    stream(name) {
      /**
       * Gets or creates a named random stream.
       * @param {string} [name='default'] - Stream name
       * @returns {SeededStream} The stream
       */
      const key = String(name || "default");
      let stream = this._streams.get(key);
      if (!stream) {
        const mixedSeed = (this._baseSeed ^ fnv1a(key) ^ 0x85ebca6b) >>> 0;
        stream = new SeededStream(mixedSeed);
        this._streams.set(key, stream);
      }
      return stream;
    },

    installGlobalMathRandom(streamName = "global") {
      /**
       * Replaces Math.random with a seeded version.
       * @param {string} [streamName='global'] - Stream to use
       */
      if (!this._origMathRandom) this._origMathRandom = Math.random;
      this._globalStreamName = String(streamName || "global");
      const self = this;
      Math.random = function seededMathRandom() {
        return self.stream(self._globalStreamName).random();
      };
    },

    uninstallGlobalMathRandom() {
      /**
       * Restores original Math.random.
       */
      if (this._origMathRandom) {
        Math.random = this._origMathRandom;
      }
    },

    isGlobalMathRandomInstalled() {
      /**
       * Checks if seeded Math.random is installed.
       * @returns {boolean} True if replaced
       */
      return !!this._origMathRandom && Math.random !== this._origMathRandom;
    },

    getState() {
      /**
       * Gets full RNG state for saving.
       * @returns {Object} State object
       */
      const streams = {};
      for (const [name, stream] of this._streams.entries()) {
        streams[name] = stream.getState();
      }
      return {
        baseSeed: this._baseSeed >>> 0,
        streams,
        globalMathRandom: {
          enabled: this.isGlobalMathRandomInstalled(),
          streamName: this._globalStreamName || "global",
        },
      };
    },

    setState(state) {
      /**
       * Restores RNG state from saved state.
       * @param {Object} state - Saved state
       */
      const payload = (state && typeof state === "object") ? state : {};
      this._baseSeed = Number(payload.baseSeed) >>> 0;
      this._streams.clear();
      const rawStreams = (payload.streams && typeof payload.streams === "object") ? payload.streams : {};
      for (const [name, streamState] of Object.entries(rawStreams)) {
        const key = String(name || "default");
        const mixedSeed = (this._baseSeed ^ fnv1a(key) ^ 0x85ebca6b) >>> 0;
        this._streams.set(key, new SeededStream(mixedSeed, streamState));
      }
      const globalMathRandom = (payload.globalMathRandom && typeof payload.globalMathRandom === "object")
        ? payload.globalMathRandom
        : {};
      if (globalMathRandom.enabled) this.installGlobalMathRandom(globalMathRandom.streamName || "global");
      else this.uninstallGlobalMathRandom();
    },
  };

  function namedRandom(seedRuntime, streamName) {
    if (!seedRuntime || typeof seedRuntime.stream !== "function") return Math.random();
    return seedRuntime.stream(streamName || "default").random();
  }

  return {
    DEFAULT_NONZERO_SEED,
    fnv1a,
    SeededStream,
    SeededRNG,
    namedRandom,
  };
});
