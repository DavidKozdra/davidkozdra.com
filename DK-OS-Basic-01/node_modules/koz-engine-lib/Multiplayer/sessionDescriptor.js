"use strict";

const SESSION_DESCRIPTOR_VERSION = 1;
const DEFAULT_RESUME_TTL_MS = 30 * 60 * 1000;

function normalizeSessionDescriptor(input, options) {
  const source = input || {};
  const opts = options || {};
  const now = Math.max(0, Number(opts.now ?? Date.now()));
  const roomId = String(source.roomId || source.sessionId || "").trim();
  const resumeToken = String(source.resumeToken || source.reconnectToken || "").trim();
  if (!roomId) throw new TypeError("Session descriptor roomId is required");
  if (!resumeToken) throw new TypeError("Session descriptor resumeToken is required");
  const issuedAt = Math.max(0, Number(source.issuedAt) || now);
  const expiresAt = Math.max(issuedAt, Number(source.expiresAt) || issuedAt + DEFAULT_RESUME_TTL_MS);
  return Object.freeze({
    version: SESSION_DESCRIPTOR_VERSION,
    provider: String(source.provider || "custom"),
    roomId,
    playerId: String(source.playerId || ""),
    resumeToken,
    protocolVersion: Math.max(1, Math.trunc(Number(source.protocolVersion) || 1)),
    buildVersion: String(source.buildVersion || ""),
    generationVersion: Math.max(0, Math.trunc(Number(source.generationVersion) || 0)),
    contentHash: String(source.contentHash || ""),
    issuedAt,
    expiresAt,
    metadata: source.metadata && typeof source.metadata === "object"
      ? { ...source.metadata }
      : {},
  });
}

function isSessionDescriptorExpired(descriptor, now) {
  return !descriptor || Number(descriptor.expiresAt) <= Math.max(0, Number(now ?? Date.now()));
}

function matchesSessionDescriptor(descriptor, requirements) {
  const required = requirements || {};
  if (!descriptor || isSessionDescriptorExpired(descriptor, required.now)) return false;
  return ["roomId", "provider", "protocolVersion", "buildVersion", "generationVersion", "contentHash"]
    .every(key => required[key] === undefined || String(descriptor[key]) === String(required[key]));
}

function rotateSessionDescriptor(descriptor, resumeToken, options) {
  return normalizeSessionDescriptor({
    ...descriptor,
    resumeToken,
    issuedAt: options?.now ?? Date.now(),
    expiresAt: options?.expiresAt,
  }, options);
}

function redactSessionDescriptor(descriptor) {
  if (!descriptor) return null;
  return { ...descriptor, resumeToken: descriptor.resumeToken ? "[redacted]" : "" };
}

module.exports = {
  SESSION_DESCRIPTOR_VERSION,
  DEFAULT_RESUME_TTL_MS,
  normalizeSessionDescriptor,
  isSessionDescriptorExpired,
  matchesSessionDescriptor,
  rotateSessionDescriptor,
  redactSessionDescriptor,
};
