# Koz Engine Module Catalog

This document explains what each current engine module is for, when to use it, and what host assumptions it still carries.

This is a **current-state** guide, not a promise that every module is fully standalone already.

## Before You Start

- Most modules in this folder are currently consumed via CommonJS-style `require(...)`.
- The tests in `tests/lib/` are the best concrete usage examples.
- If you need browser globals for the whole catalog, `Core/koz-engine.global.js` publishes modules under `window.KozEngine`, but that bridge is transitional host glue.
- If you only need a few modules in the browser, load them as individual `<script>` tags behind a small `module.exports` shim instead — see "Per-Module `<script>` Tags" in [new-user-guide.md](new-user-guide.md).
- If you are brand new to the engine, read [new-user-guide.md](new-user-guide.md) first.

## Core

### `Core/GameObject.js`

When to use:
- You need a lightweight entity base with shape metadata, tags, and collision helpers.

How to use:
- Extend `GameObject` and override `update()`, `draw()`, and `onCollision()`.
- Set geometry with `{ shape: "rect", width, height }` or `{ shape: "circle", radius }`.
- Use `collides(obj1, obj2)` for pair checks.
- Use `tagCollides(obj1, obj2, tagA, tagB)` for pair checks constrained by tags.
- Use `findCollisions(objects, { tagPairs, invokeCallbacks })` to scan many objects.

Current caveat:
- Small collections use a direct pair scan; larger collections use the module's spatial-hash broad phase.

### `Core/extensionHost.js`

When to use:
- You need to compose a game from engine services, systems, adapters, content, and UI components without reverse dependencies.

How to use:
- Create a root host with `createExtensionHost()`.
- Register typed extension points with `registerService`, `registerSystem`, `registerAdapter`, `registerContent`, or `registerComponent`.
- Use `scope()` for scene, match, test, or game-mode overrides.
- Package integrations as functions or objects with `install(host, options)`.

### `Core/gameStateManager.js`

When to use:
- You need a lightweight state machine with enter/exit hooks and optional transition rules.

How to use:
- Construct `new GameStateManager()`.
- Register states with `addState()`.
- Optionally define transitions with `setTransitionRules()`.
- Call `setState()` to transition.

### `Core/spatialGrid.js`

When to use:
- You need spatial bucketing for entity lookup in a 2D world.

How to use:
- Construct `new SpatialGrid(cellSize)`.
- Insert/update entities by world position.
- Query nearby cells instead of scanning full arrays.

### `Core/geometry2d.js` and `Core/targetQuery.js`

When to use:
- You need common 2D intersections, angle steering, or nearest-target selection.

How to use:
- Use `geometry2d` for segment and shape tests.
- Pass a host's spatially-filtered candidate visitor to `targetQuery.findNearestFromVisit(...)`.

### `Core/uiScreenController.js`

When to use:
- You need lifecycle control for state-driven UI screens: register a screen once, then let the controller show/hide it as the game state changes.
- You want the low-level primitive with no framework opinions — you drive it yourself.

How to use:
- Construct `new UIScreenController(logger)`.
- Register screens with `registerScreen(name, { create, show, hide, update, validStates })`. `create()` must return an object with `show()`/`hide()` methods (a DOM element wrapper, a canvas panel, whatever the host renders with).
- Call `onStateChange(newState)` yourself whenever the host's state machine changes state — this is what actually shows/hides screens whose `validStates` include `newState`.
- Call `updateAll()` yourself once per frame to run `update()` on active screens.
- Use `showScreen()`/`hideScreen()`/`hideAll()` for manual overrides outside normal state transitions.

See `UI/uiManager.js` below if you'd rather not wire the frame loop and state-manager binding by hand.

### `Core/koz-engine.global.js`

When to use:
- Only in browser builds that still need a single global bootstrap.

How to use:
- Load it once from `index.html`.
- Read modules from `window.KozEngine`.

Avoid when:
- You can import modules directly. This is host glue, not engine logic.

## PWA

### `PWA/cacheManifest.js`

When to use:
- A build needs a content-derived cache version and critical/optional asset tiers.

How to use:
- Call `createCacheManifest()` with a project root, same-origin URLs, optional URLs, and aliases such as `/` to `index.html`.
- Generate the service worker during every production build and verify it in CI.

### `PWA/serviceWorkerRuntime.js`

When to use:
- A browser game needs an atomic offline shell, bounded optional-media warming, coherent version caches, and explicit update activation.

