# Audio

Reusable audio services and helpers belong here.

Current modules:

- `musicSystem.js`: generic music playback service with injected storage and audio-context dependencies
- `soundRegistry.js`: reusable sound registration and positional-volume helpers
- `mixerSystem.js`: priority voice allocation, decibel gain helpers, low-cut filters, music moods, and multi-source ducking

Do not place game-specific sound lists, scene logic, or UI wiring here.
