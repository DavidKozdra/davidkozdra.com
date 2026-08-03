(function initItemFactoryLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createItemFactoryApi() {
  function normalizeTags(tags) {
    if (tags instanceof Set) return new Set(tags);
    if (Array.isArray(tags)) return new Set(tags);
    return new Set();
  }

  function calculateItemValue(item, modifiers, goldTarget) {
    const source = item || {};
    if (source.goalPercent) {
      return Math.floor(Number(source.goalPercent) * (Number(goldTarget) || 5000));
    }

    const opts = modifiers || {};
    const season = opts.season || null;
    const demandFactor = Number(opts.demandFactor) || 1;
    const supplyFactor = Number(opts.supplyFactor) || 1;
    const distanceFactor = Number(opts.distanceFactor) || 1;
    const holidayDemandBoost = Number(opts.holidayDemandBoost) || 1;

    var value = Number(source.baseValue) || 0;
    var seasonal = Array.isArray(source.seasonality) ? source.seasonality : [];

    if (season && seasonal.indexOf(season) !== -1) {
      value *= 1.25;
    }

    value *= Number(source.rarity) || 1;
    value *= demandFactor;
    value /= supplyFactor <= 0 ? 1 : supplyFactor;
    value *= distanceFactor;
    value *= holidayDemandBoost;

    return Math.max(1, Math.round(value));
  }

  class ItemRegistry {
    constructor(library) {
      this._library = library || {};
    }

    has(key) {
      return Object.prototype.hasOwnProperty.call(this._library, key);
    }

    get(key) {
      return this._library[key] || null;
    }

    keys() {
      return Object.keys(this._library);
    }

    values() {
      return Object.values(this._library);
    }

    entries() {
      return Object.entries(this._library);
    }

    byCategory(category) {
      return this.entries().filter(function onEntry(entry) {
        return entry[1] && entry[1].category === category;
      });
    }

    byTag(tag) {
      return this.entries().filter(function onEntry(entry) {
        return entry[1] && entry[1].tags instanceof Set && entry[1].tags.has(tag);
      });
    }

    toJSON() {
      return this.entries().map(function onEntry(entry) {
        return { key: entry[0], item: entry[1] };
      });
    }
  }

  function createLibrary(definitions, ItemCtor) {
    var defs = definitions || {};
    var ItemClass = ItemCtor;
    var library = {};

    Object.keys(defs).forEach(function createEntry(key) {
      var spec = defs[key] || {};
      // Schema-agnostic: pass the host's own fields straight through rather than
      // imposing a fixed field set. Only `tags` is normalized (to a Set) so that
      // ItemRegistry.byTag works for hosts that opt into tagging; hosts that
      // don't define tags get no `tags` property at all.
      var props = {};
      Object.keys(spec).forEach(function copyProp(prop) {
        props[prop] = spec[prop];
      });
      if ("tags" in spec) props.tags = normalizeTags(spec.tags);
      library[key] = new ItemClass(props);
    });

    return library;
  }

  function createRegistryFromLibrary(library) {
    return new ItemRegistry(library || {});
  }

  return {
    ItemRegistry: ItemRegistry,
    calculateItemValue: calculateItemValue,
    createLibrary: createLibrary,
    createRegistryFromLibrary: createRegistryFromLibrary,
  };
});
