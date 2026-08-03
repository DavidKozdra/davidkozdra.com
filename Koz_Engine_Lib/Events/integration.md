# Events Integration

Events provides domain event delivery, notifications, and one-time tip tracking.

- Use `eventBus.js` for publish/subscribe domain events. `eventEngine.js` is specifically for conditional/random authored-event selection.
- Register event names in host content; payloads should be serializable where possible.
- Presentation subscribes through an adapter instead of gameplay calling UI directly.
- Persist `TipTracker` state through the host save service.

```js
const events = createEventBus({
  onError: (error, context) => logger.error(context.topic, error),
});

const unsubscribe = events.subscribe('enemy:killed', payload => {
  stats.recordKill(payload.enemyType);
});

events.emit('enemy:killed', { enemyType: 'slime' });
unsubscribe();
```

Use namespace wildcards such as `combat:*` for diagnostics and `*` only for tooling. Always retain and call the returned unsubscribe function when a scene, match, UI, or plugin is disposed.

`emit()` starts asynchronous listeners and contains their failures. Use `await emitAsync()` when the publisher must wait for subscribers.

`eventSystem.js` and `notificationManager.js` contain legacy host assumptions. Treat them as migration sources, not clean dependencies.

Recommended keys: `service:events.bus`, `adapter:events.presentation`, `content:events.catalogue`.
