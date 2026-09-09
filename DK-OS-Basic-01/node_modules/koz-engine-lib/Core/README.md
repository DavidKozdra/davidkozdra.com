# Core

Use this folder for cross-game runtime primitives with no game-specific meaning.

Good fits:
- state machines
- spatial indexes
- lifecycle coordinators
- optional host bootstrap glue like `koz-engine.global.js`

Bad fits:
- feature-specific gameplay systems
- content definitions
- UI presentation code
