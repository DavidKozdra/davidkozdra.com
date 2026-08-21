import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { repoPath } from "../helpers/sandbox.mjs";

const require = createRequire(import.meta.url);
const { SeededStream, SeededRNG, fnv1a, namedRandom } = require(
  repoPath("Koz_Engine_Lib", "World", "seededRng.js"),
);

const draw = (stream, count = 8) =>
  Array.from({ length: count }, () => stream.random());

test("the same seed replays the same sequence", () => {
  assert.deepEqual(draw(new SeededStream(42)), draw(new SeededStream(42)));
});

test("different seeds diverge", () => {
  assert.notDeepEqual(draw(new SeededStream(1)), draw(new SeededStream(2)));
});

test("random() stays in [0, 1)", () => {
  const stream = new SeededStream(7);
  for (let i = 0; i < 500; i++) {
    const value = stream.random();
    assert.ok(value >= 0 && value < 1, `${value} out of range`);
  }
});

test("int() respects an inclusive range", () => {
  const stream = new SeededStream(99);
  for (let i = 0; i < 200; i++) {
    const value = stream.int(1, 6);
    assert.ok(Number.isInteger(value), `${value} is not an integer`);
    assert.ok(value >= 1 && value <= 6, `${value} outside 1..6`);
  }
});

test("chance(0) never fires and chance(1) always does", () => {
  const stream = new SeededStream(3);
  for (let i = 0; i < 50; i++) {
    assert.equal(stream.chance(0), false);
    assert.equal(stream.chance(1), true);
  }
});

test("pick returns a member of the array", () => {
  const stream = new SeededStream(11);
  const options = ["a", "b", "c"];
  for (let i = 0; i < 50; i++) {
    assert.ok(options.includes(stream.pick(options)));
  }
});

test("shuffle keeps every element exactly once", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = new SeededStream(5).shuffle([...input]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), input);
});

test("state can be captured and restored mid-sequence", () => {
  const stream = new SeededStream(123);
  draw(stream, 3);
  const state = stream.getState();
  const expected = draw(stream, 5);

  const restored = new SeededStream(1);
  restored.setState(state);
  assert.deepEqual(draw(restored, 5), expected);
});

test("fnv1a is stable and distinguishes similar keys", () => {
  assert.equal(fnv1a("hello"), fnv1a("hello"));
  assert.notEqual(fnv1a("hello"), fnv1a("hellp"));
});

test("named streams are independent of each other", () => {
  // installGlobalMathRandom is off: leaving it on would swap Math.random for
  // the whole test process and leak into every other file.
  SeededRNG.startRun(2024, { installGlobalMathRandom: false });
  const alpha = draw(SeededRNG.stream("alpha"), 4);

  SeededRNG.startRun(2024, { installGlobalMathRandom: false });
  const alphaAgain = draw(SeededRNG.stream("alpha"), 4);
  const beta = draw(SeededRNG.stream("beta"), 4);

  assert.deepEqual(alpha, alphaAgain, "same run + name should replay");
  assert.notDeepEqual(alpha, beta, "different names should differ");
});

test("draining one stream does not disturb another", () => {
  SeededRNG.startRun(77, { installGlobalMathRandom: false });
  const betaFirst = draw(SeededRNG.stream("beta"), 3);

  SeededRNG.startRun(77, { installGlobalMathRandom: false });
  draw(SeededRNG.stream("alpha"), 25);
  assert.deepEqual(draw(SeededRNG.stream("beta"), 3), betaFirst);
});

// Signature is namedRandom(seedRuntime, streamName) — the runtime comes first.
test("namedRandom is reproducible for a given runtime and name", () => {
  SeededRNG.startRun(5, { installGlobalMathRandom: false });
  const first = namedRandom(SeededRNG, "loot");
  SeededRNG.startRun(5, { installGlobalMathRandom: false });
  assert.equal(namedRandom(SeededRNG, "loot"), first);
});

test("namedRandom falls back to Math.random without a runtime", () => {
  const value = namedRandom(null, "loot");
  assert.equal(typeof value, "number");
  assert.ok(value >= 0 && value < 1);
});

test("startRun leaves Math.random alone when asked to", () => {
  const original = Math.random;
  SeededRNG.startRun(1, { installGlobalMathRandom: false });
  assert.equal(Math.random, original);
});
