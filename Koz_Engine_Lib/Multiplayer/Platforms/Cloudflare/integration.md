# Cloudflare Durable Object Integration

Use a Durable Object as the single authority for a room. Use hibernatable WebSockets so waiting rooms and suspended clients do not require a continuously active isolate.

## Construct the Adapter

```js
const {
  createDurableObjectAdapter,
} = require("./durableObjectAdapter");

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.platform = createDurableObjectAdapter({
      context: ctx,
      checkpointKey: "room-checkpoint-v1",
      webSocketTags: ["game-room"],
    });
  }
}
```

Wrangler module builds may need a bundler interop wrapper for this CommonJS module. Keep that wrapper in the host deployment layer.

## Accept and Restore Sockets

Call `acceptSocket()` with a small attachment:

```js
this.platform.acceptSocket(serverSocket, {
  peerId,
  identity: { provider: "guest", id: peerId },
  joined: false,
  connectedAt: Date.now(),
});
```

Attachments should contain only enough information to reconnect a healthy socket to in-memory authority state. Put simulation state, reconnect reservations, and larger runtime maps in Durable Object Storage.

After hibernation:

1. Read the checkpoint.
2. Restore the simulation and authority runtime.
3. Call `listSockets()` and reattach healthy sockets by `peerId`.
4. Reject attachments whose version or identity no longer matches authority state.

## Persistence Policy

Write checkpoints:

- after join, leave, token rotation, or ownership transfer
- at important simulation boundaries
- on a bounded interval while a match is active
- before intentionally shutting down an active room when possible

Serialize writes so an older checkpoint cannot overwrite a newer revision. Do not write every simulation tick.

Use alarms for room expiry and cleanup. Do not rely on in-memory timers to survive hibernation.

## WebSocket Policy

- Validate byte size before parsing.
- Apply `PeerRateLimiter` per socket.
- Use WebSocket auto-response for a raw ping/pong that does not wake the object.
- Keep protocol heartbeats separate when the authority needs gameplay liveness.
- Close rejected, timed-out, and replaced sockets with a short stable reason.
- Do not place the resume bearer token in the socket attachment.

## PWA Boundary

Service workers must treat multiplayer REST and WebSocket routes as network-only. Offline support should preserve the game shell and local play, never fake a multiplayer authority response.