How to use:
- Import it from a generated classic service worker.
- Call `KozPwaServiceWorker.install(self, hostConfig)`.
- Keep API and multiplayer route prefixes in `networkOnly`.

### `PWA/clientRegistration.js`

When to use:
- The host page needs registration, update notifications, controlled activation, optional cache warming, or storage quota information.

How to use:
- Create a client with `createPwaClient()`, then call `register()`.
- Connect `onUpdateAvailable` to a safe update/reload action in the host UI.

See [`../PWA/integration.md`](../PWA/integration.md) for the mobile/offline checklist.

## Multiplayer

### Transport and protocol

Use `Multiplayer/networkTransport.js` to define a provider-neutral socket/peer adapter. Use `protocolMap.js` to register the host game's wire names, validation, codecs, directions, and delivery intent without moving game schemas into the engine.

### Resume and tab ownership

Use `sessionDescriptor.js` and `resumeStore.js` for expiring bearer credentials. Use `tabCoordinator.js` to ensure one browser tab owns a player session, preferring Web Locks with a storage-lease fallback. `resilientSession.js` composes these services around host callbacks.

### Authority primitives

Use `sequenceWindow.js` for deduplication/order, `entityDelta.js` for generic entity collection snapshots, `rateLimiter.js` for message/byte budgets, and `authorityCheckpoint.js` for versioned state/runtime persistence.

### Platform adapters

`Platforms/Cloudflare/durableObjectAdapter.js` wraps hibernatable socket attachments, Durable Object Storage checkpoints, and alarms. The host still owns its Worker routes and authority simulation.

See [`../Multiplayer/integration.md`](../Multiplayer/integration.md) for the full client/authority handoff and [`../Multiplayer/Platforms/Cloudflare/integration.md`](../Multiplayer/Platforms/Cloudflare/integration.md) for deployment guidance.

## Time

### `Time/stepTimer.js`

When to use:
- A fixed-step simulation needs countdowns or a bounded repeating interval.

How to use:
- `advanceCountdown(remaining, delta)` never returns a negative value.
- `advanceInterval(remaining, delta, interval)` emits at most one tick each update.

### `Time/countdownTimer.js`

When to use:
- You need a reusable countdown timer.

How to use:
- Construct `new CountdownTimer(nowFn?)`.
- Call `start(seconds, onExpire)`, `clear()`, and `remainingSeconds()`.

### `Time/dayNightCore.js`

When to use:
- You need pure time-of-day math without rendering or save logic.

How to use:
- Call helpers such as `advanceTime()`, `getLightFactor()`, `getSeason()`, `getYear()`, and `getTimeString()`.

### `Time/dayNightCycle.js`

When to use:
- You need a host-composed day/night controller and can inject host hooks.

How to use:
- Construct `new DayNightCycle(length, options)`.
- Inject `core`, `eventTarget`, `onDayChanged`, `autoSave`, `canAutoSave`, `renderBackground`, and `renderOverlay` as needed.

Current caveat:
- This file still has host-level behavior and is not fully clean engine code yet.

## SaveLoad

### `SaveLoad/saveApi.js`

When to use:
- You need a storage-agnostic save/load facade.

How to use:
- Construct `new SaveAPI({ driver, serializer, key, sharePrefix })`.
- Use `save()`, `load()`, `readRaw()`, `writeRaw()`, `exportShareToken()`, and `importShareToken()`.

### `SaveLoad/storageDrivers.js`

When to use:
- You need a concrete storage driver for `SaveAPI`.

How to use:
- Use `createLocalStorageDriver(storage)` for browser persistence.
- Use `createMemoryDriver()` for tests or temporary runtime storage.

### `SaveLoad/schemaRegistry.js`

When to use:
- You need to register/query named schemas or payload contracts.

How to use:
- Construct `new SchemaRegistry()`.
- Store schema definitions with `register(name, def)`.

## Events

### `Events/eventBus.js`

When to use:
- Systems need reusable publish/subscribe delivery without depending on DOM events or host globals.

How to use:
- Create a bus with `createEventBus()`.
- Subscribe with `subscribe()`, `on()`, or `once()` and retain the returned unsubscribe function.
- Publish with `emit()` or await `emitAsync()` when persistence must finish.
- Use namespace wildcards sparingly for diagnostics and tooling.

### `Events/eventEngine.js`

When to use:
- You need pure event filtering, random selection, and history logic.

