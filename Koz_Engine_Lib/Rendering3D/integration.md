# Rendering3D Integration

Rendering3D defines mapping contracts without choosing a rendering backend.

- `worldMapping.js` maps top-down `(x,y)` to 3D `(x,height,z)` and back.
- Use canvas/NDC helpers for cursor projection and HUD labels.
- Use ray/ground intersection for third-person aiming.
- Use `splitViewport()` for local multiplayer cameras.

Register a renderer as `service:rendering3d`; keep Three.js/Babylon/WebGPU objects inside that service. Gameplay state should remain renderer-neutral.

NeoNyke's mesh pools, textures, lighting, billboards, and art remain host presentation.
