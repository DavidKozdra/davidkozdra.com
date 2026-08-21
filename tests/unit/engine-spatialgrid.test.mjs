import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { repoPath } from "../helpers/sandbox.mjs";

const require = createRequire(import.meta.url);
const { SpatialGrid } = require(repoPath("Koz_Engine_Lib", "Core", "spatialGrid.js"));

test("inserted entities are counted", () => {
  const grid = new SpatialGrid(10);
  grid.insert({ id: "a" }, 0, 0);
  grid.insert({ id: "b" }, 50, 50);
  assert.equal(grid.size, 2);
});

test("remove drops an entity from the grid", () => {
  const grid = new SpatialGrid(10);
  const entity = { id: "a" };
  grid.insert(entity, 0, 0);
  grid.remove(entity);
  assert.equal(grid.size, 0);
});

test("removing an entity that was never inserted is a no-op", () => {
  const grid = new SpatialGrid(10);
  grid.remove({ id: "ghost" });
  assert.equal(grid.size, 0);
});

test("re-inserting the same entity does not double count", () => {
  const grid = new SpatialGrid(10);
  const entity = { id: "a" };
  grid.insert(entity, 0, 0);
  grid.insert(entity, 0, 0);
  assert.equal(grid.size, 1);
});

/*
 * Sharp edge worth pinning down: insert(entity, tx, ty) files the entity into
 * the right cell but does NOT write tx/ty onto the entity. visitRadius reads
 * e.tx/e.ty for its distance check and falls back to (e.x || 0), so an entity
 * without coordinates of its own is treated as sitting at the origin no matter
 * where it was inserted. Callers must keep tx/ty on the entity themselves.
 */
test("queryRadius finds an entity that carries its own tx/ty", () => {
  const grid = new SpatialGrid(10);
  const entity = { id: "target", tx: 5, ty: 5 };
  grid.insert(entity, 5, 5);
  assert.ok(grid.queryRadius(5, 5, 1).includes(entity));
});

test("insert does not stamp coordinates onto the entity", () => {
  const grid = new SpatialGrid(10);
  const entity = { id: "bare" };
  grid.insert(entity, 5, 5);

  assert.equal(entity.tx, undefined);
  assert.equal(entity.ty, undefined);
  // Consequence: the distance check places it at the origin, so a tight query
  // at its real position misses it.
  assert.equal(grid.queryRadius(5, 5, 1).length, 0);
  assert.ok(grid.queryRadius(0, 0, 1).includes(entity));
});

/*
 * queryRadius is a broad phase: it returns everything in the overlapping
 * cells, so callers still do their own precise distance check. The guarantee
 * that matters is completeness — it must never omit something in range.
 */
test("queryRadius never misses an entity that is genuinely in range", () => {
  const grid = new SpatialGrid(10);
  const near = { id: "near", tx: 0, ty: 0 };
  const far = { id: "far", tx: 500, ty: 500 };
  grid.insert(near, 0, 0);
  grid.insert(far, 500, 500);

  const hits = grid.queryRadius(0, 0, 5);
  assert.ok(hits.includes(near), "in-range entity must be returned");
  assert.ok(!hits.includes(far), "distant entity should not be in nearby cells");
});

test("move relocates an entity between cells", () => {
  const grid = new SpatialGrid(10);
  const entity = { id: "mover", tx: 0, ty: 0 };
  grid.insert(entity, 0, 0);

  // Keep the entity's own coordinates in step with the move, per the contract
  // pinned down above.
  entity.tx = 900;
  entity.ty = 900;
  grid.move(entity, 900, 900);

  assert.equal(grid.size, 1);
  assert.ok(grid.queryRadius(900, 900, 1).includes(entity));
  assert.ok(!grid.queryRadius(0, 0, 1).includes(entity));
});

test("clear empties the grid", () => {
  const grid = new SpatialGrid(10);
  grid.insert({ id: "a" }, 0, 0);
  grid.insert({ id: "b" }, 20, 20);
  grid.clear();
  assert.equal(grid.size, 0);
});

test("queryViewport returns entities inside the bounds", () => {
  const grid = new SpatialGrid(10);
  const inside = { id: "inside", tx: 5, ty: 5 };
  const outside = { id: "outside", tx: 900, ty: 900 };
  grid.insert(inside, 5, 5);
  grid.insert(outside, 900, 900);

  const hits = grid.queryViewport({ minX: 0, maxX: 20, minY: 0, maxY: 20 });
  assert.ok(hits.includes(inside));
  assert.ok(!hits.includes(outside));
});

test("insertBatch adds every entity in one call", () => {
  const grid = new SpatialGrid(10);
  grid.insertBatch([
    { id: "a", tx: 0, ty: 0 },
    { id: "b", tx: 10, ty: 10 },
    { id: "c", tx: 20, ty: 20 },
  ]);
  assert.equal(grid.size, 3);
});
