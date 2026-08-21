import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { repoPath } from "../helpers/sandbox.mjs";

const require = createRequire(import.meta.url);
const geo = require(repoPath("Koz_Engine_Lib", "Core", "geometry2d.js"));

test("clamp holds a value inside its bounds", () => {
  assert.equal(geo.clamp(5, 0, 3), 3);
  assert.equal(geo.clamp(-5, 0, 3), 0);
  assert.equal(geo.clamp(2, 0, 3), 2);
});

test("clamp returns the endpoints unchanged", () => {
  assert.equal(geo.clamp(0, 0, 3), 0);
  assert.equal(geo.clamp(3, 0, 3), 3);
});

test("normalizeAngle folds angles into a single turn", () => {
  const twoPi = Math.PI * 2;
  // Whatever the chosen range is, the result must be the same direction and
  // within one full rotation — that is the property callers depend on.
  for (const angle of [0, Math.PI, 3 * Math.PI, -3 * Math.PI, 7.5, -7.5]) {
    const result = geo.normalizeAngle(angle);
    assert.ok(
      Math.abs(result) <= twoPi + 1e-9,
      `${angle} normalized to ${result}, outside one turn`,
    );
    const delta = Math.abs(
      Math.atan2(Math.sin(angle - result), Math.cos(angle - result)),
    );
    assert.ok(delta < 1e-9, `${angle} -> ${result} changed direction`);
  }
});

test("turnAngleToward never overshoots the limit", () => {
  const step = geo.turnAngleToward(0, Math.PI / 2, 0.1);
  assert.ok(Math.abs(step) <= 0.1 + 1e-9);
});

test("turnAngleToward moves toward the target, not away", () => {
  const from = 0;
  const to = 1;
  const next = geo.turnAngleToward(from, to, 0.25);
  assert.ok(
    Math.abs(to - next) < Math.abs(to - from),
    "turn should reduce the gap",
  );
});

test("segmentHitsCircle detects a segment through the centre", () => {
  assert.ok(geo.segmentHitsCircle(-10, 0, 10, 0, 0, 0, 1));
});

test("segmentHitsCircle rejects a segment that stops short", () => {
  assert.ok(!geo.segmentHitsCircle(-10, 0, -5, 0, 0, 0, 1));
});

test("segmentHitsCircle rejects a clean miss", () => {
  assert.ok(!geo.segmentHitsCircle(-10, 50, 10, 50, 0, 0, 1));
});

// Takes a rect object ({x, y, w|width, h|height}), not four loose numbers.
test("lineIntersectsRect separates a crossing line from an outside one", () => {
  const rect = { x: 0, y: 0, w: 20, h: 20 };
  assert.ok(geo.lineIntersectsRect(-10, 5, 10, 5, rect));
  assert.ok(!geo.lineIntersectsRect(-10, -10, -5, -10, rect));
});

test("lineIntersectsRect accepts width/height as well as w/h", () => {
  const line = [-10, 5, 10, 5];
  assert.equal(
    geo.lineIntersectsRect(...line, { x: 0, y: 0, width: 20, height: 20 }),
    geo.lineIntersectsRect(...line, { x: 0, y: 0, w: 20, h: 20 }),
  );
});

test("lineIntersectsRect padding can pull a near miss into range", () => {
  const rect = { x: 0, y: 0, w: 20, h: 20 };
  assert.ok(!geo.lineIntersectsRect(-10, -5, 10, -5, rect));
  assert.ok(geo.lineIntersectsRect(-10, -5, 10, -5, rect, 10));
});

test("lineIntersectsRect returns false when no rect is given", () => {
  assert.equal(geo.lineIntersectsRect(0, 0, 1, 1, null), false);
});
