import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { repoPath } from "../helpers/sandbox.mjs";

const require = createRequire(import.meta.url);
const { MinHeap, findGridPath, EIGHT_WAY_NEIGHBORS } = require(
  repoPath("Koz_Engine_Lib", "AI", "astar.js"),
);

/** Walls given as "x,y" strings, so the grids below read like pictures. */
const blockedBy = (walls) => (x, y) => !walls.has(`${x},${y}`);

// MinHeap(scoreFn) scores items on the way out; push() takes the item alone.
test("MinHeap pops in ascending score order", () => {
  const heap = new MinHeap((n) => n);
  for (const n of [5, 1, 4, 1, 3, 2]) heap.push(n);

  const popped = [];
  while (heap.size > 0) popped.push(heap.pop());
  assert.deepEqual(popped, [1, 1, 2, 3, 4, 5]);
});

test("MinHeap orders by the score function, not insertion", () => {
  const heap = new MinHeap((task) => task.cost);
  heap.push({ name: "expensive", cost: 10 });
  heap.push({ name: "cheap", cost: 1 });
  heap.push({ name: "middling", cost: 5 });

  assert.equal(heap.pop().name, "cheap");
  assert.equal(heap.pop().name, "middling");
  assert.equal(heap.pop().name, "expensive");
});

test("MinHeap reports size and returns undefined when drained", () => {
  const heap = new MinHeap((n) => n);
  assert.equal(heap.size, 0);
  assert.equal(heap.pop(), undefined);
  heap.push(1);
  assert.equal(heap.size, 1);
  heap.pop();
  assert.equal(heap.size, 0);
});

// The returned path is the list of steps to take: it excludes the start cell
// and ends on the goal.
test("findGridPath walks a clear grid start to goal", () => {
  const path = findGridPath({
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    goal: { x: 4, y: 4 },
  });

  assert.ok(path.length > 0, "expected a path");
  assert.deepEqual(path[path.length - 1], { x: 4, y: 4 });
  assert.ok(
    !path.some((step) => step.x === 0 && step.y === 0),
    "start cell should not be part of the step list",
  );
});

test("findGridPath returns no steps when already at the goal", () => {
  assert.deepEqual(
    findGridPath({ width: 3, height: 3, start: { x: 1, y: 1 }, goal: { x: 1, y: 1 } }),
    [],
  );
});

test("findGridPath returns only single steps between cells", () => {
  const path = findGridPath({
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
  });

  const walked = [{ x: 0, y: 0 }, ...path];
  for (let i = 1; i < walked.length; i++) {
    const dx = Math.abs(walked[i].x - walked[i - 1].x);
    const dy = Math.abs(walked[i].y - walked[i - 1].y);
    assert.equal(dx + dy, 1, `step ${i} jumped from ${JSON.stringify(walked[i - 1])}`);
  }
});

test("findGridPath routes around a wall", () => {
  // A vertical wall at x=1 with a gap at the bottom row.
  const walls = new Set(["1,0", "1,1", "1,2"]);
  const path = findGridPath({
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 0 },
    isWalkable: blockedBy(walls),
  });

  assert.ok(path.length > 0, "expected a route around the wall");
  for (const step of path) {
    assert.ok(!walls.has(`${step.x},${step.y}`), "path went through a wall");
  }
});

test("findGridPath gives up on a sealed goal", () => {
  // Goal fully enclosed in the corner.
  const walls = new Set(["3,2", "2,3", "2,2"]);
  const path = findGridPath({
    width: 4,
    height: 4,
    start: { x: 0, y: 0 },
    goal: { x: 3, y: 3 },
    isWalkable: blockedBy(walls),
  });

  assert.deepEqual(path, [], "unreachable goal should yield no path");
});

test("findGridPath rejects out-of-bounds endpoints", () => {
  const base = { width: 4, height: 4, start: { x: 0, y: 0 } };
  assert.deepEqual(findGridPath({ ...base, goal: { x: 9, y: 9 } }), []);
  assert.deepEqual(findGridPath({ ...base, goal: { x: -1, y: 0 } }), []);
});

test("findGridPath handles a zero-size grid without throwing", () => {
  assert.deepEqual(
    findGridPath({ width: 0, height: 0, start: { x: 0, y: 0 }, goal: { x: 0, y: 0 } }),
    [],
  );
});

test("eight-way movement reaches a diagonal goal in fewer steps", () => {
  const options = {
    width: 6,
    height: 6,
    start: { x: 0, y: 0 },
    goal: { x: 5, y: 5 },
  };
  const cardinal = findGridPath(options);
  const diagonal = findGridPath({ ...options, neighbors: EIGHT_WAY_NEIGHBORS });

  assert.ok(diagonal.length > 0);
  assert.ok(
    diagonal.length < cardinal.length,
    `diagonal ${diagonal.length} should beat cardinal ${cardinal.length}`,
  );
});

test("movementCost steers the path toward cheaper ground", () => {
  // Make the middle row expensive; the path should mostly avoid y=1.
  const path = findGridPath({
    width: 5,
    height: 3,
    start: { x: 0, y: 1 },
    goal: { x: 4, y: 1 },
    movementCost: (x, y) => (y === 1 && x > 0 && x < 4 ? 50 : 1),
  });

  assert.ok(path.length > 0);
  const throughExpensive = path.filter((p) => p.y === 1 && p.x > 0 && p.x < 4);
  assert.ok(
    throughExpensive.length < 3,
    "expected the path to detour around the costly row",
  );
});
