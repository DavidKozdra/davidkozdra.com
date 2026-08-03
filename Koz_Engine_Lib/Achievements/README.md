# Koz Engine Achievements

`achievementSystem.js` is a content-agnostic achievement lifecycle:

- subscribes achievement rules to an injected event bus
- supports count, sum, maximum, latest-value, and unique-value progress
- separates lifetime progress from per-run progress
- prevents concurrent rule updates from losing progress
- deduplicates simultaneous unlock attempts
- persists through an injected store
- publishes achievement progress, unlock, reset, import, and clear events

The engine owns lifecycle and mechanics. A host game owns achievement names, descriptions, icons, event payloads, thresholds, platform synchronization, storage adapter, and presentation.

See `integration.md` for declarative rules, custom campaign rules, and persistence contracts.
