(function initParticleSystemCoreLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createParticleSystemCoreApi() {
  class Particle {
    constructor() {
      this.alive = false;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.life = 0;
      this.maxLife = 0;
      this.size = 4;
      this.color = "#fff";
      this.alpha = 1;
      this.frame = null;
      this.screen = false;
      this.drag = 0.98;
      this.gravity = 0;
      this.tag = null;
    }
  }

  class ParticleSystemCore {
    constructor(options) {
      const opts = options || {};
      this.poolSize = Math.max(1, Number(opts.poolSize) || 2048);
      this.maxPoolSize = Math.max(this.poolSize, Number(opts.maxPoolSize) || 16384);
      this.random = typeof opts.random === "function" ? opts.random : Math.random;
      this.particles = new Array(this.poolSize);
      for (let i = 0; i < this.poolSize; i++) this.particles[i] = new Particle();
      // Free list for O(1) allocation without overwriting alive particles
      this._freeList = [];
      for (let i = this.poolSize - 1; i >= 0; i--) this._freeList.push(i);
      this._activeCount = 0;
      // Burst config reuse buffer to avoid Object.assign allocations
      this._burstCfg = {};
    }

    _alloc() {
      if (this._freeList.length > 0) {
        const idx = this._freeList.pop();
        return this.particles[idx];
      }
      // Pool exhausted: grow if under max
      if (this.poolSize < this.maxPoolSize) {
        const growBy = Math.min(this.poolSize, this.maxPoolSize - this.poolSize);
        const oldSize = this.poolSize;
        this.poolSize += growBy;
        for (let i = oldSize; i < this.poolSize; i++) {
          this.particles[i] = new Particle();
          if (i > oldSize) this._freeList.push(i);
        }
        return this.particles[oldSize];
      }
      // Hard cap reached: overwrite oldest alive particle (fallback)
      for (let i = 0; i < this.poolSize; i++) {
        if (this.particles[i].alive) {
          this.particles[i].alive = false;
          this._activeCount--;
          return this.particles[i];
        }
      }
      return this.particles[0];
    }

    spawn(x, y, opts) {
      const cfg = opts || {};
      const p = this._alloc();
      p.alive = true;
      this._activeCount++;
      p.x = x;
      p.y = y;
      p.vx = cfg.vx != null ? cfg.vx : ((this.random() - 0.5) * (cfg.spreadX || 60));
      p.vy = cfg.vy != null ? cfg.vy : ((this.random() - 0.5) * (cfg.spreadY || 60));
      p.maxLife = cfg.life || (300 + this.random() * 400);
      p.life = p.maxLife;
      p.size = cfg.size || (2 + this.random() * 6);
      p.color = cfg.color || "#fff";
      p.alpha = 1;
      p.frame = cfg.frame || null;
      p.screen = !!cfg.screen;
      p.drag = cfg.drag || 0.98;
      p.gravity = cfg.gravity || 0;
      p.tag = cfg.tag || null;
      return p;
    }

    spawnBurst(x, y, opts) {
      const cfg = opts || {};
      const count = cfg.count || 24;
      const bc = this._burstCfg;
      // Copy config once, reuse for all particles in burst
      for (const k in cfg) bc[k] = cfg[k];
      for (let i = 0; i < count; i++) {
        const angle = this.random() * Math.PI * 2;
        const speed = (cfg.speed || 80) * (0.3 + this.random());
        bc.vx = Math.cos(angle) * speed;
        bc.vy = Math.sin(angle) * speed;
        this.spawn(x, y, bc);
      }
      // Clean reuse buffer
      for (const k in bc) delete bc[k];
    }

    update(dtMs) {
      const dt = Number(dtMs) || 0;
      const dtSec = dt * 0.001;
      let active = 0;
      for (let i = 0; i < this.poolSize; i++) {
        const p = this.particles[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          this._freeList.push(i);
          continue;
        }
        active++;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity * dtSec;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.alpha = p.life / p.maxLife;
      }
      this._activeCount = active;
    }

    activeParticles() {
      const result = [];
      for (let i = 0; i < this.poolSize; i++) {
        if (this.particles[i].alive) result.push(this.particles[i]);
      }
      return result;
    }

    activeCount() {
      return this._activeCount;
    }

    /**
     * Retire particles until the requested active ceiling is met. Callers can
     * nominate cheap-to-lose particles first (for example, off-screen FX)
     * without giving up the O(1) free-list allocation path.
     */
    trim(maxActive, discardFirst) {
      let excess = this._activeCount - Math.max(0, Number(maxActive) || 0);
      if (excess <= 0) return 0;

      const discard = typeof discardFirst === "function" ? discardFirst : null;
      const retire = (onlyPreferred) => {
        for (let i = 0; i < this.poolSize && excess > 0; i++) {
          const p = this.particles[i];
          if (!p.alive || (onlyPreferred && discard && !discard(p))) continue;
          p.alive = false;
          this._freeList.push(i);
          this._activeCount--;
          excess--;
        }
      };

      // Preserve important particles when possible, but always honour the cap.
      if (discard) retire(true);
      if (excess > 0) retire(false);
      return this._activeCount;
    }

    clear() {
      this._freeList.length = 0;
      for (let i = 0; i < this.poolSize; i++) {
        this.particles[i].alive = false;
        this._freeList.push(i);
      }
      this._activeCount = 0;
    }
  }

  return {
    Particle: Particle,
    ParticleSystemCore: ParticleSystemCore,
  };
});
