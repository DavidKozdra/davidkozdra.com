# Assets Integration

Assets translates host asset metadata into renderer-friendly lookups.

- Register atlases with `atlasHelper.js`; keep URLs and sprite catalogues in host content.
- Inject image loading and drawing surfaces when supporting another renderer.
- Resolve logical asset IDs at the boundary so gameplay never depends on file paths.

Recommended extension keys: `service:assets.loader`, `content:assets.atlases`, and `adapter:assets.renderer`.

`atlasHelper.js` still assumes browser canvas/image behavior in places; wrap those calls for headless tests.
