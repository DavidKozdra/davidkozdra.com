(function initMusicSystemLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createMusicSystemApi() {
  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0.5;
    return Math.max(0, Math.min(1, n));
  }

  function readStoredVolume(storage, key, fallback = 0.5) {
    try {
      const raw = storage && typeof storage.getItem === "function" ? storage.getItem(key) : null;
      if (raw == null) return clamp01(fallback);
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) return clamp01(fallback);
      return numeric > 1 ? clamp01(numeric / 100) : clamp01(numeric);
    } catch (_err) {
      return clamp01(fallback);
    }
  }

  function writeStoredVolume(storage, key, value) {
    const volume = clamp01(value);
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(key, String(volume));
    }
    return volume;
  }

  class MusicSystem {
    constructor(mainTrack, otherTracks = [], options = {}) {
      this.mainTrack = mainTrack || null;
      this.otherTracks = Array.isArray(otherTracks) ? otherTracks : [];
      this.current = null;
      this.storage = options.storage || null;
      this.storageKey = options.storageKey || "music_vol";
      this.audioContext = options.audioContext || null;
      this.random = typeof options.random === "function" ? options.random : Math.random;
      this.volume = readStoredVolume(this.storage, this.storageKey, options.defaultVolume ?? 0.5);
      this._applyVolume();
    }

    getVolume() {
      return this.volume;
    }

    setVolume(nextVolume) {
      this.volume = writeStoredVolume(this.storage, this.storageKey, nextVolume);
      this._applyVolume();
      return this.volume;
    }

    refreshVolumeFromStorage() {
      this.volume = readStoredVolume(this.storage, this.storageKey, this.volume);
      this._applyVolume();
      return this.volume;
    }

    async ensureAudioReady() {
      if (!this.audioContext || typeof this.audioContext.resume !== "function") return;
      if (this.audioContext.state && this.audioContext.state !== "running") {
        await this.audioContext.resume();
      }
    }

    async playMainTheme() {
      await this.ensureAudioReady();
      if (this.current === this.mainTrack && this._isPlaying(this.current)) return this.current;
      this._stopCurrent();
      this.current = this.mainTrack;
      this._configureTrack(this.current, { loop: true });
      return this.current;
    }

    async playRandom(chanceEmpty = 0) {
      await this.ensureAudioReady();
      if (this.otherTracks.includes(this.current) && this._isPlaying(this.current)) return this.current;
      if (this.random() * 100 < Number(chanceEmpty) || this.otherTracks.length === 0) {
        this.stop();
        return null;
      }
      const idx = Math.floor(this.random() * this.otherTracks.length);
      this._stopCurrent();
      this.current = this.otherTracks[idx];
      this._configureTrack(this.current, { loop: false });
      return this.current;
    }

    stop() {
      this._stopCurrent();
      this.current = null;
    }

    _applyVolume() {
      const tracks = [this.mainTrack, ...this.otherTracks];
      tracks.forEach((track) => {
        if (track && typeof track.setVolume === "function") {
          track.setVolume(this.volume);
        }
      });
    }

    _isPlaying(track) {
      return !!(track && typeof track.isPlaying === "function" && track.isPlaying());
    }

    _configureTrack(track, opts = {}) {
      if (!track) return;
      if (typeof track.setLoop === "function") track.setLoop(!!opts.loop);
      if (typeof track.setVolume === "function") track.setVolume(this.volume);
      if (typeof track.play === "function") track.play();
    }

    _stopCurrent() {
      if (this.current && this._isPlaying(this.current) && typeof this.current.stop === "function") {
        this.current.stop();
      }
    }
  }

  return {
    MusicSystem,
    clamp01,
    readStoredVolume,
    writeStoredVolume,
  };
});
