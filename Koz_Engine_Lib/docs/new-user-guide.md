# Koz Engine New User Guide

This guide is for developers who want to understand or reuse parts of `Koz_Engine_Lib` without first reverse-engineering the whole host game's codebase.

## What This Library Is

`Koz_Engine_Lib` is a **transitional engine extraction**, not a published package with a frozen API.

Use it as:

- a collection of reusable modules you can copy or require directly
- a reference for how the game is separating engine logic from game logic
- a source of tested helpers for state, save/load, world editing, timers, and similar systems

Do not assume:

- all modules are renderer-agnostic
- all modules are standalone
- all modules share one import style
- all modules are ready for reuse in another project

## Start With These Modules

These are the clearest entry points for new users:

- `Core/gameStateManager.js`
- `Core/spatialGrid.js`
- `Core/uiScreenController.js`
- `UI/uiManager.js`
- `SaveLoad/saveApi.js`
- `SaveLoad/storageDrivers.js`
- `SaveLoad/schemaRegistry.js`
- `Time/countdownTimer.js`
- `Time/dayNightCore.js`
- `Events/eventEngine.js`
- `Events/eventBus.js`
- `Events/notificationCenter.js`
- `Events/tipTracker.js`
- `Achievements/achievementSystem.js`
- `UI/mobileInput.js`
- `World/seededRng.js`
- `World/worldSpace.js`
- `World/worldEditor.js`
- `World/worldGenerators.js`
- `World/dungeonMaze.js`
- `Economy/stagedAcquisition.js`
- `Items/itemFactory.js`
- `Audio/musicSystem.js`
- `Audio/soundRegistry.js`
- `VisualFX/particleSystemCore.js`
- `PWA/cacheManifest.js`
- `PWA/serviceWorkerRuntime.js`
- `PWA/clientRegistration.js`

`Core/uiScreenController.js` and `UI/uiManager.js` solve the same problem — showing/hiding screens based on game state — at two levels: `uiScreenController.js` is the bare primitive (you call `onStateChange()` and `updateAll()` yourself), and `uiManager.js` wraps it with an animation-frame loop, automatic game-state-manager binding, and default button wiring so you don't have to. Start with `uiManager.js` unless you specifically want manual control over the update loop or state binding; see the [module catalog](module-catalog.md#core) for the full comparison.

## Avoid Starting With These

These modules still carry significant host, DOM, p5, or game-specific coupling:

- `Events/eventSystem.js`
- `Events/notificationManager.js`
- `Time/dayNightCycle.js`
- `Minigames/minigamesRuntime.js`
- `Assets/atlasHelper.js`
- `VisualFX/particleSystem.js`
- `VisualFX/flightPath.js`
- `Core/GameObject.js`

`AI/agentDispatcher.js`, `AI/actorStateMachine.js`, and `AI/astar.js` are clean reusable AI starting points for dispatch, actor lifecycle, explicit states, and grid pathfinding. The A* module accepts host callbacks for walkability, movement cost, heuristic, goal tolerance, and four- or eight-way neighbors while retaining its legacy tile-grid signature.

## How To Load Modules

### Preferred Current Pattern: CommonJS-style direct require

Most tested modules are consumed this way:

```js
const { GameStateManager } = require("./Koz_Engine_Lib/Core/gameStateManager");
const { createWorldSpace } = require("./Koz_Engine_Lib/World/worldSpace");
const { SaveAPI } = require("./Koz_Engine_Lib/SaveLoad/saveApi");
const { createMemoryDriver } = require("./Koz_Engine_Lib/SaveLoad/storageDrivers");
```

This matches the test suite in `tests/lib/`.

### Browser Global Bridge: Transitional Only

If you need browser globals, load [`Core/koz-engine.global.js`](../Core/koz-engine.global.js). It fetches every catalogued module via synchronous XHR, registers each one under `window.KozEngine`, and also publishes some legacy globals (`GameStateManager`, `SpatialGrid`, `KozSeededRNG`, etc.).

