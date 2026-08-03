# Multiplayer Platform Adapters

Platform adapters connect the engine contracts to a hosting or identity provider.

Each adapter should own:

- provider socket creation and closure
- platform identity normalization
- persistence and wake/sleep primitives
- provider-specific limits and errors

It should not own:

- game commands or schemas
- simulation rules
- character/content definitions
- UI

Create one subfolder per provider and include its own `integration.md`. A host can register the selected adapter through `Core/extensionHost.js`:

```js
extensions.registerAdapter("multiplayer.platform", platformAdapter);
```

The host's multiplayer composition should depend on the adapter contract, not import provider globals throughout the game.
