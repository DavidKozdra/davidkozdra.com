import test from "node:test";
import assert from "node:assert/strict";
import { loadInlineScript } from "../helpers/sandbox.mjs";
import { createCanvas, createDocument, createLocalStorage } from "../helpers/dom-stubs.mjs";

/*
 * Regression cover for the layer-compositing bug: update() used to paint each
 * pixel straight onto the canvas as the pointer moved, so strokes landed in
 * the order they were drawn and the selected layer was ignored entirely. The
 * ordering only appeared after an undo happened to trigger a rebuild.
 *
 * bucketStrokes is the pure part of that fix — it groups strokes into layer
 * buckets, bottom layer first — so these tests pin the ordering contract.
 */
function load() {
  const canvas = createCanvas();
  return {
    canvas,
    api: loadInlineScript(
      "apps/drawing/index.html",
      ["bucketStrokes", "layerCount", "colorMap", "hex"],
      {
        document: createDocument(canvas),
        localStorage: createLocalStorage(),
        requestAnimationFrame() {},
      },
    ),
  };
}

const { api } = load();
const { bucketStrokes, colorMap, hex } = api;

const stroke = (layer, tag) => ({
  layer,
  pixels: [{ x: 0, y: 0, penSize: 1, color: tag }],
});

/** Flatten buckets into the order their pixels would be painted. */
const paintOrder = (buckets) => buckets.flat().map((p) => p.color);

test("bucketStrokes returns one bucket per layer", () => {
  const buckets = bucketStrokes([]);
  assert.ok(Array.isArray(buckets));
  assert.ok(buckets.length > 0, "expected at least one layer bucket");
  assert.ok(buckets.every(Array.isArray), "every bucket should be an array");
});

test("a stroke lands in the bucket for its own layer", () => {
  const buckets = bucketStrokes([stroke(2, "red")]);
  assert.equal(buckets[2].length, 1);
  assert.equal(buckets[2][0].color, "red");

  const elsewhere = buckets.filter((_, i) => i !== 2).flat();
  assert.equal(elsewhere.length, 0, "the pixel leaked into another layer");
});

/*
 * The bug, stated as a test: draw on a high layer first, then on layer 0.
 * Chronologically the second stroke is later, but it must still paint FIRST
 * so it ends up underneath.
 */
test("a lower layer paints first even when drawn later", () => {
  const order = paintOrder(
    bucketStrokes([stroke(8, "drawn-first-top"), stroke(0, "drawn-second-bottom")]),
  );

  assert.deepEqual(order, ["drawn-second-bottom", "drawn-first-top"]);
});

test("layers composite bottom to top regardless of draw order", () => {
  const shuffled = [stroke(5, "e"), stroke(1, "b"), stroke(8, "f"), stroke(0, "a"), stroke(3, "c")];
  assert.deepEqual(paintOrder(bucketStrokes(shuffled)), ["a", "b", "c", "e", "f"]);
});

test("strokes on the same layer keep the order they were drawn", () => {
  const order = paintOrder([
    ...bucketStrokes([stroke(2, "first"), stroke(2, "second"), stroke(2, "third")]),
  ]);
  assert.deepEqual(order, ["first", "second", "third"]);
});

test("every pixel of a multi-pixel stroke stays on its layer", () => {
  const long = {
    layer: 1,
    pixels: [
      { x: 0, y: 0, penSize: 2, color: "a" },
      { x: 1, y: 1, penSize: 2, color: "a" },
      { x: 2, y: 2, penSize: 2, color: "a" },
    ],
  };
  const buckets = bucketStrokes([long]);
  assert.equal(buckets[1].length, 3);
});

/*
 * A stroke can outlive the layer it was drawn on — clear, or undo past a
 * layer add. It must be skipped rather than throwing on an undefined bucket.
 */
test("a stroke on a layer that no longer exists is skipped", () => {
  assert.doesNotThrow(() => bucketStrokes([stroke(9999, "orphan")]));
  const order = paintOrder(bucketStrokes([stroke(9999, "orphan"), stroke(0, "kept")]));
  assert.deepEqual(order, ["kept"]);
});

test("an empty stroke list produces empty buckets", () => {
  assert.equal(bucketStrokes([]).flat().length, 0);
});

test("a stroke with no pixels contributes nothing", () => {
  assert.equal(bucketStrokes([{ layer: 0, pixels: [] }]).flat().length, 0);
});

// ------------------------------------------------------------------- colour

test("colorMap builds an rgb() string", () => {
  assert.equal(colorMap({ r: 255, g: 128, b: 0 }), "rgb(255, 128, 0)");
});

test("colorMap handles black and white", () => {
  assert.equal(colorMap({ r: 0, g: 0, b: 0 }), "rgb(0, 0, 0)");
  assert.equal(colorMap({ r: 255, g: 255, b: 255 }), "rgb(255, 255, 255)");
});

test("hex pads single digits to two characters", () => {
  assert.equal(hex(0), "00");
  assert.equal(hex(15), "0f");
  assert.equal(hex(255), "ff");
});

test("hex output is always two characters", () => {
  for (let i = 0; i <= 255; i += 17) {
    assert.equal(hex(i).length, 2, `hex(${i}) was not two characters`);
  }
});