How to use:
- Call `filterEligibleEvents()`, `pickRandomEvent()`, and `appendHistory()` with host-provided data.

### `Events/eventSystem.js`

When to use:
- Only if you still need the legacy host event runtime it was extracted from.

How to use:
- Construct `new EventSystem(options)` and inject `CountdownTimer` and `eventEngine` where possible.

Current caveat:
- This still contains host-game runtime knowledge and should eventually move out or be split further.

### `Events/notificationManager.js`

When to use:
- You need to display game notifications with queueing, auto-expiration, and optional user actions.

How to use:
- Construct `new NotificationManager(options)` with optional `maxNotifications`, `colorPalette`, and timer functions.
- Call `log(message, type, duration, action)` to display a notification.
- Call `has(id)` to check if a notification is queued.
- Call `list()` to get all active notifications.
- Call `dismissAll()` to clear all notifications.

Features:
- Integrated queue management (previously separate NotificationCenter)
- DOM/p5.js rendering with fade animations
- Auto-expiration with customizable duration
- Optional click actions with custom buttons
- Automatic cleanup on overflow
- Color customization per notification type

Current caveat:
- Requires p5.js `createDiv`, `select`, and `createButton` functions for rendering.
- Falls back gracefully if p5.js is unavailable (queue only, no rendering).

### `Events/notificationCenter.js` (DEPRECATED)

Use `notificationManager.js` instead. This file is now a backward-compatibility shim that re-exports `NotificationManager`.

### `Events/tipTracker.js`

When to use:
- You need persistence for one-time tutorial, onboarding, or contextual help prompts.

How to use:
- Construct `new TipTracker({ storage, storageKey, enabled })`.
- Use `shouldShow()`, `markShown()`, `markMany()`, `reset()`, and `getProgress()`.

Why it lives in `Events/`:
- It tracks whether a host-triggered event or help prompt has already fired. It is closer to notification/event delivery than to a standalone gameplay domain.

## Achievements

### `Achievements/achievementSystem.js`

When to use:
- A game needs event-driven achievement progress, unlock deduplication, run/lifetime scopes, and injected persistence.

How to use:
- Inject an `Events/eventBus.js` instance, definitions, a store, and presentation callbacks.
- Use declarative count/sum/max/latest/unique rules for simple achievements.
- Use `system.subscribe()` for authored campaign rules involving several facts.
- Call `resetRunProgress()` at run start and `dispose()` when the owning scope ends.

Current caveat:
- NeoNyke still owns its existing IndexedDB achievement schema and authored handlers. Its publishers use the engine event bus; storage/lifecycle migration can happen independently.

## UI

### `UI/modalPrimitives.js`

When to use:
- You need reusable DOM button builders for modal overlays.

How to use:
- Call `removeById()`, `createCloseIconButton()`, and `createBackButton()` with a host `document`.

### `UI/uiManager.js`

When to use:
- You want `Core/uiScreenController.js`'s screen lifecycle plus the wiring around it done for you: an animation-frame update loop, automatic binding to a global game-state manager, canvas-relative UI positioning, and default click handling for `data-action` buttons.
- You are building a screen/menu system (title screen, pause menu, HUD, settings panel, game-over screen) and don't want to hand-roll the state-to-visibility glue every time.

