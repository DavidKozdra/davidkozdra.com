# Project Integration

Project converts serialized editor/project data into runtime-facing data.

- Normalize incoming projects with `projectSchema.js` before runtime creation.
- Use `projectAdapters.js` to resolve the active scene, world, and objects.
- Inject constructors and factories; Project must not import a host game's classes.
- Add host-only components under `components` and register an adapter that understands them.

```js
extensions.registerAdapter('project.objects', {
  create: data => projectToGameObjects(GameObject, data.objects, data.prefabs),
});
```

Version schema changes and migrate data at this boundary, not inside gameplay systems.
