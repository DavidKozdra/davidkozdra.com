(function initSchemaRegistryLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createSchemaRegistryApi() {
  class SchemaRegistry {
    constructor() {
      this._schemas = new Map();
    }

    register(name, def) {
      if (!name) throw new Error("Schema name is required");
      if (!def || typeof def !== "object") throw new Error("Schema definition is required");
      this._schemas.set(String(name), def);
      return this;
    }

    get(name) {
      return this._schemas.get(String(name)) || null;
    }

    has(name) {
      return this._schemas.has(String(name));
    }

    list() {
      return [...this._schemas.keys()];
    }
  }

  return { SchemaRegistry };
});
