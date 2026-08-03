(function initAgentDispatcherLib(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAgentDispatcherApi() {
  'use strict';

  /**
   * Creates a content-agnostic dispatcher for an agent's update state machine.
   * The host owns its agent types and handlers; the engine owns the common
   * validation, pre-update hook, and handler invocation path.
   *
   * @param {Object} options
   * @param {Object<string, string>} [options.updateMethodByType] maps a host type to a context method.
   * @param {string} options.fallbackUpdateMethod context method for unknown types.
   * @param {Function} [options.beforeUpdate] returns true when it fully handled the update.
   * @returns {{ updateMethodForType: Function, update: Function }}
   */
  function createTypedAgentDispatcher({
    updateMethodByType = {},
    fallbackUpdateMethod,
    beforeUpdate = null,
  } = {}) {
    const methodByType = Object.freeze({ ...updateMethodByType });
    const fallback = String(fallbackUpdateMethod || '');

    function updateMethodForType(type) {
      return methodByType[String(type || '').toLowerCase()] || fallback;
    }

    function update(agent, delta, context) {
      if (!agent || !context) return false;
      if (typeof beforeUpdate === 'function' && beforeUpdate(agent, delta, context)) return true;
      const handler = context[updateMethodForType(agent.type)];
      if (typeof handler !== 'function') return false;
      handler(agent, delta);
      return true;
    }

    return Object.freeze({ updateMethodForType, update });
  }

  return { createTypedAgentDispatcher };
});
