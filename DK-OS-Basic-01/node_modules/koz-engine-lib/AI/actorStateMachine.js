(function initActorStateMachineLib(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createActorStateMachineApi() {
  'use strict';

  function finiteDelta(value) {
    const delta = Number(value);
    return Number.isFinite(delta) && delta > 0 ? delta : 0;
  }

  /**
   * Renderer-agnostic finite-state machine. State definitions may provide
   * enter, update, and exit callbacks; game-specific transitions and data stay
   * with the host that creates the machine.
   */
  class StateMachine {
    constructor({ initialState, states = {} } = {}) {
      this.states = { ...states };
      this.state = null;
      this.elapsed = 0;
      this.transition(initialState, undefined, undefined, true);
    }

    has(state) {
      return typeof state === 'string' && typeof this.states[state] === 'object' && this.states[state] !== null;
    }

    transition(nextState, context, payload, initial = false) {
      if (!this.has(nextState)) return false;
      const previousState = this.state;
      const previous = previousState ? this.states[previousState] : null;
      if (!initial && previous?.exit) {
        previous.exit(this._event(context, { previousState, nextState, payload }));
      }
      this.state = nextState;
      this.elapsed = 0;
      const current = this.states[nextState];
      if (current.enter) current.enter(this._event(context, { previousState, payload }));
      return true;
    }

    update(delta, context) {
      const current = this.states[this.state];
      if (!current) return false;
      const step = finiteDelta(delta);
      this.elapsed += step;
      const result = current.update?.(this._event(context, { delta: step }));
      if (typeof result === 'string') this.transition(result, context);
      else if (result && typeof result.state === 'string') this.transition(result.state, context, result.payload);
      return true;
    }

    _event(context, extra = {}) {
      return { machine: this, state: this.state, elapsed: this.elapsed, context, ...extra };
    }
  }

  /**
   * Small host-neutral actor wrapper. It binds an entity to an optional state
   * machine and update driver without imposing entity fields, rendering, or
   * combat rules.
   */
  class AgentActor {
    constructor({ entity, stateMachine = null, update = null } = {}) {
      this.entity = entity || null;
      this.stateMachine = stateMachine instanceof StateMachine ? stateMachine : null;
      this.updateDriver = typeof update === 'function' ? update : null;
    }

    transition(nextState, context, payload) {
      return this.stateMachine?.transition(nextState, context, payload) || false;
    }

    update(delta, context) {
      if (!this.entity) return false;
      const stateUpdated = this.stateMachine?.update(delta, { actor: this, entity: this.entity, host: context }) || false;
      const driverUpdated = this.updateDriver?.(this.entity, delta, context, this) === true;
      return stateUpdated || driverUpdated;
    }
  }

  function createStateMachine(options) { return new StateMachine(options); }
  function createAgentActor(options) { return new AgentActor(options); }

  return { StateMachine, AgentActor, createStateMachine, createAgentActor };
});
