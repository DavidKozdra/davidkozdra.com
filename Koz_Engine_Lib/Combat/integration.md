# Combat Integration

Combat provides data-shape and movement primitives without owning balance.

- `statusBook.js`: normalize, stack, and clear host-named statuses.
- `projectileMotion.js`: homing, advance, and reflection.
- `collisionLayers.js`: masks and swept circle/rectangle hits.

The host supplies damage resolution, teams, status definitions, hit callbacks, and presentation.

```js
extensions.registerContent('combat.statuses', statusDefinitions);
extensions.registerSystem('combat.damage', damageResolver);
extensions.registerAdapter('combat.presentation', combatFxAdapter);
```

Never call sound, particles, achievements, or story code directly from a combat primitive.
