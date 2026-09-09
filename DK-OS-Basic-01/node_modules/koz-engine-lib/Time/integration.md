# Time Integration

Time provides wall-clock and fixed-step primitives.

- Use `stepTimer.js` inside deterministic simulation.
- Use `countdownTimer.js` for UI or real-time callbacks.
- Use `dayNightCore.js` for pure calendar/light calculations.
- Inject saves, events, and rendering into `dayNightCycle.js` when legacy compatibility is required.

Register one authoritative simulation clock as `service:time.simulation`. Avoid reading `Date.now()` from deterministic gameplay systems.
