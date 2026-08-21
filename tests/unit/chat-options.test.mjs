import test from "node:test";
import assert from "node:assert/strict";
import { loadGlobals } from "../helpers/sandbox.mjs";

/*
 * chatOptions.js is the one file in people-book that is not sealed inside an
 * IIFE, so its intent graph and matching helpers are reachable. app.js next to
 * it is a 2,300-line IIFE and stays untestable until something is exported.
 */
const { CHAT_INTENTS, getFeedOption, composeRuntimeReply, randomItem } =
  loadGlobals("apps/people-book/chatOptions.js", [
    "CHAT_INTENTS",
    "getFeedOption",
    "composeRuntimeReply",
    "randomItem",
  ]);

test("the intent graph is populated", () => {
  assert.ok(Array.isArray(CHAT_INTENTS));
  assert.ok(CHAT_INTENTS.length > 0, "expected at least one intent");
});

test("every intent has an id, examples, and responses", () => {
  for (const intent of CHAT_INTENTS) {
    assert.equal(typeof intent.id, "string", `intent missing id: ${JSON.stringify(intent).slice(0, 60)}`);
    assert.ok(intent.id.length > 0, "intent id must not be empty");
    assert.ok(Array.isArray(intent.examples), `${intent.id} has no examples array`);
    assert.ok(intent.examples.length > 0, `${intent.id} has no examples`);
    assert.ok(Array.isArray(intent.responses), `${intent.id} has no responses array`);
    assert.ok(intent.responses.length > 0, `${intent.id} has no responses`);
  }
});

test("intent ids are unique", () => {
  const ids = CHAT_INTENTS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate intent id");
});

test("every example is a non-empty string", () => {
  for (const intent of CHAT_INTENTS) {
    for (const example of intent.examples) {
      assert.equal(typeof example, "string", `${intent.id} has a non-string example`);
      assert.ok(example.trim().length > 0, `${intent.id} has a blank example`);
    }
  }
});

test("every response carries text", () => {
  for (const intent of CHAT_INTENTS) {
    for (const response of intent.responses) {
      assert.equal(typeof response.text, "string", `${intent.id} response missing text`);
      assert.ok(response.text.trim().length > 0, `${intent.id} has a blank response`);
    }
  }
});

test("every 'next' reference points at a real intent", () => {
  const ids = new Set(CHAT_INTENTS.map((i) => i.id));
  for (const intent of CHAT_INTENTS) {
    for (const response of intent.responses) {
      if (!response.next) continue;
      const next = Array.isArray(response.next) ? response.next : [response.next];
      for (const target of next) {
        assert.ok(
          ids.has(target),
          `${intent.id} points at "${target}", which is not an intent id`,
        );
      }
    }
  }
});

test("randomItem returns a member of the array", () => {
  const options = ["a", "b", "c"];
  for (let i = 0; i < 40; i++) {
    assert.ok(options.includes(randomItem(options)));
  }
});

test("randomItem on a single-item array returns that item", () => {
  assert.equal(randomItem(["only"]), "only");
});

test("getFeedOption returns something usable for arbitrary text", () => {
  for (const post of ["just shipped a feature", "", "?????", "hello world"]) {
    const option = getFeedOption(post);
    assert.ok(option != null, `getFeedOption(${JSON.stringify(post)}) returned nothing`);
  }
});

test("composeRuntimeReply produces a non-empty string", () => {
  const reply = composeRuntimeReply("hey there", "games");
  assert.equal(typeof reply, "string");
  assert.ok(reply.trim().length > 0, "reply should not be blank");
});

test("composeRuntimeReply copes with an unknown topic", () => {
  const reply = composeRuntimeReply("hey", "a-topic-that-does-not-exist");
  assert.equal(typeof reply, "string");
  assert.ok(reply.trim().length > 0);
});

test("composeRuntimeReply copes with empty input", () => {
  const reply = composeRuntimeReply("", "");
  assert.equal(typeof reply, "string");
});
