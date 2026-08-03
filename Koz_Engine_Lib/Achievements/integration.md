# Achievements Integration

Achievements consume domain events; gameplay systems should not call achievement UI or persistence directly.

## Basic composition

```js
const { createEventBus } = require("../Events/eventBus");
const {
  createAchievementSystem,
  createMemoryAchievementStore,
} = require("./achievementSystem");

const events = createEventBus();
const achievements = createAchievementSystem({
  eventBus: events,
  store: createMemoryAchievementStore(),
  definitions: [
    {
      id: "hundred_kills",
      name: "Centurion",
      rule: {
        event: "enemy:killed",
        mode: "count",
        target: 100,
      },
    },
    {
      id: "heavy_hit",
      name: "Heavy Hit",
      rule: {
        event: "damage:dealt",
        mode: "max",
        value: "amount",
        target: 1000,
      },
    },
  ],
  onUnlocked({ definition }) {
    achievementPresentation.showUnlock(definition);
  },
});

await achievements.start();
events.emit("enemy:killed", { enemyType: "slime" });
```

Call `emitAsync()` when the caller must wait for achievement persistence or platform synchronization. Normal simulation publishers can call synchronous `emit()`; asynchronous listener failures are contained and reported by the event bus.

## Rule modes

- `count`: add one by default, or add the configured/payload value
- `sum`: add a numeric value
- `max`: retain the largest numeric value
- `latest`: retain the most recent value
- `unique`: retain distinct values and compare their count with the target

`value` may be:

- a constant
- a payload property name
- `(payload, context) => value`

Use `where(payload, context)` to ignore irrelevant events.

```js
{
  id: "campaign_speedrun",
  rule: {
    event: "run:won",
    mode: "latest",
    value: "seconds",
    where: payload => payload.mode === "campaign",
    when: ({ payload }) => payload.seconds <= 300,
  },
}
```

Use `scope: "run"` for progress that resets between runs. Call `resetRunProgress()` at the authoritative run-start boundary.

## Custom rules

Some achievements combine several systems or authored campaign rules. Subscribe through the achievement system so filtering, disposal, and helpers remain consistent:

```js
achievements.subscribe("run:won", async (payload, api) => {
  const validCampaign = payload.mode === "campaign" && payload.finalBossDefeated;
  if (validCampaign && payload.seconds <= 300) {
    await api.unlock("campaign_speedrun", { seconds: payload.seconds });
  }
});
```

Keep character IDs, mode names, story flags, and balance thresholds in host definitions or handlers—not in Koz Engine.

## Persistence adapter

Inject:

```js
const store = {
  async load() {
    return {
      unlocked: {
        heavy_hit: { id: "heavy_hit", unlockedAt: 1700000000000 },
      },
      progress: {
        hundred_kills: 42,
      },
    };
  },
  async save(snapshot) {
    // Transactionally replace achievement state.
  },
};
```

`save()` should be transactional. Persist lifetime progress and unlock records together so a crash cannot retain the reward while losing its unlock—or vice versa.

Platform achievements should subscribe to `achievement:unlocked` and synchronize idempotently. Local unlock success should not be rolled back merely because Steam, Game Center, Play Games, or another remote platform is temporarily unavailable.

## Event contracts

Use stable names such as:

- `damage:dealt`
- `enemy:killed`
- `item:collected`
- `floor:reached`
- `run:started`
- `run:won`
- `run:ended`

Payloads should be serializable and describe facts that already happened. Do not publish an intent like `enemy:kill`; publish the confirmed result `enemy:killed`.

For multiplayer, only the authoritative simulation should publish achievement-driving events. Clients may render progress but must not independently award authoritative achievements.

## NeoNyke boundary

NeoNyke currently keeps its authored achievement catalogue, IndexedDB records, counters, and toast presentation in `js/achievements.js` and `js/achievementManager.js`. Its gameplay publishers now use `KozEngine.Events.eventBus`.

Future migration can move its storage/unlock lifecycle to `AchievementSystem` without putting NeoNyke-specific character names, modes, or thresholds into the engine.
