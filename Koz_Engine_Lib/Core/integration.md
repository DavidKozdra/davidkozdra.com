# Core Integration

Core provides composition and low-level runtime primitives.

## Start Here

- `extensionHost.js`: register services, systems, content, adapters, and UI components.
- `gameStateManager.js`: application state transitions.
- `uiScreenController.js`: screen lifecycle driven by application state.
- `spatialGrid.js`, `targetQuery.js`, `geometry2d.js`: world queries and math.
- `GameObject.js`: optional lightweight object/collision model.

Do not place game content or DOM bootstrap in Core. Register it from the host:

```js
extensions.registerService('random', randomService);
extensions.registerSystem('simulation.fixedTick', fixedTickRunner);
```

Prefer a scoped extension host for tests and alternate game modes.
