"use strict";

const DIRECTIONS = Object.freeze({
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
});

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function resolveRoomExits(room, options) {
  const includeClosedSecrets = options?.includeClosedSecrets === true;
  return Object.fromEntries(Object.keys(DIRECTIONS).map(direction => {
    const passage = room?.secretPassages?.[direction];
    const secretOpen = passage && (includeClosedSecrets || passage.open === true);
    return [direction, !!room?.doors?.[direction] || !!secretOpen];
  }));
}

function segment(x1, x2, z1, z2, side, kind = "wall") {
  return { x1, x2, z1, z2, side, kind };
}

function createRoomBoundaryPlan(options) {
  const width = Math.max(1, number(options?.width ?? options?.room?.width ?? options?.room?.w));
  const height = Math.max(1, number(options?.height ?? options?.room?.height ?? options?.room?.h));
  const thickness = Math.max(1, number(options?.wallThickness, 1));
  const doorSize = Math.max(0, number(options?.doorSize));
  const corridorDepth = Math.max(0, number(options?.corridorDepth));
  const exits = options?.exits || resolveRoomExits(options?.room);
  const midX = width / 2;
  const midZ = height / 2;
  const halfDoor = doorSize / 2;
  const walls = [];
  const corridors = [];
  const doorPads = [];

  function addHorizontal(side, z1, z2) {
    if (exits[side] && doorSize > 0) {
      walls.push(segment(0, midX - halfDoor, z1, z2, side));
      walls.push(segment(midX + halfDoor, width, z1, z2, side));
    } else {
      walls.push(segment(0, width, z1, z2, side));
    }
  }

  function addVertical(side, x1, x2) {
    if (exits[side] && doorSize > 0) {
      walls.push(segment(x1, x2, 0, midZ - halfDoor, side));
      walls.push(segment(x1, x2, midZ + halfDoor, height, side));
    } else {
      walls.push(segment(x1, x2, 0, height, side));
    }
  }

  addHorizontal("n", 0, thickness);
  addHorizontal("s", height - thickness, height);
  addVertical("w", 0, thickness);
  addVertical("e", width - thickness, width);

  if (exits.n) {
    corridors.push({ side: "n", x: midX, z: -corridorDepth / 2, width: doorSize, depth: corridorDepth });
    doorPads.push({ side: "n", x: midX, z: thickness / 2, width: doorSize, depth: thickness });
  }
  if (exits.s) {
    corridors.push({ side: "s", x: midX, z: height + corridorDepth / 2, width: doorSize, depth: corridorDepth });
    doorPads.push({ side: "s", x: midX, z: height - thickness / 2, width: doorSize, depth: thickness });
  }
  if (exits.w) {
    corridors.push({ side: "w", x: -corridorDepth / 2, z: midZ, width: corridorDepth, depth: doorSize });
    doorPads.push({ side: "w", x: thickness / 2, z: midZ, width: thickness, depth: doorSize });
  }
  if (exits.e) {
    corridors.push({ side: "e", x: width + corridorDepth / 2, z: midZ, width: corridorDepth, depth: doorSize });
    doorPads.push({ side: "e", x: width - thickness / 2, z: midZ, width: thickness, depth: doorSize });
  }

  return {
    width,
    height,
    wallThickness: thickness,
    doorSize,
    corridorDepth,
    exits: { ...exits },
    walls,
    corridors,
    doorPads,
    floor: { x: midX, z: midZ, width, depth: height },
    ceiling: { x: midX, z: midZ, width, depth: height },
  };
}

function resolveElevation(entity, policy) {
  const source = policy || {};
  const base = number(source.baseHeight);
  const explicit = number(entity?.height ?? entity?.elevation ?? entity?.zHeight);
  const jump = Math.max(0, number(entity?.jumpHeight));
  const hover = entity?.hovering ? number(source.hoverHeight) : 0;
  const kindOffset = number(source.kindOffsets?.[entity?.kind ?? entity?.type]);
  return base + explicit + jump + hover + kindOffset;
}

function roomBuildSignature(room, options) {
  const exits = resolveRoomExits(room);
  return JSON.stringify({
    id: room?.id || "",
    type: room?.type || "",
    exits,
    width: number(options?.width ?? room?.width ?? room?.w),
    height: number(options?.height ?? room?.height ?? room?.h),
    wallThickness: number(options?.wallThickness),
    doorSize: number(options?.doorSize),
    wallHeight: number(options?.wallHeight),
    theme: options?.themeKey || "",
  });
}

module.exports = {
  DIRECTIONS,
  resolveRoomExits,
  createRoomBoundaryPlan,
  resolveElevation,
  roomBuildSignature,
};