How to use:
- Construct `new UIManager({ controllerClass, controller, logger })`. With no options it builds its own internal `UIScreenController` (or an equivalent fallback if that module isn't loaded) — you do not have to construct one yourself first.
- Register each screen exactly as you would with `UIScreenController`: `manager.registerScreen(name, { create, show, hide, update, validStates })`.
- Drive visibility either manually with `onGameStateChange(newState)`/`showScreen()`/`hideScreen()`/`updateAll()`, or automatically:
  - `bindToStateManager(stateManager, options)` subscribes to any object exposing `onChange(cb)`/`getState()` (for example `Core/gameStateManager.js`'s `GameStateManager`) and calls `onGameStateChange()` for you on every transition.
  - `startAutoUpdate(options)` / `stopAutoUpdate()` run `updateAll()` on a `requestAnimationFrame` loop instead of you calling it every frame.
  - `initRuntimeUi(options)` is the all-in-one convenience call: it binds to the global state manager, starts the auto-update loop, keeps `.app-ui`/`[data-koz-ui-root]` DOM nodes aligned to the game canvas on resize, and (via `bindDefaultStateActions`) wires `<button data-action="start|ready|reset|pause">` clicks to state transitions automatically.
- If you construct a `UIManager` without arguments in a browser, the library also publishes it as `window.uiManager` (via `root.KozUIManager`) so other host scripts can reach the same instance without you threading it through every call site.

Current caveat:
- The "automatic" helpers (`initRuntimeUi`, `bindDefaultStateActions`, `useGlobalStateManager`) assume a single global game-state manager (`root.KozStateManager`) and a `<canvas>` element in the document. If your host has multiple state machines or no canvas, use the manual `onGameStateChange()`/`updateAll()` path instead, or pass an explicit `stateManager` to `bindToStateManager()`.

### `UI/characterController.js`

When to use:
- A host needs a single normalized movement vector from held keyboard controls
  or a gamepad's left stick.

How to use:
- Construct `new CharacterController({ bindings, eventTarget, navigatorApi })`.
- Call `sample()` during the host update loop and pass its bounded `x`/`y`
  values into the host's own authoritative movement or command system.
- Call `clear()` when leaving direct-control gameplay and `detach()` when the
  controller's owning screen is destroyed.

### `UI/mobileInput.js`

When to use:
- You need touch/mobile detection, pinch-zoom math, or client-to-canvas coordinate mapping.

How to use:
- Call helpers like `isTouchMobile()`, `clampZoom()`, `beginPinchGesture()`, `updatePinchGesture()`, and `mapClientToCanvas()`.

Why it lives in `UI/`:
- This is UI-facing interaction math, not a standalone engine domain.

## Visual (FX)

### `VisualFX/particleSystemCore.js`

When to use:
- You need pooled particle simulation without presentation code.

How to use:
- Construct `new ParticleSystemCore({ poolSize, random })`.
- Use `spawn()`, `spawnBurst()`, `update()`, and inspect active particles.

### `VisualFX/particleSystem.js`

When to use:
- You need the current particle runtime with optional atlas drawing.

How to use:
- Construct `new ParticleSystem({ poolSize, ParticleSystemCore })`.
- Call `spawn()`, `spawnBurst()`, `update()`, `render()`, and `renderToScreen()`.

Current caveat:
- This still expects host drawing APIs and sits closer to presentation than pure simulation.

### `VisualFX/flightPath.js`

When to use:
- You need reusable motion/path helpers for flying or arcing visuals.

Current caveat:
- This file still needs fuller boundary review before it should be treated as a stable engine surface.

## World

### `World/seededRng.js`

When to use:
- You need deterministic seeded randomness across runs or named streams.

How to use:
- Use `SeededRNG.startRun(seed)`.
- Get streams with `SeededRNG.stream(name)`.
- Use `namedRandom()` when you want a simple helper wrapper.

Good fit:
- Terrain generation
- Spawn rolls
- Replayable worldgen

### `World/worldSpace.js`

When to use:
- You need a generic grid-backed world model plus placed elements that live in world coordinates.

How to use:
- Construct `createWorldSpace({ cols, rows, defaultCell })`.
- Read and write cells with `getCell()`, `setCell()`, `fillCells()`, and `resize()`.
- Add and query placed world elements with `addElement()`, `listElements()`, `findElementAt()`, and `removeElementById()`.

Why it matters:
- This is the engine definition of world space. Terrain cells and placed objects share the same coordinate system, so games and editors can agree on what exists at tile `x,y`.

### `World/worldEditor.js`

When to use:
- You need reusable editor operations over a world model instead of hardcoding a one-off map editor.

How to use:
- Construct `createWorldEditor({ world })`.
- Use `paintArea()`, `paintLine()`, `floodFill()`, `placeElement()`, `selectElementAt()`, `deleteSelection()`, `undo()`, and `redo()`.

Why it matters:
- The editor code stays generic. The host changes what gets placed by changing the element kind and data, not by rewriting the editor core.

### `World/worldGenerators.js`

When to use:
- You need reusable scalar-field generation primitives for terrain, biome masks, influence maps, or other grid classifiers.

How to use:
- Build numeric fields with `createField()`.
- Refine them with `smoothField()` and `normalizeField()`.
- Turn them into cells with `classifyField()` or `buildWorldCells()`.

Good fit:
- Terrain generation
- Biome masks
- Influence maps
- Height-field driven level layouts

### `World/dungeonMaze.js`

When to use:
- You need a reusable maze or dungeon floorplan generator.

How to use:
- Call `generateDungeonMaze({ cols, rows, rng, roomAttempts, roomMinSize, roomMaxSize, wallTile, floorTile })`.
- Use the returned `grid`, `rooms`, `start`, and `exit` to build a game-specific map or feed an editor.

Good fit:
- Dungeon floorplans
- Maze prototypes
- Roguelike room graphs

## Combat

### `Combat/statusBook.js`

When to use:
- Entities need a normalized map of named, stackable statuses.

How to use:
- Use `ensureStatusMap()` to repair host data and `applyStackedStatus()` for capped stack/duration merges.
- Keep game-specific status names, damage, immunities, and visuals in the host.

### `Combat/projectileMotion.js`

When to use:
- A projectile needs renderer-independent homing, movement, or reflection.

How to use:
- Call `steerHomingProjectile()`, `advanceProjectile()`, and `bounceProjectile()` on a host-owned projectile record.

### `Combat/collisionLayers.js`

Use collision bitmasks to decide which host entities interact, and `sweepCircleRect()` or `findFirstSweepHit()` for continuous projectile collision against obstacle rectangles.

## AI

### `AI/navigationAgent.js`

Use `NavigationAgent` to cache a host-provided path, consume waypoints, and limit repaths when the target has not moved enough. The host supplies pathfinding and applies the returned movement direction.

### `AI/agentDispatcher.js`

When to use:
- Your game has type-specific agent handlers but needs one consistent update pipeline.

How to use:
- Create a dispatcher with `createTypedAgentDispatcher({ updateMethodByType, fallbackUpdateMethod, beforeUpdate? })`.
- Pass the host's agent, delta, and handler context to `dispatcher.update(...)`.

This module deliberately has no game entity types or combat rules. The host owns those as content.

### `AI/actorStateMachine.js`

When to use:
- Your game needs explicit enter/update/exit states for actors, enemies, NPCs, or scripted objects.

How to use:
- Build a `StateMachine` with named state definitions, then place it on an `AgentActor`.
- State callbacks receive the machine, current state, elapsed time, caller context, and transition payload.

The module manages lifecycle only. The host still decides state names, transitions, movement, abilities, and rendering.

### `AI/astar.js`

When to use:
- Your game needs deterministic grid pathfinding with reusable heap and typed-array search storage.

How to use:
- Call `aStar({ width, height, start, goal, isWalkable?, movementCost?, heuristic?, isGoal?, neighbors?, maxIterations? })` for host-defined grids and dynamic obstacles.
- Choose `CARDINAL_NEIGHBORS` or `EIGHT_WAY_NEIGHBORS`, or supply another array of relative offsets.
- Existing callers may continue using `aStar(grid, start, goal, allowWater?, portCities?, waterOnly?)`.
- Use `MinHeap` only if you need the heap separately.

## Audio

### `Audio/musicSystem.js`

When to use:
- You need background music switching and persisted volume.

How to use:
- Construct `new MusicSystem(mainTrack, otherTracks, options)`.
- Use the playback and volume controls exposed by the class.

Current caveat:
- This is reusable, but it still assumes an audio-like host object model and optional persistence wiring rather than providing a full engine-agnostic audio abstraction.

### `Audio/soundRegistry.js`

When to use:
- You need sound metadata registration and simple positional/volume helpers.

How to use:
- Create a registry with `createSoundRegistry()`.
- Register sound definitions with `register(id, config)`.

## Items

### `Items/itemFactory.js`

When to use:
- You need reusable item value math and item registry behavior.

How to use:
- Use `calculateItemValue()` for pricing logic.
- Use `ItemRegistry` to manage a host-supplied item library.

## Economy

### `Economy/stagedAcquisition.js`

When to use:
- You need generic multi-stage costs or staged ownership flow.

How to use:
- Call `computeStageCosts(input)` and `resolveCurrentStage(input)`.

## Minigames

### `Minigames/manager.js`

When to use:
- You need a generic registry-driven minigame manager.

How to use:
- Construct `new MinigameManager(options)`.
- Register factories with `register(id, factory)`.
- Start/stop with `start()` and `stop()`.

### `Minigames/minigamesRuntime.js`

When to use:
- Only if you still need the legacy host browser runtime for minigames.

Current caveat:
- This still contains browser/p5 wiring and should be split further.

## Assets

### `Assets/atlasHelper.js`

When to use:
- You need atlas frame lookup and atlas registration.

How to use:
- Register atlases, then query `getFrame()` or `has()`.

Current caveat:
- DOM canvas creation and p5-oriented drawing still make this more host-coupled than it should be.
