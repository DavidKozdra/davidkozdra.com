# Items Integration

Items owns item construction and catalogue access while the host owns item meaning.

- Configure `itemFactory.js` with host definitions.
- Keep effect execution in injected combat/economy systems.
- Store stable item IDs in saves and network messages; resolve display data at presentation time.
- Validate definitions before a run starts.

Recommended keys: `content:items`, `system:items.effects`, `adapter:items.presentation`.

Do not put named NeoNyke relics, characters, or room rules in the engine factory.
