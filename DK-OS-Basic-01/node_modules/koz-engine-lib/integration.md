# Koz Engine Integration

Use this file as the entry point for embedding the engine in a game.

## Boundary

- Engine modules own reusable mechanics and contracts.
- The host owns characters, balance values, DOM IDs, art, authored rooms, story, and platform bootstrapping.
- Connect the two through injected callbacks, adapters, content tables, or `Core/extensionHost.js`.

## Composition

```js
const { createExtensionHost } = require('./Core/extensionHost');
const extensions = createExtensionHost();

extensions.registerService('audio', gameAudio);
extensions.registerAdapter('rooms', roomAdapter);
extensions.registerContent('enemies', enemyDefinitions);
extensions.registerComponent('hud.preview', HudPreview);
```

Create a scoped host for tests, scenes, or game modes. Scoped registrations override their parent without mutating it.

## Recommended Load Order

1. Core, Time, Events, and deterministic random services.
2. Achievements, Project/content schemas, and adapters.
3. Combat, AI, World, Items, and Economy systems.
4. Multiplayer contracts, game protocol mapping, and platform adapters.
5. Audio, VisualFX, Rendering3D, and UI presentation.
6. PWA build/runtime integration and platform bootstrap.
7. Host content and host bootstrap.

See each folder's `integration.md` and [`docs/neonyke-extraction-map.md`](docs/neonyke-extraction-map.md).
