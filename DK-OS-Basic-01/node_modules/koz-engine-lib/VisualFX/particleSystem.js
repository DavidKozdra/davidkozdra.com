/* Lightweight pooled particle system
   - Exposes `particleSystem.spawn(x,y,opts)` and `particleSystem.spawnBurst(...)`
   - `render(gfx)` draws using p5 global context when `gfx` is omitted.
   - If `AtlasManager` is available and `opts.frame` provided, uses `AtlasManager.draw`.
   - Particles can be world-space (default) or screen-space when `opts.screen=true`.
*/
let ParticleSystemCoreCtor = null;
if (typeof require === "function") {
  try {
    ({ ParticleSystemCore: ParticleSystemCoreCtor } = require("./particleSystemCore"));
  } catch (_err) {}
}

(function (global) {
  function Particle() {
    this.alive = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.life = 0; this.maxLife = 0;
    this.size = 4;
    this.color = '#fff';
    this.alpha = 1;
    this.frame = null; // atlas frame name
    this.screen = false; // draw in screen coords
  }

  function ParticleSystem(opt) {
    opt = opt || {};
    const CoreCtor = opt.ParticleSystemCore || ParticleSystemCoreCtor;
    if (typeof CoreCtor === "function") {
      this._core = new CoreCtor({ poolSize: opt.poolSize || 300 });
      this.poolSize = this._core.poolSize;
      this.particles = this._core.particles;
      this._next = 0;
      return;
    }

    this._core = null;
    this.poolSize = opt.poolSize || 300;
    this.particles = new Array(this.poolSize);
    for (let i = 0; i < this.poolSize; i++) this.particles[i] = new Particle();
    this._next = 0;
  }

  ParticleSystem.prototype._alloc = function () {
    if (this._core) return this._core._alloc();
    const p = this.particles[this._next];
    this._next = (this._next + 1) % this.poolSize;
    return p;
  };

  // Return number of active (alive) particles
  ParticleSystem.prototype.getActiveCount = function () {
    if (this._core) return this._core.activeCount();
    let n = 0;
    for (let i = 0; i < this.poolSize; i++) if (this.particles[i].alive) n++;
    return n;
  };

  ParticleSystem.prototype.spawn = function (x, y, opts) {
    opts = opts || {};
    if (this._core) return this._core.spawn(x, y, opts);
    const p = this._alloc();
    p.alive = true;
    p.x = x; p.y = y;
    p.vx = opts.vx || ((Math.random() - 0.5) * (opts.spreadX || 60));
    p.vy = opts.vy || ((Math.random() - 0.5) * (opts.spreadY || 60));
    p.maxLife = opts.life || (300 + Math.random() * 400);
    p.life = p.maxLife;
    p.size = opts.size || (2 + Math.random() * 6);
    p.color = opts.color || '#fff';
    p.alpha = 1;
    p.frame = opts.frame || null;
    p.screen = !!opts.screen;
    p.drag = opts.drag || 0.98;
    p.gravity = opts.gravity || 0;
    return p;
  };

  ParticleSystem.prototype.spawnBurst = function (x, y, cfg) {
    cfg = cfg || {};
    if (this._core) {
      this._core.spawnBurst(x, y, cfg);
      return;
    }
    const count = cfg.count || 24;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (cfg.speed || 80) * (0.3 + Math.random() * 1.0);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, Object.assign({}, cfg, { vx, vy }));
    }
  };

  ParticleSystem.prototype.update = function (dt) {
    if (this._core) {
      this._core.update(dt);
      return;
    }
    // dt in ms
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.vx *= p.drag; p.vy *= p.drag;
      p.vy += p.gravity * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  };

  ParticleSystem.prototype.render = function (gfx) {
    const useAtlas = (typeof AtlasManager !== 'undefined' && AtlasManager.draw);
    const ctx = gfx ? (gfx.elt && gfx.elt.getContext ? gfx.elt.getContext('2d', { willReadFrequently: true }) : null) : null;

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.alive) continue;
      if (p.screen) continue; // skip screen-space particles in this world-space render
      if (gfx) {
        // draw into provided p5.Graphics (ctx if available)
        if (p.frame && useAtlas && ctx) {
          let drew = false;
          try {
            // AtlasManager.drawCtx returns false when frame not found; capture result
            drew = !!AtlasManager.drawCtx(ctx, p.frame, p.x - p.size/2, p.y - p.size/2, p.size, p.size);
          } catch (e) {
            // Surface errors during atlas draw so they are visible while debugging
            console.error('AtlasManager.drawCtx error:', e);
            drew = false;
          }
          if (!drew) {
            // Fallback to a simple circle on the 2D context so particles remain visible
            try {
              ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2); ctx.fill(); ctx.restore();
            } catch (e) { /* if ctx drawing fails, ignore */ }
          }
        } else if (ctx) {
          ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2); ctx.fill(); ctx.restore();
        } else {
          gfx.push(); gfx.fill(...hexToRgbArray(p.color), p.alpha * 255); gfx.noStroke(); gfx.ellipse(p.x, p.y, p.size, p.size); gfx.pop();
        }
      } else {
        // draw to main p5 canvas
        push();
        noStroke();
        fill(p.color);
        tint(255, p.alpha * 255);
        if (p.frame && useAtlas) {
          try { AtlasManager.draw(window, p.frame, p.x - p.size/2, p.y - p.size/2, p.size, p.size); }
          catch (e) { const rgb = hexToRgbArray(p.color); fill(rgb[0], rgb[1], rgb[2], Math.floor(p.alpha * 255)); ellipse(p.x, p.y, p.size, p.size); }
        } else {
          const rgb = hexToRgbArray(p.color);
          fill(rgb[0], rgb[1], rgb[2], Math.floor(p.alpha * 255));
          ellipse(p.x, p.y, p.size, p.size);
        }
        noTint();
        pop();
      }
    }
  };

  // Render particles that are screen-space (not affected by world transforms)
  ParticleSystem.prototype.renderToScreen = function () {
    const useAtlas = (typeof AtlasManager !== 'undefined' && AtlasManager.draw);
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.particles[i];
      if (!p.alive || !p.screen) continue;
      push();
      resetMatrix(); // ensure we're drawing in screen-space
      noStroke();
      tint(255, p.alpha * 255);
      if (p.frame && useAtlas) {
        try { AtlasManager.draw(window, p.frame, p.x - p.size/2, p.y - p.size/2, p.size, p.size); }
        catch (e) { const rgb2 = hexToRgbArray(p.color); fill(rgb2[0], rgb2[1], rgb2[2], Math.floor(p.alpha * 255)); ellipse(p.x, p.y, p.size, p.size); }
      } else {
        const rgb2 = hexToRgbArray(p.color);
        fill(rgb2[0], rgb2[1], rgb2[2], Math.floor(p.alpha * 255));
        ellipse(p.x, p.y, p.size, p.size);
      }
      noTint();
      pop();
    }
  };

  // Color cache to avoid parsing hex strings every frame per particle
  const _colorCache = new Map();
  function hexToRgbArray(hex) {
    let cached = _colorCache.get(hex);
    if (cached) return cached;
    let h = hex;
    if (h[0] === '#') h = h.substr(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const num = parseInt(h, 16);
    cached = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    _colorCache.set(hex, cached);
    return cached;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      ParticleSystem: ParticleSystem,
      createParticleSystem: function createParticleSystem(options) {
        return new ParticleSystem(options);
      },
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
