"use strict";

function cloneSerializable(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function entitySignature(entity) {
  return JSON.stringify(entity);
}

function createEntityDelta(options) {
  const opts = options || {};
  const previous = opts.previous || {};
  const current = opts.current || {};
  const collections = Array.isArray(opts.collections) ? opts.collections.map(String) : [];
  const full = opts.full === true;
  const entities = {};
  const removedEntityIds = [];

  for (const collection of collections) {
    const before = previous[collection] || {};
    const after = current[collection] || {};
    const changed = {};
    for (const [entityId, entity] of Object.entries(after)) {
      if (full || !before[entityId] || entitySignature(before[entityId]) !== entitySignature(entity)) {
        changed[entityId] = cloneSerializable(entity);
      }
    }
    entities[collection] = changed;
    if (!full) {
      for (const entityId of Object.keys(before)) {
        if (!(entityId in after)) removedEntityIds.push(entityId);
      }
    }
  }

  return {
    version: 1,
    sequence: Math.max(0, Math.trunc(Number(opts.sequence) || 0)),
    tick: Math.max(0, Math.trunc(Number(opts.tick) || 0)),
    full,
    entities,
    removedEntityIds: [...new Set(removedEntityIds)],
  };
}

function applyEntityDelta(target, delta, options) {
  if (!target || typeof target !== "object") throw new TypeError("Entity delta target is required");
  if (delta?.version !== 1) throw new Error(`Unsupported entity delta version: ${delta?.version}`);
  const collections = Array.isArray(options?.collections)
    ? options.collections.map(String)
    : Object.keys(delta.entities || {});
  for (const collection of collections) {
    const changed = cloneSerializable(delta.entities?.[collection] || {});
    if (delta.full) target[collection] = changed;
    else Object.assign(target[collection] || (target[collection] = {}), changed);
  }
  for (const entityId of delta.removedEntityIds || []) {
    collections.forEach(collection => { delete target[collection]?.[entityId]; });
  }
  return target;
}

module.exports = { entitySignature, createEntityDelta, applyEntityDelta };
