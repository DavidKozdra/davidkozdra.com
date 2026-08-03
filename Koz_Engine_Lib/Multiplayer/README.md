# Koz Multiplayer

`Multiplayer/` contains the game-independent networking patterns proven in NeoNyke. It does not define characters, commands, room rules, snapshots, or a specific hosting provider.

## Modules

- `networkTransport.js`: provider-neutral identity, delivery, lifecycle, and transport contract.
- `protocolMap.js`: maps host commands to versioned wire messages and delivery intent.
- `sessionDescriptor.js`: validated, expiring resume credentials with safe redaction.
- `resumeStore.js`: injected-storage persistence for a single resumable session.
- `tabCoordinator.js`: Web Locks or storage-lease ownership with BroadcastChannel handoff notices.
- `resilientSession.js`: composes ownership, persistence, connect, disconnect, and resume behavior.
- `sequenceWindow.js`: reliable deduplication and replaceable-channel ordering.
- `entityDelta.js`: collection-independent full/delta entity snapshots.
- `rateLimiter.js`: token-bucket message and byte limits per peer.
- `authorityCheckpoint.js`: versioned, migratable authority state/runtime envelopes.
- `Platforms/Cloudflare/durableObjectAdapter.js`: hibernatable WebSocket attachment, storage, and alarm adapter.

Start with [integration.md](integration.md). For Cloudflare, also read [Platforms/Cloudflare/integration.md](Platforms/Cloudflare/integration.md).

## Ownership Boundary

The engine owns:

- transport and session contracts
- delivery semantics
- recovery and cross-tab coordination
- generic ordering, deltas, throttling, and persistence envelopes
- platform adapters

The game owns:

- message schemas and command names
- authoritative simulation and validation
- player/content data
- matchmaking and lobby policy
- UI
- deployment configuration and secrets

Resume tokens are bearer credentials. Never log them, include them in invite URLs, expose them in analytics, or store them in socket attachments when the attachment may outlive the intended session.
