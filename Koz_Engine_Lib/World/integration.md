# World Integration

World owns serializable spaces, deterministic generation, and editing operations.

- Create deterministic random streams with `seededRng.js` and inject them into generators.
- Use `worldSpace.js` as the serializable world model.
- Use `worldEditor.js` for host-driven mutations and undoable editor actions.
- Use `worldGenerators.js` or `dungeonMaze.js` to produce layouts, then adapt them to host room content.

Register generators as systems and biome/tile definitions as content. Encounters, story rooms, art, and rewards remain host-owned.

Recommended keys: `service:world`, `system:world.generator`, `content:world.tiles`, `adapter:world.rooms`.
