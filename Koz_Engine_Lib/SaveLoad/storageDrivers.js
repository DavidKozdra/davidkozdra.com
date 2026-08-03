(function initStorageDriversLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createStorageDriversApi() {
  function createLocalStorageDriver(storage) {
    const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!s) throw new Error("localStorage is unavailable");
    return {
      get(key) { return s.getItem(key); },
      set(key, value) { s.setItem(key, value); },
      remove(key) { s.removeItem(key); },
      has(key) { return s.getItem(key) !== null; },
    };
  }

  function createMemoryDriver() {
    const map = new Map();
    return {
      get(key) { return map.has(key) ? map.get(key) : null; },
      set(key, value) { map.set(key, String(value)); },
      remove(key) { map.delete(key); },
      has(key) { return map.has(key); },
    };
  }

  return {
    createLocalStorageDriver,
    createMemoryDriver,
  };
});
