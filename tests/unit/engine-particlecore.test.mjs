import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { repoPath } from "../helpers/sandbox.mjs";

const require = createRequire(import.meta.url);
const { Particle, ParticleSystemCore } = require(
  repoPath("Koz_Engine_Lib", "VisualFX", "particleSystemCore.js"),
);

/*
 * API shape worth stating up front, because none of it is guessable:
 *   new ParticleSystemCore({ poolSize, maxPoolSize })  — options object
 *   spawn(x, y, opts)  /  spawnBurst(x, y, opts)       — positional coords
 *   update(dtMs)                                       — MILLISECONDS
 * `life` is therefore also in milliseconds, and spawnBurst defaults to 24.
 */
const makeSystem = (opts) => new ParticleSystemCore(opts);

test("a fresh particle starts dead", () => {
  assert.equal(new Particle().alive, false);
});

test("a new system has nothing active", () => {
  assert.equal(makeSystem({ poolSize: 8 }).activeCount(), 0);
});

test("spawn activates exactly one particle", () => {
  const system = makeSystem({ poolSize: 8 });
  system.spawn(1, 2, { life: 1000 });
  assert.equal(system.activeCount(), 1);
});

test("spawnBurst honours an explicit count", () => {
  const system = makeSystem({ poolSize: 64 });
  system.spawnBurst(0, 0, { life: 1000, count: 10 });
  assert.equal(system.activeCount(), 10);
});

test("spawnBurst defaults to 24 particles", () => {
  const system = makeSystem({ poolSize: 64 });
  system.spawnBurst(0, 0, { life: 1000 });
  assert.equal(system.activeCount(), 24);
});

test("clear releases every active particle", () => {
  const system = makeSystem({ poolSize: 16 });
  system.spawnBurst(0, 0, { life: 1000, count: 12 });
  system.clear();
  assert.equal(system.activeCount(), 0);
});

test("the pool grows past its initial size when exhausted", () => {
  const system = makeSystem({ poolSize: 4, maxPoolSize: 64 });
  system.spawnBurst(0, 0, { life: 1000, count: 20 });

  assert.equal(system.activeCount(), 20);
  assert.ok(system.poolSize >= 20, `pool should have grown, got ${system.poolSize}`);
});

test("the pool refuses to grow beyond maxPoolSize", () => {
  const system = makeSystem({ poolSize: 4, maxPoolSize: 8 });
  system.spawnBurst(0, 0, { life: 1000, count: 100 });

  assert.ok(system.poolSize <= 8, `pool exceeded its cap at ${system.poolSize}`);
});

test("particles expire once their life runs out", () => {
  const system = makeSystem({ poolSize: 8 });
  system.spawn(0, 0, { life: 100 });
  assert.equal(system.activeCount(), 1);

  system.update(500); // ms, well past the particle's lifetime
  assert.equal(system.activeCount(), 0);
});

test("a particle survives an update shorter than its life", () => {
  const system = makeSystem({ poolSize: 8 });
  system.spawn(0, 0, { life: 1000 });
  system.update(10);
  assert.equal(system.activeCount(), 1);
});

test("velocity moves a particle during update", () => {
  const system = makeSystem({ poolSize: 8 });
  system.spawn(0, 0, { vx: 100, vy: 0, life: 1000, drag: 1, gravity: 0 });

  const [particle] = system.activeParticles();
  const startX = particle.x;
  system.update(100);

  assert.notEqual(particle.x, startX, "expected vx to change x");
});

test("alpha fades as life is consumed", () => {
  const system = makeSystem({ poolSize: 8 });
  system.spawn(0, 0, { life: 1000 });

  const [particle] = system.activeParticles();
  system.update(500);
  assert.ok(particle.alpha < 1, `alpha should have faded, got ${particle.alpha}`);
});

test("freed particles are reused rather than leaked", () => {
  const system = makeSystem({ poolSize: 8, maxPoolSize: 8 });
  system.spawnBurst(0, 0, { life: 100, count: 8 });
  system.update(500);
  assert.equal(system.activeCount(), 0);

  system.spawnBurst(0, 0, { life: 100, count: 8 });
  assert.equal(system.activeCount(), 8);
  assert.ok(system.poolSize <= 8, "reuse should not have grown the pool");
});

test("activeParticles only reports live ones", () => {
  const system = makeSystem({ poolSize: 16 });
  system.spawnBurst(0, 0, { life: 1000, count: 5 });

  const active = system.activeParticles();
  assert.equal(active.length, 5);
  assert.ok(active.every((p) => p.alive));
});
