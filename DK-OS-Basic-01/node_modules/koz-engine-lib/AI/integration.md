# AI Integration

AI owns reusable agent lifecycle, dispatch, state transitions, navigation, and pathfinding.

- Wrap host entities with `AgentActor`.
- Put generic enter/update/exit behavior in `StateMachine` definitions.
- Use `createTypedAgentDispatcher()` to map host content types to injected handlers.
- Feed host path results into `NavigationAgent`; it owns caching and waypoint consumption.
- Use `aStar()` with host-supplied walkability and movement-cost callbacks for dynamic grids; the legacy tile-grid signature remains available for older games.

Register definitions as content and behavior factories as systems. Enemy names, attack values, and boss scripts stay in the game.
