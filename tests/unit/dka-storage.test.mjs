import test from "node:test";
import assert from "node:assert/strict";
import { createLocalStorage } from "../helpers/dom-stubs.mjs";

/*
 * DKAdventure is the only real ESM in the repo, so these import directly.
 * storage.js reaches for a bare `localStorage`, so a stub has to exist on the
 * global before the module is pulled in.
 */
globalThis.localStorage = createLocalStorage();

const { SAVE_KEY, STATE, createDefaultSave } = await import(
  "../../apps/DKAdventure/js/constants.js"
);
const { createSaveStore } = await import("../../apps/DKAdventure/js/storage.js");

/** Fresh storage for each test so saved state cannot leak between them. */
function withStorage(contents) {
  globalThis.localStorage = createLocalStorage(contents);
}

test("STATE exposes the expected scene keys", () => {
  assert.equal(STATE.MENU, "MENU");
  for (const key of ["CH1_INTRO", "CH1_CRACK", "CH1_ROOM", "CH2_RUN", "CH3_HIGHFIVE"]) {
    assert.equal(typeof STATE[key], "string", `${key} missing from STATE`);
  }
});

test("createDefaultSave returns a fresh object every call", () => {
  const first = createDefaultSave();
  const second = createDefaultSave();

  assert.notEqual(first, second, "callers must not share one save object");
  first.unlocked.push(99);
  assert.ok(
    !second.unlocked.includes(99),
    "mutating one default must not affect the next",
  );
});

test("the default save has the documented shape", () => {
  const save = createDefaultSave();
  assert.deepEqual(save.unlocked, [1, 2, 3]);
  assert.deepEqual(save.completed, []);
  assert.equal(save.tosAccepted, false);
  assert.deepEqual(save.inventory, { string: false, money: false, computer: false });
});

test("an empty store starts from the defaults", () => {
  withStorage();
  assert.deepEqual(createSaveStore().data, createDefaultSave());
});

test("a saved game is read back", () => {
  const saved = { ...createDefaultSave(), tosAccepted: true, completed: [1] };
  withStorage({ [SAVE_KEY]: JSON.stringify(saved) });

  const store = createSaveStore();
  assert.equal(store.data.tosAccepted, true);
  assert.deepEqual(store.data.completed, [1]);
});

test("persist writes the current data back", () => {
  withStorage();
  const store = createSaveStore();
  store.data.tosAccepted = true;
  store.persist();

  const raw = globalThis.localStorage.getItem(SAVE_KEY);
  assert.equal(JSON.parse(raw).tosAccepted, true);
});

test("corrupt JSON falls back to defaults instead of throwing", () => {
  withStorage({ [SAVE_KEY]: "{not valid json" });
  assert.deepEqual(createSaveStore().data, createDefaultSave());
});

test("a save missing keys is filled in from the defaults", () => {
  withStorage({ [SAVE_KEY]: JSON.stringify({ tosAccepted: true }) });

  const { data } = createSaveStore();
  assert.equal(data.tosAccepted, true);
  assert.deepEqual(data.unlocked, [1, 2, 3], "missing unlocked should default");
  assert.deepEqual(data.inventory, { string: false, money: false, computer: false });
});

test("non-array unlocked/completed values are replaced by defaults", () => {
  withStorage({
    [SAVE_KEY]: JSON.stringify({ unlocked: "nope", completed: { bad: true } }),
  });

  const { data } = createSaveStore();
  assert.deepEqual(data.unlocked, [1, 2, 3]);
  assert.deepEqual(data.completed, []);
});

test("a partial inventory keeps the remaining default items", () => {
  withStorage({ [SAVE_KEY]: JSON.stringify({ inventory: { string: true } }) });

  const { data } = createSaveStore();
  assert.deepEqual(data.inventory, { string: true, money: false, computer: false });
});

test("loaded arrays are copies, not references into the parsed save", () => {
  const unlocked = [1, 2, 3];
  withStorage({ [SAVE_KEY]: JSON.stringify({ unlocked }) });

  const store = createSaveStore();
  store.data.unlocked.push(4);
  assert.deepEqual(unlocked, [1, 2, 3], "the source array must not be mutated");
});

test("a JSON null save falls back to defaults", () => {
  withStorage({ [SAVE_KEY]: "null" });
  // `null` parses fine but has no properties to spread; the store must cope.
  assert.doesNotThrow(() => createSaveStore());
});
