# Koz Engine Lib

`Koz_Engine_Lib` is the reusable, game-agnostic engine layer.

It is useful today, but it is still **transitional** rather than a finished standalone package.

## Repository Layout

The library has one shared copy at the repository root. Each game is a sibling
directory, rather than an owner of its own engine copy:

```
DK-Arcade/
├── Koz_Engine_Lib/
└── games/
    ├── Carnage/
    └── AnotherGame/
```

Browser hosts load engine files through `../../Koz_Engine_Lib/...` from their game
directory. Node imports use the relative path appropriate for the importing file.
Serve the repository root when developing or deploying games so sibling paths are
available. Do not copy the library into a game directory.

## Start Here

If you are new to the engine, read these first:

1. [new-user-guide.md](docs/new-user-guide.md)
2. [module-catalog.md](docs/module-catalog.md)
3. the module source under each folder for real usage examples
4. [integration.md](integration.md) for host composition and per-folder integration guides

## What This Folder Is Trying To Guarantee

The intended boundary is:

1. The engine must not know which game is using it.
2. A game may depend on the engine.
3. The engine may not depend on any specific game.

## Current State

The export-decoupling pass is largely done, but the engine is not fully clean yet.

What remains:

- some engine files still reference game globals, DOM, p5, or save/UI runtime details
- a few files in this folder are still better described as "candidate engine code" than stable engine API
- the browser global bridge still exists as temporary host glue
- export format is still mixed across the folder during migration

See [module-catalog.md](docs/module-catalog.md) for the current per-module guidance and caveats.

## Good First Modules

If you want modules that are easiest to understand and safest to reuse first, start with:

- `Core/gameStateManager.js`
- `Core/spatialGrid.js`
- `Core/uiScreenController.js`
- `UI/uiManager.js`
- `SaveLoad/*`
- `Time/countdownTimer.js`
- `Time/dayNightCore.js`
- `Events/eventEngine.js`
- `Events/notificationManager.js`
- `Events/tipTracker.js`
- `UI/mobileInput.js`
- `World/*` except game-specific host composition
- `Economy/stagedAcquisition.js`
- `Items/itemFactory.js`
- `Audio/*`
- `VisualFX/particleSystemCore.js`

## Modules To Treat As Host-Coupled

These are documented, but they are not the right first stop for new users:

- `Events/eventSystem.js`
- `Events/notificationManager.js`
- `Time/dayNightCycle.js`
- `Minigames/minigamesRuntime.js`
- `Assets/atlasHelper.js`
- `VisualFX/particleSystem.js`
- `VisualFX/flightPath.js`
- `Core/GameObject.js`

## How To Read The Folder

- `README.md`: project boundary and current status
- `docs/new-user-guide.md`: fastest onboarding path
- `docs/module-catalog.md`: what each module does today

## Final Rules

Modules in `Koz_Engine_Lib` should eventually follow these rules:

1. Export code only. No global namespace mutation.
2. No direct `window`, `document`, `localStorage`, or p5 dependency in engine modules.
3. No game-specific nouns, globals, content tables, or screen logic.
4. Host-specific bootstrapping belongs in a separate bootstrap/composition layer.
5. Content packs belong to the game, not the engine.

## Target Folder Names

The active folder structure should be explicit:

- `AI/`: pathfinding and agent-support logic
- `Achievements/`: event-driven achievement rules, progress, unlocks, and persistence contracts
- `Combat/`: renderer-neutral status, projectile, and combat-runtime primitives
- `Assets/`: asset lookup and atlas registry helpers
- `Audio/`: reusable audio services
- `Core/`: generic runtime primitives and bootstrap entrypoints
- `Economy/`: reusable staged ownership/economy helpers
- `Events/`: generic event rules, notification helpers, and tutorial/tip tracking
- `Items/`: generic item math and registries
- `Minigames/`: minigame orchestration and runtimes
- `Multiplayer/`: transport, protocol mapping, resume/tab recovery, snapshots, authority persistence, and platform adapters
- `PWA/`: content-versioned offline builds, service-worker runtime, and update registration
- `SaveLoad/`: save/load APIs, drivers, and schemas
- `Time/`: clocks, timers, and day-cycle helpers
- `UI/`: renderer-agnostic UI primitives
- `UI/mobileInput.js`: touch/input math and gesture helpers
- `VisualFX/`: reusable visual (FX) logic
- `World/`: deterministic world space, world-generation helpers, and editor-facing world tools

Removed vague buckets:

- `api/`
- `io/`
- `progression/`
- `browser/`

See [module-catalog.md]

## What Does Not Belong Here

- game-specific UI flow
- host game globals
- game save orchestration
- DOM input wiring
- p5 rendering behavior

## Short Principle

If a new game could not use a module without learning another game's internals, that module is not ready to live in `Koz_Engine_Lib`.
