# Runtime Integration

Runtime composes project data, objects, scripts, animation, input, and host services.

- Pass `createWorldSpace`, `GameObject`, and project adapters to `createGameRuntime()`.
- Register renderer, audio, input, save, and networking as services rather than globals.
- Keep fixed-tick simulation authoritative; renderers should consume state.
- Create a child extension scope per scene or match when overrides are needed.

Host scripts may query runtime objects, but engine runtime code must not know campaign names or UI IDs.
