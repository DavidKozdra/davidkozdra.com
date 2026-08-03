# Minigames Integration

Minigames should expose lifecycle and result contracts while hosts supply individual game content.

- Register minigame factories with `MinigameManager`.
- Standardize `start`, `update`, `input`, `finish`, and serializable result payloads.
- Inject rendering, audio, random, rewards, and input services.
- Run a minigame in an extension scope so temporary overrides do not affect the main game.

`minigamesRuntime.js` contains many browser/p5 assumptions. Extract a minigame's rules before reusing it in another renderer.
