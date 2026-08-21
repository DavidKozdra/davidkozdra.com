/**
 * Minimal browser-API stubs.
 *
 * Just enough surface for the pure logic under test to run — deliberately not
 * a DOM implementation. If a test needs more than this, that is a signal the
 * code under test is doing rendering work and belongs behind an extraction
 * rather than behind a bigger fake.
 */

/**
 * A 2D context that records what was painted instead of rasterising it.
 * Order matters more than pixels here — layer compositing is exactly the thing
 * under test — so every fillRect is logged with the fillStyle in force.
 */
export function createRecordingContext() {
  const calls = [];
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    fillRect(x, y, w, h) {
      calls.push({ op: "fillRect", style: ctx.fillStyle, x, y, w, h });
    },
    clearRect(x, y, w, h) {
      calls.push({ op: "clearRect", x, y, w, h });
    },
    drawImage(...args) {
      calls.push({ op: "drawImage", args });
    },
    fillText(text, x, y) {
      calls.push({ op: "fillText", text, x, y });
    },
    beginPath() {},
    closePath() {},
    arc() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
  };
  ctx.calls = calls;
  return ctx;
}

/** A canvas whose getContext always hands back the same recording context. */
export function createCanvas(width = 500, height = 400) {
  const context = createRecordingContext();
  return {
    width,
    height,
    getContext: () => context,
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    toDataURL: () => "data:image/png;base64,",
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  };
}

/**
 * Enough of `document` for a canvas app to reach its own elements at parse
 * time without throwing. Deliberately thin — see the note in this file's head.
 */
export function createDocument(canvas) {
  const makeElement = () => ({
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    innerText: "",
    innerHTML: "",
    textContent: "",
    appendChild() {},
    insertBefore() {},
    addEventListener() {},
    setAttribute() {},
    blur() {},
  });

  return {
    getElementById: () => canvas,
    createElement: () => ({ ...makeElement(), ...createCanvas() }),
    addEventListener() {},
    querySelectorAll: () => [],
    getElementsByClassName: () => [],
    body: makeElement(),
    activeElement: null,
  };
}

/** In-memory Storage that behaves like localStorage for the parts we use. */
export function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}