Example:

```html
<script src="Koz_Engine_Lib/Core/koz-engine.global.js"></script>
<script>
  const { GameStateManager } = window.KozEngine.Core.gameStateManager;
  const gsm = new GameStateManager();
</script>
```

This pulls in the whole module list at once (see the `moduleDefs` array in the file) using blocking XHR calls, so it is best suited to local/dev hosting rather than a production critical path. Prefer direct module loading when possible. The global bridge exists as host glue while the engine extraction is still in progress.

### Per-Module `<script>` Tags: Lightweight Alternative

If you only need a handful of modules and don't want the full `koz-engine.global.js` bridge, you can load individual engine files as plain `<script>` tags and let their existing CommonJS-style `module.exports` assignments land on a shared object. Several games in this repo use this pattern in production instead of the full bridge.

1. Before any engine `<script>` tags, install a minimal `module`/`exports` shim that copies each file's exports onto one global bucket:

   ```html
   <script>
     window.KozLib = {};
     window.module = {
       _v: {},
       get exports() { return this._v; },
       set exports(api) { this._v = api; Object.assign(window.KozLib, api); }
     };
   </script>
   ```

2. Load only the engine files you actually need, in any order that respects their internal dependencies. For example, a 2D game with mobile input and audio settings might load:

   ```html
   <script src="../../Koz_Engine_Lib/Core/gameStateManager.js"></script>
   <script src="../../Koz_Engine_Lib/Events/eventBus.js"></script>
   <script src="../../Koz_Engine_Lib/World/seededRng.js"></script>
   <script src="../../Koz_Engine_Lib/UI/mobileInput.js"></script>
   <script src="../../Koz_Engine_Lib/UI/controlBindings.js"></script>
   <script src="../../Koz_Engine_Lib/UI/components/audioSettings.js"></script>
   ```

3. Read the exports off `window.KozLib` from your own game script:

   ```js
   const gameStates = window.KozLib.GameStateManager ? new window.KozLib.GameStateManager() : null;
   const engineBus = window.KozLib.createEventBus?.() || { emit() {}, on() {} };
   const seeded = window.KozLib.SeededStream ? new window.KozLib.SeededStream(seed >>> 0) : undefined;
   ```

Caveats:
- Every loaded file's exports land on the *same* `window.KozLib` object, so a name collision between two engine files will silently overwrite one of them. Check the export names in each module before adding a new `<script>` tag.
- There is no dependency resolution: if module B expects module A's globals, A's `<script>` tag must appear first in the HTML.
- Always guard access (`window.KozLib.Thing?.()` or an `if` check) since a module you forgot to tag in will be `undefined`, not an error, until you use it.
- This works because the engine files already assign to `module.exports`; it does not work for files that only attach to `window` themselves (see the browser global bridge above for those).

## Best Usage Examples

For concrete usage, read the module source under each folder and the per-module
guidance in [`docs/module-catalog.md`](module-catalog.md). [`Core/koz-engine.global.js`](../Core/koz-engine.global.js)
shows how the full bridge wires every module in the browser; any game's `index.html`
that follows the pattern above shows the lightweight per-module `<script>` alternative.

## Read The Docs In This Order

1. [`README.md`](../README.md) for project status and boundaries
2. [`integration.md`](../integration.md) for composition and extension contracts
3. the relevant folder's `integration.md`
4. [`docs/module-catalog.md`](module-catalog.md) for per-module guidance
5. [`neonyke-extraction-map.md`](neonyke-extraction-map.md) for migration opportunities proven by NeoNyke

## Current Caveats

- The library is not versioned or packaged independently yet.
- Most modules use CommonJS-style exports, but not every file is consistent yet.
- Some files are still prototypes parked in the engine folder while they await cleanup.
- Some docs describe the target architecture, not just the current state. When that matters, prefer the module catalog and the tests.
