# SaveLoad Integration

SaveLoad owns serialization flow, schema lookup, and storage drivers.

- Construct `SaveAPI` with an injected driver and serializer.
- Use `createMemoryDriver()` for tests and `createLocalStorageDriver()` in browsers.
- Register versions/migrations in `SchemaRegistry` before reading user data.
- Save stable IDs and plain data; never serialize DOM, Three.js, audio, or live actor instances.

Recommended keys: `service:save`, `content:save.schemas`, `adapter:save.platform`.

The host decides autosave timing, slots, cloud synchronization, and user-facing error handling.
