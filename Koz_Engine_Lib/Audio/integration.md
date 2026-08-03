# Audio Integration

Audio separates sound content, voice limits, mixing, and music state.

- Build a catalogue with `soundRegistry.js`.
- Route simultaneous voices through `mixerSystem.js`.
- Use `musicSystem.js` for track/mood decisions.
- Inject the Web Audio implementation, persistence, and visibility policy from the host.

Register `service:audio`, `content:audio.sounds`, and `content:audio.music`. UI volume controls should call the service rather than access audio nodes directly.

Track names, file paths, and game moods remain host content.
