# VisualFX Integration

VisualFX owns effect simulation data; renderers own drawing.

- Prefer `particleSystemCore.js` for reusable particle lifecycle/math.
- Inject spawn descriptors, random streams, and render callbacks.
- Keep colors, sprite keys, materials, and named attack effects in host content.
- Register renderer adapters separately for 2D and 3D.

`particleSystem.js` and `flightPath.js` retain p5/browser assumptions. Treat them as compatibility modules while moving pure behavior into the core.

Recommended keys: `system:vfx.particles`, `adapter:vfx.2d`, `adapter:vfx.3d`.
