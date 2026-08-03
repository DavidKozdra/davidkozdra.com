# NeoNyke Extraction Map

This review maps proven NeoNyke systems to reusable Koz Engine seams.

| NeoNyke source | Reusable engine destination | Current state | Keep host-owned |
|---|---|---|---|
| `js/simulation/SharedEnemyAI*` | `AI/` actor, dispatcher, navigation | Dispatcher and actor runtime integrated | Enemy names, attacks, phases, tuning |
| `js/simulation/SharedProjectileSystem.js` | `Combat/projectileMotion.js` | Motion integrated | Projectile content and damage effects |
| `js/simulation/SharedStatusSystem.js` | `Combat/statusBook.js`, `Time/stepTimer.js` | Bookkeeping integrated | Named effects, immunity and damage formulas |
| `js/game/world.js`, `js/game/combat.js` | `Core/spatialGrid.js`, `targetQuery.js`, collision layers | Query and sweep primitives available | Room-specific collision policy |
| `js/ui/settings-ui.js` | `UI/components/` | Tabs, controls, audio and HUD registry integrated | NeoNyke DOM, themes, widget definitions |
| `js/draw/three-renderer.js` | `Rendering3D/worldMapping.js` | Coordinate and pointer mapping integrated | Three.js meshes, materials and art |
| `js/simulation/SharedForgeSystem.js` | `Economy/` | Candidate | Upgrade schemas and progression balance |
| `js/simulation/SharedInventorySystem.js` | `Items/`, `Economy/` | Candidate | Item catalogue and character restrictions |
| `js/simulation/SharedRoomLifecycleSystem.js` | `World/`, `Events/` | Candidate | Authored room types and story triggers |
| `js/multiplayer/*`, `ProtocolV1.js`, `server/server.js` | `Multiplayer/` | Transport, protocol registry, resume/tab handoff, sequence windows, deltas, throttling, checkpoints, and Cloudflare adapter extracted; NeoNyke integrated as reference host | NeoNyke commands/schemas, simulation, room policy, deployment bindings |
| `js/core/game-state.js` | `Runtime/`, `SaveLoad/` | Partially shared | Run modes, campaign decisions and menus |
| `js/draw/*` particle/telegraph math | `VisualFX/` | Candidate | Art direction and rendering backend |

## Highest-Value Next Passes

1. Declarative combat timeline: telegraph → windup → resolve → recovery.
2. Stat modifier stack shared by items, difficulty, elites, buffs, and curses.
3. Fixed-tick replay capture and desync diagnostics on top of the extracted multiplayer checkpoints.
4. Room lifecycle adapter separating room state from authored room content.
5. DOM-independent HUD preview rendering hook so canvas widgets migrate cleanly.

Extraction is complete only when an engine module can be tested without `Neo`, browser globals, named game content, or renderer objects.
