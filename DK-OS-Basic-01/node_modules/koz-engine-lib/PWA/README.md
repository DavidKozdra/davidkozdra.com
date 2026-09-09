# Koz Engine PWA

The PWA folder provides reusable offline infrastructure for browser games:

- `cacheManifest.js`: build-time content hashing and cache-tier generation
- `serviceWorkerRuntime.js`: atomic install, versioned caches, offline fetch handling, and update messages
- `clientRegistration.js`: service-worker registration, update lifecycle, storage estimates, and optional-cache warming
- `integration.md`: end-to-end mobile/offline integration checklist

The host game still owns its asset discovery, web manifest, update UI, network/API policy, and decisions about which large files are optional.

## Guarantees

- Editing an existing cached file can produce a new content-derived version.
- A failed critical precache cannot replace the currently active worker.
- Old version caches are removed during successful activation, not during download.
- Runtime cache writes are attached to the service-worker event lifetime.
- Large optional media can fail without making the playable offline shell fail.
- Updates wait for host approval instead of replacing code in the middle of a game.

These guarantees depend on generating the service worker during every build and serving it without an intermediary cache that hides new worker content.
