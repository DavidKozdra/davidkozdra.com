"use strict";

const DIRECTIONS = Object.freeze({
  CLIENT_TO_AUTHORITY: "client-to-authority",
  AUTHORITY_TO_CLIENT: "authority-to-client",
  BIDIRECTIONAL: "bidirectional",
});

function identity(value) {
  return value;
}

function normalizeDefinition(name, definition) {
  const source = definition || {};
  const wireType = String(source.wireType || name).trim();
  if (!wireType) throw new TypeError("Protocol wire type is required");
  const direction = source.direction || DIRECTIONS.BIDIRECTIONAL;
  if (!Object.values(DIRECTIONS).includes(direction)) throw new RangeError(`Invalid direction: ${direction}`);
  return Object.freeze({
    name,
    wireType,
    direction,
    version: Math.max(1, Math.trunc(Number(source.version) || 1)),
    delivery: Object.freeze({
      reliability: source.delivery?.reliability || "reliable",
      channel: source.delivery?.channel || "control",
      replaceable: source.delivery?.replaceable === true,
    }),
    encode: typeof source.encode === "function" ? source.encode : identity,
    decode: typeof source.decode === "function" ? source.decode : identity,
    validate: typeof source.validate === "function" ? source.validate : null,
  });
}

class ProtocolMap {
  constructor(options) {
    const opts = options || {};
    this.protocolVersion = Math.max(1, Math.trunc(Number(opts.protocolVersion) || 1));
    this.byName = new Map();
    this.byWireType = new Map();
  }

  register(name, definition) {
    const key = String(name || "").trim();
    if (!key) throw new TypeError("Protocol message name is required");
    const normalized = normalizeDefinition(key, definition);
    if (this.byName.has(key) || this.byWireType.has(normalized.wireType)) {
      throw new Error(`Protocol message is already registered: ${key}`);
    }
    this.byName.set(key, normalized);
    this.byWireType.set(normalized.wireType, normalized);
    return this;
  }

  registerMany(definitions) {
    Object.entries(definitions || {}).forEach(([name, definition]) => this.register(name, definition));
    return this;
  }

  describe(nameOrWireType) {
    return this.byName.get(nameOrWireType) || this.byWireType.get(nameOrWireType) || null;
  }

  encode(name, payload, context) {
    const definition = this.byName.get(name);
    if (!definition) throw new Error(`Unknown protocol message: ${name}`);
    this._validate(definition, payload, context, "encode");
    return {
      type: definition.wireType,
      protocolVersion: this.protocolVersion,
      messageVersion: definition.version,
      payload: definition.encode(payload, context || {}),
    };
  }

  decode(envelope, context) {
    const definition = this.byWireType.get(String(envelope?.type || ""));
    if (!definition) throw new Error(`Unknown wire message: ${String(envelope?.type || "")}`);
    if (Number(envelope.protocolVersion || this.protocolVersion) !== this.protocolVersion) {
      throw new Error(`Unsupported protocol version: ${envelope.protocolVersion}`);
    }
    const payload = definition.decode(envelope.payload, context || {});
    this._validate(definition, payload, context, "decode");
    return { name: definition.name, payload, definition };
  }

  deliveryFor(nameOrWireType) {
    const definition = this.describe(nameOrWireType);
    if (!definition) throw new Error(`Unknown protocol message: ${nameOrWireType}`);
    return { ...definition.delivery };
  }

  _validate(definition, payload, context, phase) {
    if (!definition.validate) return;
    const result = definition.validate(payload, context || {});
    if (result === false) throw new TypeError(`${definition.name} failed ${phase} validation`);
    if (typeof result === "string") throw new TypeError(result);
    if (Array.isArray(result) && result.length) throw new TypeError(result.join("; "));
  }
}

function createProtocolMap(options) {
  return new ProtocolMap(options);
}

module.exports = { DIRECTIONS, ProtocolMap, createProtocolMap };
