(function initFrameProfilerLib(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFrameProfilerApi() {
  'use strict';

  /**
   * Per-phase frame timing.
   *
   * A frame budget is only actionable once you know which phase spent it, so
   * this accumulates wall time per named phase and reports a rolling window.
   *
   * Two properties matter for a profiler that ships inside the frame loop:
   *
   * - Disabled must be nearly free. `enabled === false` makes begin()/end()
   *   an immediate return, so the instrumentation can stay on the hot path
   *   permanently rather than being commented in and out.
   * - It reports the worst frame, not just the mean. A 90ms hitch once a
   *   second is what a player feels, and an average over 60 frames buries it.
   *
   * Phases may nest (render > drawGore). Self time is tracked alongside total
   * so a parent's own cost is visible separately from its children's.
   */
  class FrameProfiler {
    constructor({ now = null, windowMs = 500, enabled = false } = {}) {
      this.now = now || (() => (typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now()));
      this.windowMs = windowMs;
      this.enabled = !!enabled;
      this.phases = new Map();
      this.stack = [];
      this.frames = 0;
      this.elapsed = 0;
      this.report = { frames: 0, fps: 0, phases: [] };
    }

    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (!this.enabled) this.reset();
    }

    reset() {
      this.phases.clear();
      this.stack.length = 0;
      this.frames = 0;
      this.elapsed = 0;
      this.report = { frames: 0, fps: 0, phases: [] };
    }

    slot(name) {
      let entry = this.phases.get(name);
      if (!entry) {
        entry = { name, total: 0, self: 0, calls: 0, worst: 0, childTime: 0, openAt: 0, depth: 0 };
        this.phases.set(name, entry);
      }
      return entry;
    }

    begin(name) {
      if (!this.enabled) return;
      const entry = this.slot(name);
      // Re-entrant phases (a phase that calls itself) would otherwise clobber
      // openAt and report a wildly short duration; count depth and time only
      // the outermost span.
      if (entry.depth++ === 0) {
        entry.openAt = this.now();
        entry.childTime = 0;
      }
      this.stack.push(entry);
    }

    end(name) {
      if (!this.enabled) return;
      const entry = this.phases.get(name);
      if (!entry || entry.depth === 0) return;
      if (--entry.depth > 0) {
        this.stack.pop();
        return;
      }
      const duration = this.now() - entry.openAt;
      entry.total += duration;
      entry.self += duration - entry.childTime;
      entry.calls++;
      if (duration > entry.worst) entry.worst = duration;

      this.stack.pop();
      // Attribute this span to the enclosing phase so the parent's self time
      // excludes it.
      const parent = this.stack[this.stack.length - 1];
      if (parent) parent.childTime += duration;
    }

    /** Time a function call as `name`. Returns the callee's value. */
    measure(name, fn) {
      if (!this.enabled) return fn();
      this.begin(name);
      try {
        return fn();
      } finally {
        this.end(name);
      }
    }

    /**
     * Close the frame. `frameMs` is the real (unclamped) frame delta so the
     * report's fps and the phase percentages describe the same interval.
     */
    endFrame(frameMs) {
      if (!this.enabled) return null;
      // A phase left open by an early return would leak into the next frame.
      for (const entry of this.phases.values()) {
        entry.depth = 0;
        entry.childTime = 0;
      }
      this.stack.length = 0;

      this.frames++;
      this.elapsed += frameMs;
      if (this.elapsed < this.windowMs) return null;

      const frames = this.frames;
      const phases = [...this.phases.values()]
        .map((entry) => ({
          name: entry.name,
          msPerFrame: entry.total / frames,
          selfMsPerFrame: entry.self / frames,
          worstMs: entry.worst,
          callsPerFrame: entry.calls / frames,
        }))
        .sort((a, b) => b.selfMsPerFrame - a.selfMsPerFrame);

      this.report = {
        frames,
        fps: frames * 1000 / this.elapsed,
        frameMsAvg: this.elapsed / frames,
        phases,
      };

      for (const entry of this.phases.values()) {
        entry.total = 0;
        entry.self = 0;
        entry.calls = 0;
        entry.worst = 0;
      }
      this.frames = 0;
      this.elapsed = 0;
      return this.report;
    }

    /** Rows for an overlay: the heaviest phases by self time. */
    topPhases(limit = 6) {
      return this.report.phases.slice(0, limit);
    }
  }

  return { FrameProfiler };
});
