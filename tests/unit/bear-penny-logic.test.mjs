import test from "node:test";
import assert from "node:assert/strict";
import { loadGlobals } from "../helpers/sandbox.mjs";

/*
 * game.js is a plain <script> that declares everything in global scope, so
 * there is nothing to import. The sandbox runs it and hands back the pure
 * functions. No production change was needed to make this testable.
 */
const {
  calcPendingGift,
  mazeCellIndex,
  mazeHasPath,
  getMazeReachableCells,
  GIFT_MAX_PENNIES,
  GIFT_ACCRUAL_MS,
} = loadGlobals(
  "apps/bear-penny/game.js",
  [
    "calcPendingGift",
    "mazeCellIndex",
    "mazeHasPath",
    "getMazeReachableCells",
    "GIFT_MAX_PENNIES",
    "GIFT_ACCRUAL_MS",
  ],
);

// --------------------------------------------------------------- gift accrual

test("gift constants are the documented values", () => {
  assert.equal(GIFT_MAX_PENNIES, 500);
  assert.equal(GIFT_ACCRUAL_MS, 20 * 60 * 1000);
});

test("a player who never claimed gets the full gift", () => {
  assert.equal(calcPendingGift(0), GIFT_MAX_PENNIES);
  assert.equal(calcPendingGift(null), GIFT_MAX_PENNIES);
  assert.equal(calcPendingGift(undefined), GIFT_MAX_PENNIES);
});

test("claiming just now leaves nothing pending", () => {
  assert.equal(calcPendingGift(Date.now()), 0);
});

test("half the accrual window yields about half the gift", () => {
  const halfway = Date.now() - GIFT_ACCRUAL_MS / 2;
  const pending = calcPendingGift(halfway);
  // Allow a penny of slack for the clock ticking during the call.
  assert.ok(
    Math.abs(pending - GIFT_MAX_PENNIES / 2) <= 1,
    `expected ~250, got ${pending}`,
  );
});

test("the gift stops accruing at the cap", () => {
  const longAgo = Date.now() - GIFT_ACCRUAL_MS * 100;
  assert.equal(calcPendingGift(longAgo), GIFT_MAX_PENNIES);
});

test("the pending gift never exceeds the maximum", () => {
  for (const ago of [0, 1, 1000, GIFT_ACCRUAL_MS, GIFT_ACCRUAL_MS * 10]) {
    const pending = calcPendingGift(Date.now() - ago);
    assert.ok(pending >= 0 && pending <= GIFT_MAX_PENNIES, `${pending} out of range`);
  }
});

test("clock skew into the future cannot inflate the gift", () => {
  const pending = calcPendingGift(Date.now() + 60_000);
  assert.ok(
    pending <= GIFT_MAX_PENNIES,
    `a future claim time yielded ${pending}, above the cap`,
  );
});

// ----------------------------------------------------------------- maze logic

/** Build a walls array (flat, indexed by mazeCellIndex) from "x,y" strings. */
function wallsFrom(cols, rows, blocked = []) {
  const walls = new Array(cols * rows).fill(false);
  for (const cell of blocked) {
    const [x, y] = cell.split(",").map(Number);
    walls[mazeCellIndex(cols, x, y)] = true;
  }
  return walls;
}

test("mazeCellIndex maps grid coordinates to a flat index", () => {
  assert.equal(mazeCellIndex(5, 0, 0), 0);
  assert.equal(mazeCellIndex(5, 4, 0), 4);
  assert.equal(mazeCellIndex(5, 0, 1), 5);
  assert.equal(mazeCellIndex(5, 3, 2), 13);
});

test("an empty maze is solvable", () => {
  assert.equal(mazeHasPath(4, 4, wallsFrom(4, 4)), true);
});

test("a maze walled off before the exit is unsolvable", () => {
  // Seal the exit corner (3,3) behind walls at (2,3) and (3,2).
  const walls = wallsFrom(4, 4, ["2,3", "3,2"]);
  assert.equal(mazeHasPath(4, 4, walls), false);
});

test("a single-cell maze is trivially solved", () => {
  assert.equal(mazeHasPath(1, 1, wallsFrom(1, 1)), true);
});

test("a full-height wall makes the exit unreachable", () => {
  const walls = wallsFrom(4, 4, ["2,0", "2,1", "2,2", "2,3"]);
  assert.equal(mazeHasPath(4, 4, walls), false);
});

test("a wall with a gap still lets the player through", () => {
  // Same wall as above, but (2,3) is open.
  const walls = wallsFrom(4, 4, ["2,0", "2,1", "2,2"]);
  assert.equal(mazeHasPath(4, 4, walls), true);
});

test("reachable cells never include a walled cell", () => {
  const blocked = ["1,1", "2,2"];
  const walls = wallsFrom(4, 4, blocked);
  const reachable = getMazeReachableCells(4, 4, walls);

  for (const cell of blocked) {
    assert.ok(!reachable[cell], `${cell} is a wall but was reported reachable`);
  }
});

test("reachable cells stay inside the grid", () => {
  const reachable = getMazeReachableCells(3, 3, wallsFrom(3, 3));
  for (const key of Object.keys(reachable)) {
    const [x, y] = key.split(",").map(Number);
    assert.ok(x >= 0 && x < 3 && y >= 0 && y < 3, `${key} is out of bounds`);
  }
});

test("an open maze reaches every cell", () => {
  const reachable = getMazeReachableCells(3, 3, wallsFrom(3, 3));
  assert.equal(Object.keys(reachable).length, 9);
});

test("sealing the start leaves only the start reachable", () => {
  const walls = wallsFrom(3, 3, ["1,0", "0,1"]);
  const reachable = getMazeReachableCells(3, 3, walls);
  assert.deepEqual(Object.keys(reachable), ["0,0"]);
});
