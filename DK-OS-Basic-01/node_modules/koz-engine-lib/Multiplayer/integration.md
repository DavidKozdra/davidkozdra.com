# Multiplayer Integration

This guide builds a resumable authoritative game without importing NeoNyke concepts.

## 1. Implement a Transport

Extend `NetworkTransport` or implement the same contract:

```js
const {
  NetworkTransport,
  normalizeDeliveryOptions,
} = require("./networkTransport");

class GameWebSocketTransport extends NetworkTransport {
  async joinSession(roomId) {
    await this.initialize();
    this.sessionId = roomId;
    // Open the provider socket and route incoming messages through:
    // this._emit("message", authorityId, envelope, delivery)
    return { sessionId: roomId, authorityPeerId: "authority" };
  }

  send(peerId, envelope, delivery) {
    const intent = normalizeDeliveryOptions(delivery);
    this.socket.send(JSON.stringify({ envelope, intent }));
  }
}
```

Keep provider URLs, authentication, and socket creation in the host adapter.

## 2. Map the Game Protocol

The host registers its own nouns:

```js
const { createProtocolMap, DIRECTIONS } = require("./protocolMap");

const protocol = createProtocolMap({ protocolVersion: 1 })
  .register("move", {
    wireType: "PLAYER_INPUT",
    direction: DIRECTIONS.CLIENT_TO_AUTHORITY,
    delivery: {
      reliability: "unreliable",
      channel: "input",
      replaceable: true,
    },
    validate: payload =>
      Number.isFinite(payload.x) && Number.isFinite(payload.y),
  });
```

Do not move a game's complete message catalogue into the engine. Register it during host composition.

## 3. Persist Resume Identity

Inject storage so tests and non-browser hosts remain deterministic:

```js
const { createResumeStore } = require("./resumeStore");

const resumeStore = createResumeStore({
  storage: window.localStorage,
  key: "my-game.multiplayer.resume.v1",
});

resumeStore.save({
  provider: "cloudflare-durable-object",
  roomId,
  playerId,
  resumeToken,
  protocolVersion: 1,
  buildVersion,
  contentHash,
});
```

Persist only after the authority accepts the join. Replace the stored token whenever the authority rotates it. Clear it on explicit leave, match deletion, permanent rejection, expiry, or incompatible build.

The storage adapter must provide `getItem`, `setItem`, and `removeItem`. `createMemoryStorage()` is suitable for tests.

## 4. Enforce One Active Tab

```js
const { createTabCoordinator } = require("./tabCoordinator");

const tabs = createTabCoordinator({
  storage: window.localStorage,
  locks: navigator.locks,
  createChannel: name => new BroadcastChannel(name),
});

if (!(await tabs.acquire(roomId))) {
  throw new Error("The room is already active in another tab");
}
```

Web Locks are preferred. The expiring storage lease is the compatibility fallback. When a replacement requests takeover, the current tab should stop input, close with a non-destructive `tab-handoff` reason, and release ownership. The replacement then reconnects with the persisted credential.

Never run two sockets for the same player as normal operation. The authority must still defend against races.

## 5. Make Authority Takeover Atomic

For a valid active resume token, process takeover in this order:

1. Validate build, protocol, room, token, player, and expiry.
2. Remove the old peer-to-player mapping.
3. Bind the player entity to the new peer.
4. Rotate the resume token.
5. Persist the authority checkpoint.
6. Close the old socket.
7. Send join acceptance and a full correction to the new peer.

Removing the old mapping before closing prevents its disconnect callback from reserving or deleting the transferred player. Never accept an already-rotated token again.

## 6. Protect Ordering and Bandwidth

Use `SequenceWindow` for:

- reliable-message duplicate suppression
- rejecting old replaceable input/snapshot packets by channel

Use `PeerRateLimiter` before parsing or dispatching expensive messages. Set both message and byte budgets. Reject oversized payloads before `JSON.parse`.

Use `createEntityDelta()` for renderer-neutral entity collections:

```js
const delta = createEntityDelta({
  previous: lastPublishedState,
  current: authorityState,
  collections: ["players", "enemies", "projectiles"],
  sequence,
  tick,
});
```

Periodically send a full snapshot and always send one after resume/takeover. Deltas are an optimization, not a recovery mechanism.

## 7. Checkpoint Authority State

`createAuthorityCheckpoint()` keeps simulation state separate from runtime connection state:

```js
const checkpoint = createAuthorityCheckpoint({
  kind: "my-game-room",
  schemaVersion: 2,
  revision,
  compatibility: { buildVersion, contentHash },
  state: simulation.snapshot(),
  runtime: {
    playerMappings,
    reconnectReservations,
    sequenceWindows,
  },
});
```

Restore through `restoreAuthorityCheckpoint()` and explicit migrations. Refuse incompatible content instead of attempting a partially valid simulation.

## 8. Compose the Recovery Controller

`createResilientSession()` is intentionally callback-driven:

```js
const session = createResilientSession({
  resumeStore,
  coordinator: tabs,
  applyDescriptor: descriptor => {
    client.resumeToken = descriptor.resumeToken;
  },
  connect: roomId => client.connect(roomId),
  disconnect: reason => client.leave(reason),
});
```

The host still owns UI status, reconnect backoff, visibility policy, and whether resume should be automatic.

## NeoNyke Reference

NeoNyke demonstrates:

- browser recovery in `js/multiplayer/BrowserMultiplayerSession.js`
- active and disconnected takeover in `js/multiplayer/LocalMultiplayerSession.js`
- game-owned schemas in `js/protocol/ProtocolV1.js`
- hibernatable authority hosting in `server/server.js`

Copy the composition pattern, not the game protocol.
