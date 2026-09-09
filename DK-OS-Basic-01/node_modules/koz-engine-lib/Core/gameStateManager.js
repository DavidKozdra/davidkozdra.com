(function initGameStateManagerLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGameStateManagerApi() {
/**
 * Manages game state machine with transitions, callbacks, and transition rules.
 * Handles entering/exiting states and notifying listeners of state changes.
 */
class GameStateManager {
    constructor() {
      this.states = {};
      this.currentState = null;
      this.changeListeners = [];
      this.prev = null;
      this.allowedTransitions = null;
    }

    /**
     * Sets allowed state transitions using a map.
     * @param {Object} map - Object mapping state names to arrays of allowed next states
     *                       e.g., { "menu": ["playing", "paused"], "*": ["menu"] }
     */
    setTransitionRules(map) {
      this.allowedTransitions = {};
      for (const [from, toList] of Object.entries(map)) {
        this.allowedTransitions[from] = new Set(toList);
      }
    }

    /**
     * Registers a new game state with optional enter/exit callbacks.
     * @param {string} name - Unique state identifier
     * @param {Object} config - State configuration
     * @param {Function} [config.onEnter] - Called when entering the state
     * @param {Function} [config.onExit] - Called when exiting the state
     */
    addState(name, { onEnter = () => {}, onExit = () => {} } = {}) {
      this.states[name] = { onEnter, onExit };
    }

    /**
     * Transitions to a new state if allowed by transition rules.
     * Calls onExit of old state and onEnter of new state.
     * @param {string} newState - The state to transition to
     */
    setState(newState) {
      if (!this.states[newState]) {
        console.warn(`State "${newState}" not defined`);
        return;
      }

      const oldState = this.currentState;
      if (oldState === newState) return;

      if (this.allowedTransitions) {
        const wildcard = this.allowedTransitions["*"];
        const fromSet = oldState ? this.allowedTransitions[oldState] : null;
        const allowed = (wildcard && wildcard.has(newState)) || (fromSet && fromSet.has(newState));
        if (!allowed) {
          console.warn(`Blocked transition: "${oldState}" → "${newState}" (not allowed)`);
          return;
        }
      }

      this.prev = oldState;
      if (oldState && this.states[oldState].onExit) {
        try {
          this.states[oldState].onExit();
        } catch (err) {
          console.error(`[GameState] onExit failed for "${oldState}":`, err);
        }
      }

      this.currentState = newState;

      if (this.states[newState].onEnter) {
        try {
          this.states[newState].onEnter();
        } catch (err) {
          console.error(`[GameState] onEnter failed for "${newState}":`, err);
        }
      }

      const listeners = [...this.changeListeners];
      listeners.forEach((cb) => {
        try {
          cb(oldState, newState);
        } catch (err) {
          console.error(`[GameState] onChange listener failed for "${oldState}" -> "${newState}":`, err);
        }
      });

      if (
        typeof window !== "undefined" &&
        typeof window.dispatchEvent === "function" &&
        typeof window.CustomEvent === "function"
      ) {
        window.dispatchEvent(
          new window.CustomEvent("koz:state-change", {
            detail: { from: oldState, to: newState, state: newState },
          })
        );
      }
    }

    /**
     * Gets the current state name.
     * @returns {string|null} Current state name
     */
    getState() {
      return this.currentState;
    }

    /**
     * Checks if the current state matches the given state.
     * @param {string} state - State name to check
     * @returns {boolean} True if current state matches
     */
    is(state) {
      return this.currentState === state;
    }

    /**
     * Registers a callback for state change events.
     * @param {Function} callback - Function called with (oldState, newState)
     */
    onChange(callback) {
      if (typeof callback === "function") {
        this.changeListeners.push(callback);
      }
    }

    /**
     * Removes all registered state change listeners.
     */
    clearChangeListeners() {
      this.changeListeners = [];
    }
  }

  return { GameStateManager };
});
