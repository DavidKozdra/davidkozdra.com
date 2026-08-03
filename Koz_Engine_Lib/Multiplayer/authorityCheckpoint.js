"use strict";

const AUTHORITY_CHECKPOINT_VERSION = 1;

function cloneSerializable(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function createAuthorityCheckpoint(options) {
  const opts = options || {};
  const now = typeof opts.now === "function" ? opts.now() : Date.now();
  return {
    kind: String(opts.kind || "koz-authority-checkpoint"),
    version: AUTHORITY_CHECKPOINT_VERSION,
    schemaVersion: Math.max(1, Math.trunc(Number(opts.schemaVersion) || 1)),
    createdAt: Math.max(0, Number(now) || 0),
    revision: Math.max(0, Math.trunc(Number(opts.revision) || 0)),
    compatibility: cloneSerializable(opts.compatibility || {}),
    state: cloneSerializable(opts.state),
    runtime: cloneSerializable(opts.runtime || {}),
  };
}

function restoreAuthorityCheckpoint(checkpoint, options) {
  const opts = options || {};
  if (!checkpoint || typeof checkpoint !== "object") throw new TypeError("Authority checkpoint is required");
  if (checkpoint.version !== AUTHORITY_CHECKPOINT_VERSION) {
    const migration = opts.migrations?.[checkpoint.version];
    if (typeof migration !== "function") {
      throw new Error(`Unsupported authority checkpoint version: ${checkpoint.version}`);
    }
    return restoreAuthorityCheckpoint(migration(cloneSerializable(checkpoint)), options);
  }
  const expectedKind = opts.kind;
  if (expectedKind && checkpoint.kind !== expectedKind) throw new Error("Authority checkpoint kind mismatch");
  if (typeof opts.isCompatible === "function" && !opts.isCompatible(checkpoint.compatibility || {})) {
    throw new Error("Authority checkpoint is incompatible with this build");
  }
  return {
    schemaVersion: checkpoint.schemaVersion,
    createdAt: checkpoint.createdAt,
    revision: checkpoint.revision,
    compatibility: cloneSerializable(checkpoint.compatibility || {}),
    state: cloneSerializable(checkpoint.state),
    runtime: cloneSerializable(checkpoint.runtime || {}),
  };
}

module.exports = {
  AUTHORITY_CHECKPOINT_VERSION,
  createAuthorityCheckpoint,
  restoreAuthorityCheckpoint,
};
