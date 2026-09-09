"use strict";

const VIEW_MODES = Object.freeze({
  TWO_D: "2d",
  THIRD_PERSON: "third",
  FIRST_PERSON: "fp",
});

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, minimum, maximum) {
  const min = Math.min(number(minimum), number(maximum));
  const max = Math.max(number(minimum), number(maximum));
  return Math.max(min, Math.min(max, number(value)));
}

function normalizeViewMode(mode, options) {
  const requested = Object.values(VIEW_MODES).includes(mode) ? mode : VIEW_MODES.TWO_D;
  if (requested === VIEW_MODES.FIRST_PERSON
    && (options?.splitScreen === true || options?.allowFirstPerson === false)) {
    return VIEW_MODES.THIRD_PERSON;
  }
  return requested;
}

function applyLookDelta(yaw = 0, pitch = 0, deltaX = 0, deltaY = 0, options) {
  const opts = options || {};
  const yawSensitivity = Math.max(0, number(opts.yawSensitivity, 0.0055));
  const pitchSensitivity = Math.max(0, number(opts.pitchSensitivity, 0.0045));
  const minimumPitch = number(opts.minimumPitch, -0.55);
  const maximumPitch = number(opts.maximumPitch, 0.45);
  return {
    yaw: number(yaw) + number(deltaX) * yawSensitivity,
    pitch: clamp(number(pitch) - number(deltaY) * pitchSensitivity, minimumPitch, maximumPitch),
  };
}

function firstPersonForward(yaw, pitch = 0) {
  const safeYaw = number(yaw);
  const safePitch = number(pitch);
  const horizontal = Math.cos(safePitch);
  return {
    x: Math.cos(safeYaw) * horizontal,
    y: Math.sin(safePitch),
    z: Math.sin(safeYaw) * horizontal,
  };
}

function mapLocalMovementToWorld(input, yaw) {
  const forward = number(input?.forward ?? -input?.y);
  const right = number(input?.right ?? input?.x);
  const cos = Math.cos(number(yaw));
  const sin = Math.sin(number(yaw));
  const x = cos * forward - sin * right;
  const y = sin * forward + cos * right;
  const magnitude = Math.hypot(x, y);
  const limit = Math.max(1, magnitude);
  return { x: x / limit, y: y / limit };
}

function exponentialSmoothingAlpha(frequencyHz, deltaSeconds) {
  return 1 - Math.exp(-Math.max(0, number(frequencyHz)) * clamp(deltaSeconds, 0, 1));
}

function updateSmoothedFocus(state, target, options) {
  const current = state || { x: 0, z: 0, valid: false };
  const targetX = number(target?.x);
  const targetZ = number(target?.z ?? target?.y);
  const snapDistance = Math.max(0, number(options?.snapDistance, 400));
  const distance = Math.hypot(targetX - number(current.x), targetZ - number(current.z));
  if (!current.valid || distance > snapDistance) {
    current.x = targetX;
    current.z = targetZ;
    current.valid = true;
    return current;
  }
  const alpha = exponentialSmoothingAlpha(options?.frequencyHz ?? 12, options?.deltaSeconds);
  current.x += (targetX - current.x) * alpha;
  current.z += (targetZ - current.z) * alpha;
  return current;
}

function sampleCameraShake(timeMs) {
  const phase = number(timeMs) * 0.018;
  return {
    x: Math.sin(phase) * 0.72 + Math.sin(phase * 1.73 + 0.8) * 0.28,
    y: Math.cos(phase * 1.19 + 0.35) * 0.7 + Math.sin(phase * 1.91) * 0.3,
  };
}

function resolveCameraFov(options) {
  const baseFov = Math.max(1, number(options?.baseFov, 50));
  if (options?.storyActive) return baseFov / Math.max(0.75, number(options?.storyZoom, 1));
  return options?.firstPerson ? Math.max(1, number(options?.firstPersonFov, 68)) : baseFov;
}

function computeFirstPersonPose(options) {
  const focus = options?.focus || {};
  const shake = options?.shake || {};
  const eyeHeight = number(options?.eyeHeight, 34);
  const position = {
    x: number(focus.x) + number(shake.x),
    y: eyeHeight + number(shake.y),
    z: number(focus.z ?? focus.y) + number(shake.z),
  };
  const forward = firstPersonForward(options?.yaw, options?.pitch);
  const distance = Math.max(1, number(options?.lookDistance, 100));
  return {
    position,
    target: {
      x: position.x + forward.x * distance,
      y: position.y + forward.y * distance,
      z: position.z + forward.z * distance,
    },
    forward,
  };
}

function computeThirdPersonPose(options) {
  const focus = options?.focus || {};
  const room = options?.room || {};
  const bias = clamp(options?.centerBias ?? 0.28, 0, 1);
  const focusX = number(focus.x);
  const focusZ = number(focus.z ?? focus.y);
  const centerX = number(room.centerX, number(room.width ?? room.w) / 2);
  const centerZ = number(room.centerZ, number(room.height ?? room.h) / 2);
  const shake = options?.shake || {};
  const target = {
    x: focusX * (1 - bias) + centerX * bias + number(shake.x),
    y: number(options?.lookHeight, 12),
    z: focusZ * (1 - bias) + centerZ * bias + number(shake.z),
  };
  return {
    position: {
      x: target.x,
      y: number(options?.height, 580),
      z: target.z + number(options?.back, 430),
    },
    target,
  };
}

function smoothPosition(current, target, options) {
  const alpha = options?.snap === true
    ? 1
    : exponentialSmoothingAlpha(options?.frequencyHz ?? 9, options?.deltaSeconds);
  return {
    x: number(current?.x) + (number(target?.x) - number(current?.x)) * alpha,
    y: number(current?.y) + (number(target?.y) - number(current?.y)) * alpha,
    z: number(current?.z) + (number(target?.z) - number(current?.z)) * alpha,
  };
}

module.exports = {
  VIEW_MODES,
  normalizeViewMode,
  applyLookDelta,
  firstPersonForward,
  mapLocalMovementToWorld,
  exponentialSmoothingAlpha,
  updateSmoothedFocus,
  sampleCameraShake,
  resolveCameraFov,
  computeFirstPersonPose,
  computeThirdPersonPose,
  smoothPosition,
};
