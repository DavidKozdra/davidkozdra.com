(function initMixerSystemLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMixerSystemApi() {
  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function dbToGain(db) {
    return Math.pow(10, clamp(db, -96, 24) / 20);
  }

  // Named priority tiers for sounds. Higher priority sounds win voice stealing
  // and (above DUCK_PRIORITY_THRESHOLD) push the music down while they play.
  const PRIORITY = {
    AMBIENT: 0.2,
    LOW: 0.35,
    NORMAL: 0.5,
    HIGH: 0.75,
    CRITICAL: 1,
  };

  // Sounds at or above this priority should duck the music under them.
  const DUCK_PRIORITY_THRESHOLD = 0.7;

  // Default high-pass corner for one-shot SFX. Cutting everything below ~90Hz
  // keeps sub rumble out from under the music bed so effects read clearly.
  const DEFAULT_LOW_CUT_HZ = 90;
  const CRITICAL_MUSIC_DUCK_GAIN = 0.8;

  // Music mood presets. `rate` is playback speed (with pitch following when the
  // player supports it), `gain` a music-level multiplier, `lowpassHz` an
  // optional darkening filter corner (null = filter open / bypassed).
  const MUSIC_MOODS = {
    normal: { rate: 1, gain: 1, lowpassHz: null },
    dark: { rate: 0.94, gain: 0.9, lowpassHz: 1400 },
    bright: { rate: 1.05, gain: 1, lowpassHz: null },
    slow: { rate: 0.82, gain: 0.92, lowpassHz: 2600 },
    tense: { rate: 1, gain: 0.85, lowpassHz: 1000 },
  };

  function resolveMood(name) {
    const key = String(name || "normal").toLowerCase();
    const mood = MUSIC_MOODS[key] || MUSIC_MOODS.normal;
    return { name: MUSIC_MOODS[key] ? key : "normal", ...mood };
  }

  function shouldDuckMusic(priority, threshold = DUCK_PRIORITY_THRESHOLD) {
    return clamp01(priority) >= clamp01(threshold);
  }

  // Priority-based fallback for callers that do not specify a duck depth.
  // Critical sounds reduce music by 20%; lower high-priority sounds scale
  // proportionally from the threshold.
  function duckGainForPriority(priority) {
    const p = clamp01(priority);
    if (!shouldDuckMusic(p)) return 1;
    const range = Math.max(0.0001, 1 - DUCK_PRIORITY_THRESHOLD);
    const strength = clamp01((p - DUCK_PRIORITY_THRESHOLD) / range);
    return 1 - ((1 - CRITICAL_MUSIC_DUCK_GAIN) * strength);
  }

  // Smoothed multi-source ducking envelope. Several callers can hold the music
  // down at once (a loud SFX, a dialogue hush); the deepest active target wins
  // and the level ramps linearly: full-scale dive in `attackMs`, recovery in
  // `releaseMs`. All methods take an explicit `now` (ms) so the controller is
  // deterministic and host-clock agnostic.
  function createDuckingController(options = {}) {
    const attackMs = Math.max(1, Number(options.attackMs) || 80);
    const releaseMs = Math.max(1, Number(options.releaseMs) || 600);
    const holds = new Map();
    let level = 1;
    let lastNow = null;

    function targetAt(now) {
      let target = 1;
      for (const [token, hold] of holds) {
        if (hold.until != null && now >= hold.until) {
          holds.delete(token);
          continue;
        }
        if (hold.gain < target) target = hold.gain;
      }
      return target;
    }

    return {
      // Hold the music at `gain` until release(token) is called.
      hold(token, gain, now = 0) {
        holds.set(String(token), { gain: clamp01(gain), until: null });
        if (lastNow == null) lastNow = now;
      },
      // Hold the music at `gain` for `holdMs`, then recover automatically.
      duckFor(token, gain, holdMs, now = 0) {
        holds.set(String(token), {
          gain: clamp01(gain),
          until: now + Math.max(0, Number(holdMs) || 0),
        });
        if (lastNow == null) lastNow = now;
      },
      release(token) {
        holds.delete(String(token));
      },
      // Advance the envelope to `now` and return the current music multiplier.
      update(now = 0) {
        if (lastNow == null) lastNow = now;
        const dt = Math.max(0, now - lastNow);
        lastNow = now;
        const target = targetAt(now);
        if (level > target) {
          level = Math.max(target, level - dt / attackMs);
        } else if (level < target) {
          level = Math.min(target, level + dt / releaseMs);
        }
        return level;
      },
      getLevel() {
        return level;
      },
      // True when fully recovered with nothing held — callers can stop ticking.
      isIdle(now = 0) {
        return targetAt(now) >= 1 && level >= 0.999;
      },
    };
  }

  // Priority voice allocator. Caps simultaneous voices globally and per sound
  // id; when full it steals the oldest same-sound voice first, then the lowest
  // priority voice overall — but never one louder than the incoming request.
  function createVoicePool(options = {}) {
    const maxVoices = Math.max(1, Number(options.maxVoices) || 16);
    const maxPerSound = Math.max(1, Number(options.maxPerSound) || 4);
    const voices = new Map();
    let seq = 0;

    function acquire(request = {}) {
      const soundId = String(request.soundId || "");
      const priority = clamp01(request.priority ?? PRIORITY.NORMAL);
      const now = Number(request.now) || 0;
      const evicted = [];

      const sameSound = Array.from(voices.values())
        .filter((voice) => voice.soundId === soundId)
        .sort((a, b) => a.startedAt - b.startedAt);
      if (sameSound.length >= maxPerSound) {
        voices.delete(sameSound[0].handle);
        evicted.push(sameSound[0]);
      }

      if (voices.size >= maxVoices) {
        const victim = Array.from(voices.values()).sort(
          (a, b) => a.priority - b.priority || a.startedAt - b.startedAt
        )[0];
        if (!victim || victim.priority > priority) {
          return { granted: false, voice: null, evicted };
        }
        voices.delete(victim.handle);
        evicted.push(victim);
      }

      seq += 1;
      const voice = { handle: seq, soundId, priority, startedAt: now };
      voices.set(voice.handle, voice);
      return { granted: true, voice, evicted };
    }

    return {
      acquire,
      release(voiceOrHandle) {
        const handle = typeof voiceOrHandle === "object" && voiceOrHandle
          ? voiceOrHandle.handle
          : voiceOrHandle;
        return voices.delete(handle);
      },
      activeCount() {
        return voices.size;
      },
      activeCountFor(soundId) {
        let count = 0;
        for (const voice of voices.values()) {
          if (voice.soundId === String(soundId)) count += 1;
        }
        return count;
      },
    };
  }

  // Builds a high-pass (low-cut) BiquadFilter for a one-shot chain. Returns
  // null when the context can't make one so callers can connect straight through.
  function createLowCutNode(audioContext, frequency = DEFAULT_LOW_CUT_HZ, q = 0.707) {
    if (!audioContext || typeof audioContext.createBiquadFilter !== "function") {
      return null;
    }
    const filter = audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = clamp(frequency, 10, 2000);
    filter.Q.value = clamp(q, 0.0001, 10);
    return filter;
  }

  return {
    PRIORITY,
    DUCK_PRIORITY_THRESHOLD,
    DEFAULT_LOW_CUT_HZ,
    CRITICAL_MUSIC_DUCK_GAIN,
    MUSIC_MOODS,
    dbToGain,
    resolveMood,
    shouldDuckMusic,
    duckGainForPriority,
    createDuckingController,
    createVoicePool,
    createLowCutNode,
  };
});
