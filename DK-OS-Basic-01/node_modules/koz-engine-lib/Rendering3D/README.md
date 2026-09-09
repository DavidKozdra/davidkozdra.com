# Koz Rendering3D

`Rendering3D/` maps renderer-neutral 2D gameplay state into a 3D presentation. It does not depend on Three.js, Babylon.js, WebGPU, DOM nodes, meshes, materials, or game content.

## Modules

- `worldMapping.js`: coordinate systems, direction/yaw conversion, NDC/canvas mapping, arbitrary ray-plane intersections, projection/unprojection callbacks, split-screen layouts, viewport lookup, and room clamping.
- `cameraRig.js`: view-mode policy, yaw/pitch input, camera-relative movement, framerate-independent smoothing, coherent shake, FOV selection, and first-/third-person camera poses.
- `roomGeometry.js`: open-door/secret-passage resolution, wall and corridor plans, elevation policy, and stable room geometry signatures.

See [integration.md](integration.md) for a complete renderer adapter.

## Boundary

The engine owns mathematical policy and serializable plans. The host renderer owns:

- camera, vector, raycaster, mesh, texture, material, and light objects
- asset lookup and artistic dimensions
- visibility, pooling, depth sorting, and draw submission
- platform-specific pointer lock and WebGL recovery

A headless authority may use camera-relative movement mapping, but it must never need a renderer object.
