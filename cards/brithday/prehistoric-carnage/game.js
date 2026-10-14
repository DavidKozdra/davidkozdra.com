// Prehistoric Carnage: a birthday-sized take on Infinite Carnage.
// David holds the dance floor with a bone club while ever-tougher waves of tuxedo
// T-rexes close in. Kills earn bones, which buy upgrades in the Bone Market and
// carry over between runs, like gallons and the Blood Market in Carnage.
// The world's short side is 400 units and its long side stretches to fit the screen.

const WORLD_SHORT = 400;
let WORLD_W = 400;
let WORLD_H = 600;

const COLORS = {
  forest: "#0f3d2e",
  forestLight: "#1f664d",
  gold: "#d4af37",
  goldLight: "#f1d98a",
  cream: "#f6f0e4",
  paper: "#fffdf7",
  muted: "#527064",
  dinoGreen: "#6b7d3a",
  danger: "#b23a3a",
  fire: "#e0702a",
  ice: "#8cc8de",
  wine: "#8e2440",
  spit: "#9bcf3a",
  rock: "#8a8273",
  rockDark: "#5f584c",
  rockLight: "#b8b0a0",
  tar: "#2b2118"
};

// Sticker rectangles in drinks-sprite-sheet.png (same ones the card's confetti uses).
const DRINK_SPRITES = [
  { x: 170, y: 70, w: 330, h: 330 },   // whiskey
  { x: 570, y: 20, w: 310, h: 420 },   // beer
  { x: 870, y: 50, w: 330, h: 410 },   // margarita
  { x: 1140, y: 170, w: 290, h: 330 }, // red cup
  { x: 320, y: 390, w: 330, h: 360 },  // mojito
  { x: 115, y: 540, w: 280, h: 400 },  // tall mojito
  { x: 610, y: 470, w: 260, h: 440 },  // red wine
  { x: 910, y: 460, w: 330, h: 420 },  // martini
  { x: 1170, y: 660, w: 270, h: 290 }  // shot
];

// Speeds are in world units per second, times in milliseconds. Most numbers
// follow Carnage's config, scaled down to this smaller arena.
const HERO = { radius: 18, maxHp: 120, speed: 150, regen: 1 };
const CLUB = { reach: 66, arc: Math.PI * 0.95, damage: 34, swingMs: 170, cooldownMs: 90, holdRepeatMs: 275 };
const DASH = { speed: 640, durationMs: 160, cooldownMs: 1150, iframeMs: 260, damage: 26, radius: 28 };
const QUAKE = { rings: 3, staggerMs: 190, expandMs: 460, maxRadius: 170, damage: 95, cooldownMs: 7000, autoCrowd: 6, autoRange: 100 };
const METEOR = { radius: 160, damage: 220, expandMs: 320 };
const TRAPS = { perRank: 2, damage: 130, radius: 70, armMs: 350, lifeMs: 12000, scatter: 120, trigger: 22 };
const BOOMERANG = { triggerAt: 8, damage: 60, radius: 15, speed: 360, outMs: 900, hitCooldownMs: 140, cooldownMs: 900 };
const TWIN = { speedMul: 0.94, damageMul: 0.6, reachMul: 0.9, swingCooldownMs: 420, seekRange: 230, leash: 260, leashRelease: 110, escortRadius: 60 };
const SHELL = { rechargeMs: 30000, rechargeMulPerRank: 0.9 };
const DINO = { baseHp: 18, hpGrowthPerMin: 1.22, speed: 70, speedGrowthPerMin: 1.05, damage: 9, damageGrowthPerMin: 1.12, biteCooldownMs: 620, bones: 2 };
// Spawns per second double every 30 s, in steps, up to the cap.
const SPAWN = { base: 1, doubleEveryMs: 30000, cap: 12, maxAlive: 160, maxRangedAttackers: 4 };
const KING_EVERY_MS = 150000;

// Dino types. Each new type joins the horde at `unlockAtMs`; `weight` sets how
// often it spawns once it has. The king only arrives on his timer.
const DINO_KINDS = {
  grunt: { name: "Party Rex", size: 40, hpMul: 1, speedMul: 1, biteMul: 1, mass: 1, bones: 1, weight: 30, unlockAtMs: 0, lead: 0.3 },
  charger: {
    name: "Raptor Rusher", intro: "fast and reckless", tint: [255, 170, 120],
    size: 34, hpMul: 0.85, speedMul: 1.85, biteMul: 1, mass: 0.8, bones: 1, weight: 25, unlockAtMs: 15000, lead: 0.34
  },
  brute: {
    name: "Big Tux Rex", intro: "tough and heavy",
    size: 66, hpMul: 3.6, speedMul: 0.7, biteMul: 2, mass: 2.2, bones: 4, weight: 12, unlockAtMs: 30000
  },
  spitter: {
    name: "Spitter", intro: "spits from range. Swing to send it back", tint: [170, 255, 140],
    size: 42, hpMul: 1, speedMul: 0.55, biteMul: 1, mass: 1, bones: 2, weight: 12, unlockAtMs: 45000,
    standoff: 190, range: 300, cooldownMs: 4400, volley: 3, spreadRad: 0.28, shotSpeed: 170, shotDamage: 7
  },
  nester: {
    name: "Nesting Mama", intro: "lays eggs. Smash them before they hatch", tint: [255, 170, 220],
    size: 58, hpMul: 2.6, speedMul: 0.42, biteMul: 1, mass: 1.8, bones: 3, weight: 8, unlockAtMs: 60000,
    standoff: 210, layEveryMs: 5000
  },
  lobber: {
    name: "Rock Lobber", intro: "lobs rocks. Dodge the landing marks", tint: [205, 185, 150],
    size: 44, hpMul: 1.15, speedMul: 0.6, biteMul: 1, mass: 1, bones: 2, weight: 8, unlockAtMs: 75000,
    standoff: 160, range: 280, cooldownMs: 4200, flightMs: 1300, shotDamage: 13
  },
  breather: {
    name: "Volcano Rex", intro: "breathes fire. Step out of the line", tint: [255, 120, 90],
    size: 46, hpMul: 1.35, speedMul: 0.5, biteMul: 1, mass: 1.1, bones: 2, weight: 10, unlockAtMs: 100000,
    standoff: 220, range: 300, cooldownMs: 4200, chargeMs: 1500, beamMs: 220, beamWidth: 9, shotDamage: 12, beams: 1, beamSpreadRad: 0
  },
  king: {
    name: "King of the Party",
    size: 130, hpMul: 45, speedMul: 0.34, biteMul: 3, mass: 8, bones: 100, weight: 0, unlockAtMs: Infinity,
    standoff: 240, range: 420, cooldownMs: 3600, chargeMs: 1800, beamMs: 420, beamWidth: 15, shotDamage: 24, beams: 3, beamSpreadRad: 0.3,
    summonEveryMs: 5200, summonCount: 6
  }
};

const DROPS = {
  chance: { grunt: 0.035, charger: 0.035, brute: 0.12, spitter: 0.08, nester: 0.1, lobber: 0.08, breather: 0.08, king: 1 },
  lifeMs: 10000,
  magnetRadius: 80
};

const PICKUPS = {
  pint: { sprite: 1, label: "Fresh pint! +30% health", weight: 22 },
  rocks: { sprite: 0, label: "ICE AGE! The horde is frozen", weight: 18 },
  shot: { sprite: 8, label: "METEOR SHOT!", weight: 18 },
  wine: { sprite: 6, label: "FRENZY! Double bones, faster swings", weight: 20, duration: 6000 },
  margarita: { sprite: 2, label: "REFRESHER! Dash and Quake recharged", weight: 20 }
};

// Kills less than this far apart keep the combo going.
const COMBO_WINDOW_MS = 1500;
// Callouts count kills inside a rolling one-second window, like Carnage's bursts.
const BURST_WINDOW_MS = 1000;
const BURST_TIERS = [
  { at: 2, text: "DOUBLE KILL", color: "#c9a22f", size: 20 },
  { at: 3, text: "TRIPLE KILL", color: "#c28a29", size: 22 },
  { at: 5, text: "DINO-MITE", color: "#ba6f25", size: 25 },
  { at: 8, text: "STAMPEDE", color: "#ad5422", size: 28 },
  { at: 12, text: "PREHISTORIC CARNAGE", color: "#9c3a20", size: 28 },
  { at: 18, text: "MASS EXTINCTION", color: "#8a2620", size: 30 },
  { at: 26, text: "METEOR STRIKE", color: "#741a20", size: 32 }
];

// The Bone Market. Price of the next rank = base × growth^rank, as in Carnage.
const UPGRADES = [
  { id: "heavyBone", page: "arsenal", name: "Heavy Bone", desc: "Club damage +20%", base: 30, growth: 1.5 },
  { id: "broadClub", page: "arsenal", name: "Broad Club", desc: "Club reach +15%", base: 35, growth: 1.5, max: 8 },
  { id: "quickSwings", page: "arsenal", name: "Quick Swings", desc: "Swing faster: delay −12%", base: 30, growth: 1.5, max: 10 },
  { id: "dancingBone", page: "arsenal", name: "Dancing Bone", desc: "The club swings itself at nearby dinos, faster each rank", base: 140, growth: 1.55, max: 8 },
  { id: "boomerangBone", page: "arsenal", name: "Boomerang Bone", desc: "A STAMPEDE hurls a bone that comes back (+1 bone, +50% damage per rank)", base: 150, growth: 1.7, max: 6 },
  { id: "raptorStep", page: "arsenal", name: "Raptor Step", desc: "+1 dash charge, longer dash, faster recharge", base: 90, growth: 1.9, max: 5 },
  { id: "tarTraps", page: "arsenal", name: "Tar Traps", desc: "Quake also drops 2 tar traps per rank", base: 80, growth: 1.7, max: 6 },
  { id: "warCry", page: "arsenal", name: "War Cry", desc: "Quake goes off by itself when dinos crowd in", base: 220, growth: 1, max: 1 },
  { id: "thickHide", page: "survival", name: "Thick Hide", desc: "Max health +30%", base: 40, growth: 1.6 },
  { id: "healingSpring", page: "survival", name: "Healing Spring", desc: "Health regen +0.9 per second", base: 20, growth: 1.6 },
  { id: "scales", page: "survival", name: "Scaly Armor", desc: "Damage taken −8%", base: 40, growth: 1.6, max: 12 },
  { id: "turtleShell", page: "survival", name: "Turtle Shell", desc: "Blocks one hit per rank; refills after 30 s without damage", base: 70, growth: 1.8, max: 5 },
  { id: "fleetFeet", page: "survival", name: "Fleet Feet", desc: "Move speed +8%", base: 30, growth: 1.5, max: 8 },
  { id: "happyHour", page: "survival", name: "Happy Hour", desc: "Drinks drop 25% more often", base: 50, growth: 1.7, max: 8 },
  { id: "deepFreeze", page: "survival", name: "Deep Freeze", desc: "Ice Age +1 s; frozen dinos take +12% damage", base: 45, growth: 1.6, max: 6 },
  { id: "evolution", page: "ascension", name: "Evolution", desc: "All stats +2%, including regen", base: 8, growth: 1.32 },
  { id: "feedingFrenzy", page: "ascension", name: "Feeding Frenzy", desc: "Bones from kills ×3", base: 120, growth: 2.4, max: 5 },
  { id: "extinction", page: "ascension", name: "Extinction Event", desc: "Fewer dinos: spawns −5%", base: 40, growth: 1.85, max: 15 },
  { id: "caveTwin", page: "ascension", name: "Cave Twin", desc: "Summons a twin David who fights beside you", base: 3000, growth: 2.2, max: 3 }
];
const UPGRADE_BY_ID = new Map(UPGRADES.map((item) => [item.id, item]));

const PROFILE_KEY = "prehistoric-carnage-profile";

let images = {};
let sprites = {};
let viewScale = 1;

let profile = freshProfile();
let statsCache = null;

let hero;
let twins = [];
let dinos = [];
let eggs = [];
let projectiles = [];
let beams = [];
let traps = [];
let boomerangs = [];
let pickups = [];
let rings = [];
let sparks = [];
let floorBits = [];
let popups = [];
let banners = [];
let uiButtons = [];

let state = "ready"; // ready | playing | paused | lost
let marketOpen = false;
let clock = 0; // game time; stops while paused or shopping
let kills = 0;
let runBones = 0;
let combo = 0;
let bestCombo = 0;
let lastKillAt = -Infinity;
let killTimes = [];
let shownTierAt = 0;
let lastBoomerangAt = -Infinity;
let spawnBudget = 0;
let nextKingAt = KING_EVERY_MS;
let kingWarned = false;
let frozenUntil = 0;
let frenzyUntil = 0;
let shakeUntil = 0;
let newBest = false;
let lastSaveAt = 0;
const seenKinds = new Set();

let holding = false;
let touchMode = false;
let stick = null; // the touch steering David: { id, ox, oy, x, y } in canvas pixels
const seenTouches = new Set();

function preload() {
  images.photo = loadImage("../david-rain.png");
  images.drinks = loadImage("../drinks-sprite-sheet.png");
  images.trex = loadImage("../tuxedo-trex.png");
}

function setup() {
  const canvas = createCanvas(WORLD_W, WORLD_H);
  canvas.parent("game");
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  textFont("Georgia");

  sprites.face = makeFaceSprite();
  const trex = cutOutWhite(images.trex, 300);
  // Each set holds [facing right, facing left].
  sprites.trex = [trex, flipImage(trex)];
  sprites.trexIce = sprites.trex.map((img) => tintedCopy(img, [165, 215, 255]));
  sprites.trexHit = sprites.trex.map((img) => tintedCopy(img, [255, 140, 140]));
  sprites.kinds = {};
  for (const [kind, def] of Object.entries(DINO_KINDS)) {
    sprites.kinds[kind] = def.tint ? sprites.trex.map((img) => tintedCopy(img, def.tint)) : sprites.trex;
  }

  touchMode = window.matchMedia("(pointer: coarse)").matches;
  profile = loadProfile();
  newGame();
  fitToScreen();
}

function windowResized() {
  fitToScreen();
}

// Short side is always 400 units; the long side follows the screen's shape.
function fitToScreen() {
  const area = document.getElementById("game");
  const availW = Math.max(area.clientWidth, 280);
  const availH = Math.max(area.clientHeight, 320);
  const aspect = availW / availH;
  if (aspect < 1) {
    WORLD_W = WORLD_SHORT;
    WORLD_H = constrain(Math.round(WORLD_SHORT / aspect), WORLD_SHORT, 760);
  } else {
    WORLD_H = WORLD_SHORT;
    WORLD_W = constrain(Math.round(WORLD_SHORT * aspect), WORLD_SHORT, 720);
  }
  viewScale = Math.min(availW / WORLD_W, availH / WORLD_H);
  resizeCanvas(Math.floor(WORLD_W * viewScale), Math.floor(WORLD_H * viewScale));

  if (state === "ready") {
    hero.x = WORLD_W / 2;
    hero.y = WORLD_H / 2;
  }
  hero.x = constrain(hero.x, HERO.radius, WORLD_W - HERO.radius);
  hero.y = constrain(hero.y, HERO.radius, WORLD_H - HERO.radius);
}

// ---- profile and upgrades ----

function freshProfile() {
  return { bones: 0, levels: {}, best: { time: 0, kills: 0 } };
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved.bones === "number") {
      return {
        bones: Math.max(0, saved.bones),
        levels: saved.levels && typeof saved.levels === "object" ? saved.levels : {},
        best: { time: Number(saved.best && saved.best.time) || 0, kills: Number(saved.best && saved.best.kills) || 0 }
      };
    }
  } catch (e) {
    // Storage can be blocked; play on with a fresh profile.
  }
  return freshProfile();
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    // Storage can be blocked; progress just won't persist.
  }
}

function level(id) {
  const item = UPGRADE_BY_ID.get(id);
  const rank = Math.max(0, Math.floor(Number(profile.levels[id]) || 0));
  return item && item.max ? Math.min(rank, item.max) : rank;
}

function costOf(item) {
  const growth = item.max === 1 ? 1 : item.growth;
  return Math.ceil(item.base * Math.pow(growth, level(item.id)));
}

// Everything the upgrades change, worked out once per purchase.
function stats() {
  if (statsCache) return statsCache;
  const all = Math.pow(1.02, level("evolution"));
  const dashRanks = level("raptorStep");
  const shellRanks = level("turtleShell");
  const dancing = level("dancingBone");
  const boomerangRanks = level("boomerangBone");
  statsCache = {
    all,
    maxHp: HERO.maxHp * all * (1 + level("thickHide") * 0.3),
    regen: HERO.regen * all + level("healingSpring") * 0.9,
    speed: HERO.speed * all * Math.pow(1.08, level("fleetFeet")),
    clubDamage: CLUB.damage * all * Math.pow(1.2, level("heavyBone")),
    clubReach: CLUB.reach * all * Math.pow(1.15, level("broadClub")),
    swingRepeatMs: CLUB.holdRepeatMs * Math.pow(0.88, level("quickSwings")),
    swingCooldownMs: CLUB.cooldownMs * Math.pow(0.88, level("quickSwings")),
    dancingCadenceMs: dancing > 0 ? 1200 * Math.pow(0.78, dancing - 1) : 0,
    boomerangs: boomerangRanks,
    boomerangDamage: BOOMERANG.damage * all * (1 + 0.5 * Math.max(0, boomerangRanks - 1)),
    dashCharges: 1 + dashRanks,
    dashDurationMs: DASH.durationMs * (1 + 0.16 * dashRanks),
    dashCooldownMs: DASH.cooldownMs * Math.pow(0.85, dashRanks),
    traps: level("tarTraps") * TRAPS.perRank,
    warCry: level("warCry") > 0,
    damageTakenMul: Math.pow(0.92, level("scales")),
    shellLayers: shellRanks,
    shellRechargeMs: SHELL.rechargeMs * Math.pow(SHELL.rechargeMulPerRank, Math.max(0, shellRanks - 1)),
    dropMul: 1 + 0.25 * level("happyHour"),
    freezeMs: 4000 + 1000 * level("deepFreeze"),
    frozenDamageMul: Math.pow(1.12, level("deepFreeze")),
    boneMul: Math.pow(3, level("feedingFrenzy")),
    spawnMul: Math.pow(0.95, level("extinction")),
    twins: level("caveTwin")
  };
  return statsCache;
}

function buy(id) {
  const item = UPGRADE_BY_ID.get(id);
  if (!item) return false;
  const rank = level(id);
  if (item.max && rank >= item.max) return false;
  const cost = costOf(item);
  if (profile.bones < cost) return false;

  const before = stats();
  profile.bones -= cost;
  profile.levels[id] = rank + 1;
  statsCache = null;
  applyUpgradesToRun(before);
  saveProfile();
  refreshMarket();
  return true;
}

// A purchase (or a reset) takes effect right away in the current run.
function applyUpgradesToRun(before) {
  const after = stats();
  hero.hp = Math.min(after.maxHp, hero.hp + Math.max(0, after.maxHp - before.maxHp));
  hero.dashCharges = Math.min(after.dashCharges, hero.dashCharges + Math.max(0, after.dashCharges - before.dashCharges));
  hero.shell = Math.min(after.shellLayers, hero.shell + Math.max(0, after.shellLayers - before.shellLayers));
  syncTwins();
}

// ---- game flow ----

function newGame() {
  const st = stats();
  hero = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    vx: 0,
    vy: 0,
    hp: st.maxHp,
    aim: -Math.PI / 2,
    lastSwing: -Infinity,
    lastAutoSwing: -Infinity,
    swingAt: -Infinity,
    swingAim: 0,
    swingSide: 1,
    dashAt: -Infinity,
    dashDirX: 0,
    dashDirY: 0,
    dashHits: new Set(),
    dashCharges: st.dashCharges,
    nextDashAt: 0,
    quakeAt: -Infinity,
    shell: st.shellLayers,
    shellNextAt: 0,
    hurtAt: -Infinity,
    trail: []
  };
  twins = [];
  dinos = [];
  eggs = [];
  projectiles = [];
  beams = [];
  traps = [];
  boomerangs = [];
  pickups = [];
  rings = [];
  sparks = [];
  floorBits = [];
  popups = [];
  banners = [];
  clock = 0;
  kills = 0;
  runBones = 0;
  combo = 0;
  bestCombo = 0;
  lastKillAt = -Infinity;
  killTimes = [];
  shownTierAt = 0;
  lastBoomerangAt = -Infinity;
  spawnBudget = 0;
  nextKingAt = KING_EVERY_MS;
  kingWarned = false;
  frozenUntil = 0;
  frenzyUntil = 0;
  shakeUntil = 0;
  newBest = false;
  lastSaveAt = 0;
  seenKinds.clear();
  holding = false;
  syncTwins();
  state = "ready";
}

function startGame() {
  state = "playing";
  queueBanner("Hold the dance floor!");
}

function endGame() {
  hero.hp = 0;
  state = "lost";
  holding = false;
  stick = null;
  newBest = clock > profile.best.time;
  profile.best = { time: Math.max(profile.best.time, clock), kills: Math.max(profile.best.kills, kills) };
  saveProfile();
  burst(hero.x, hero.y, 40, [COLORS.danger, COLORS.gold, COLORS.forest]);
}

function draw() {
  const dt = Math.min(deltaTime, 50);
  if (state === "playing" && !marketOpen) update(dt);
  uiButtons = [];

  push();
  scale(viewScale);
  if (clock < shakeUntil) translate(random(-3, 3), random(-3, 3));
  drawFloor();
  drawTraps();
  drawEggs();
  drawPickups();
  drawBeams(false);
  drawRings();
  drawDinos();
  drawProjectiles();
  drawBoomerangs();
  drawTwins();
  drawHero();
  drawBeams(true);
  drawSparks();
  drawPopups();
  pop();

  push();
  scale(viewScale);
  drawHud();
  if (touchMode && state === "playing") drawTouchControls();
  drawBanner();
  if (state === "ready") drawStartScreen();
  if (state === "paused") drawOverlay("Paused", ["Press Esc or tap to keep playing"], touchMode ? "Tap to resume" : "Click to resume");
  if (state === "lost") drawGameOver();
  pop();
}

function update(dt) {
  clock += dt;
  const s = dt / 1000;

  updateHero(s);
  updateTwins(s);
  spawnHorde(s);
  updateDinos(s);
  updateEggs();
  updateProjectiles(s);
  updateBeams();
  updateTraps();
  updateBoomerangs(s);
  updateRings();
  updatePickups(s);
  updateSparks(s);

  while (killTimes.length && killTimes[0] < clock - BURST_WINDOW_MS) killTimes.shift();
  if (!killTimes.length) shownTierAt = 0;
  if (combo > 0 && clock - lastKillAt > COMBO_WINDOW_MS) combo = 0;
  if (clock - lastSaveAt > 15000) {
    lastSaveAt = clock;
    saveProfile();
  }
}

// ---- David ----

function moveInput() {
  let x = 0;
  let y = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) x -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) x += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) y -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) y += 1;

  if (stick) {
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const len = Math.hypot(dx, dy);
    const max = 44;
    if (len > 6) {
      const k = Math.min(len, max) / max;
      x += (dx / len) * k;
      y += (dy / len) * k;
    }
  }

  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

function frenzied() {
  return clock < frenzyUntil;
}

function clubReach() {
  return stats().clubReach * (frenzied() ? 1.35 : 1);
}

function clubDamage() {
  return stats().clubDamage * (frenzied() ? 1.5 : 1);
}

function updateHero(s) {
  const st = stats();
  const move = moveInput();
  const dashing = clock - hero.dashAt < st.dashDurationMs;

  if (dashing) {
    hero.x += hero.dashDirX * DASH.speed * s;
    hero.y += hero.dashDirY * DASH.speed * s;
    hero.trail.push({ x: hero.x, y: hero.y, at: clock });
    // The dash carves through anything in its path.
    for (const d of dinos.slice()) {
      if (hero.dashHits.has(d)) continue;
      if (dist(hero.x, hero.y, d.x, d.y) < DASH.radius + d.r) {
        hero.dashHits.add(d);
        damageDino(d, DASH.damage * st.all, hero.dashDirX, hero.dashDirY, 14);
      }
    }
    smashEggsNear(hero.x, hero.y, DASH.radius);
  } else {
    hero.vx = move.x * st.speed;
    hero.vy = move.y * st.speed;
    hero.x += hero.vx * s;
    hero.y += hero.vy * s;
  }
  hero.x = constrain(hero.x, HERO.radius, WORLD_W - HERO.radius);
  hero.y = constrain(hero.y, HERO.radius, WORLD_H - HERO.radius);
  hero.trail = hero.trail.filter((t) => clock - t.at < 160);

  // Dash charges come back one at a time.
  if (hero.dashCharges < st.dashCharges && clock >= hero.nextDashAt) {
    hero.dashCharges += 1;
    if (hero.dashCharges < st.dashCharges) hero.nextDashAt = clock + st.dashCooldownMs;
  }
  // Turtle Shell layers refill one at a time after a stretch without damage.
  if (hero.shell < st.shellLayers && clock >= hero.shellNextAt) {
    hero.shell += 1;
    hero.shellNextAt = clock + st.shellRechargeMs;
  }

  // Aim at the mouse, or on touch screens at the nearest dino.
  if (touchMode) {
    const target = nearestDino(clubReach() + 60);
    if (target) hero.aim = Math.atan2(target.y - hero.y, target.x - hero.x);
    else if (move.x || move.y) hero.aim = Math.atan2(move.y, move.x);
  } else {
    hero.aim = Math.atan2(mouseY / viewScale - hero.y, mouseX / viewScale - hero.x);
  }

  // Holding the mouse keeps swinging; on touch screens the club swings by itself
  // whenever a dino is in reach.
  const frenzyMul = frenzied() ? 0.5 : 1;
  if (clock - hero.lastSwing > st.swingRepeatMs * frenzyMul) {
    if (holding || (touchMode && nearestDino(clubReach()))) swing();
  }

  // Dancing Bone strikes on its own clock, on top of normal swings.
  if (st.dancingCadenceMs && clock - hero.lastAutoSwing > st.dancingCadenceMs * frenzyMul) {
    const target = nearestDino(clubReach());
    if (target) {
      hero.lastAutoSwing = clock;
      swing(Math.atan2(target.y - hero.y, target.x - hero.x), true);
    }
  }

  if (st.warCry && quakeReady() && countDinosNear(hero.x, hero.y, QUAKE.autoRange) >= QUAKE.autoCrowd) quake();

  hero.hp = Math.min(st.maxHp, hero.hp + st.regen * s);
}

function swing(angle = hero.aim, auto = false) {
  if (state !== "playing") return;
  const st = stats();
  if (!auto) {
    if (clock - hero.lastSwing < st.swingCooldownMs * (frenzied() ? 0.5 : 1)) return;
    hero.lastSwing = clock;
  }
  hero.swingAt = clock;
  hero.swingAim = angle;
  hero.swingSide = -hero.swingSide;
  clubHit(hero.x, hero.y, angle, clubReach(), clubDamage(), true);
}

// One club swing: hits dinos and eggs in the arc, and (for David) bats away shots.
function clubHit(x, y, angle, reach, damage, deflect) {
  for (const d of dinos.slice()) {
    const dx = d.x - x;
    const dy = d.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > reach + d.r) continue;
    // Dinos right up against the swinger get hit even just outside the arc.
    const offAngle = Math.abs(angleDiff(Math.atan2(dy, dx), angle));
    if (offAngle > CLUB.arc / 2 && distance > HERO.radius + d.r) continue;
    damageDino(d, damage, dx / distance, dy / distance, 10);
  }

  for (let i = eggs.length - 1; i >= 0; i--) {
    const e = eggs[i];
    const gap = Math.hypot(e.x - x, e.y - y);
    if (gap < reach + 8 && Math.abs(angleDiff(Math.atan2(e.y - y, e.x - x), angle)) <= CLUB.arc / 2) smashEgg(i);
  }

  if (!deflect) return;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.friendly) continue;
    const gap = Math.hypot(p.x - x, p.y - y);
    if (gap > reach + p.r) continue;
    if (Math.abs(angleDiff(Math.atan2(p.y - y, p.x - x), angle)) > CLUB.arc / 2 && gap > HERO.radius + p.r) continue;
    if (p.type === "spit") {
      // Send spit back the way it came, faster, hitting dinos instead.
      const speed = Math.hypot(p.vx, p.vy) * 1.4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.friendly = true;
      p.damage = damage;
      p.born = clock;
      burst(p.x, p.y, 6, [COLORS.gold, COLORS.spit]);
    } else if (p.height < 18) {
      // Rocks low enough to reach get knocked out of the air.
      burst(p.x, p.y, 8, [COLORS.rock, COLORS.rockLight, COLORS.rockDark]);
      projectiles.splice(i, 1);
    }
  }
}

function dash() {
  if (state !== "playing" || marketOpen || hero.dashCharges < 1) return;
  const st = stats();
  if (hero.dashCharges >= st.dashCharges) hero.nextDashAt = clock + st.dashCooldownMs;
  hero.dashCharges -= 1;

  const move = moveInput();
  let dx = move.x;
  let dy = move.y;
  if (!dx && !dy) {
    dx = Math.cos(hero.aim);
    dy = Math.sin(hero.aim);
  }
  const len = Math.hypot(dx, dy) || 1;
  hero.dashDirX = dx / len;
  hero.dashDirY = dy / len;
  hero.dashAt = clock;
  hero.dashHits = new Set();
}

function quakeReady() {
  return clock - hero.quakeAt >= QUAKE.cooldownMs;
}

function quake() {
  if (state !== "playing" || marketOpen || !quakeReady()) return;
  const st = stats();
  hero.quakeAt = clock;
  for (let i = 0; i < QUAKE.rings; i++) {
    rings.push({
      x: hero.x,
      y: hero.y,
      start: clock + i * QUAKE.staggerMs,
      expandMs: QUAKE.expandMs,
      maxRadius: QUAKE.maxRadius * (1 + i * 0.25),
      damage: QUAKE.damage * st.all,
      radius: 0,
      hits: new Set()
    });
  }
  for (let i = 0; i < st.traps; i++) {
    const a = random(TWO_PI);
    const r = random(30, TRAPS.scatter);
    traps.push({
      x: constrain(hero.x + Math.cos(a) * r, 12, WORLD_W - 12),
      y: constrain(hero.y + Math.sin(a) * r, 12, WORLD_H - 12),
      armAt: clock + TRAPS.armMs,
      until: clock + TRAPS.lifeMs
    });
  }
  shakeUntil = clock + 300;
}

function meteor() {
  rings.push({
    x: hero.x,
    y: hero.y,
    start: clock,
    expandMs: METEOR.expandMs,
    maxRadius: METEOR.radius,
    damage: METEOR.damage * stats().all,
    radius: 0,
    hits: new Set(),
    style: "blast"
  });
  burst(hero.x, hero.y, 40, [COLORS.fire, COLORS.gold, COLORS.goldLight, COLORS.danger]);
  shakeUntil = clock + 450;
}

function hitHero(amount) {
  if (state !== "playing" || clock - hero.dashAt < DASH.iframeMs) return;
  const st = stats();
  // Any hit restarts the shell's refill clock.
  hero.shellNextAt = clock + st.shellRechargeMs;
  if (hero.shell > 0) {
    hero.shell -= 1;
    burst(hero.x, hero.y, 12, [COLORS.gold, COLORS.goldLight, COLORS.forestLight]);
    return;
  }
  hero.hp -= amount * st.damageTakenMul;
  hero.hurtAt = clock;
  if (hero.hp <= 0) endGame();
}

// ---- Cave Twins ----

function syncTwins() {
  const wanted = stats().twins;
  while (twins.length < wanted) {
    twins.push({ x: hero.x, y: hero.y, lastSwing: -Infinity, swingAt: -Infinity, swingAim: 0, swingSide: 1, aim: 0, returning: false });
  }
  twins.length = Math.min(twins.length, wanted);
}

function updateTwins(s) {
  const st = stats();
  const reach = clubReach() * TWIN.reachMul;
  twins.forEach((t, i) => {
    const homeGap = Math.hypot(hero.x - t.x, hero.y - t.y);
    // Twins never wander too far from David.
    if (homeGap > TWIN.leash) t.returning = true;
    else if (homeGap < TWIN.leashRelease) t.returning = false;

    const target = t.returning ? null : nearestDinoTo(t.x, t.y, TWIN.seekRange);
    let tx;
    let ty;
    if (target) {
      t.aim = Math.atan2(target.y - t.y, target.x - t.x);
      const gap = Math.hypot(target.x - t.x, target.y - t.y) - target.r;
      if (gap < reach) {
        tx = t.x;
        ty = t.y;
        if (clock - t.lastSwing > TWIN.swingCooldownMs) {
          t.lastSwing = clock;
          t.swingAt = clock;
          t.swingAim = t.aim;
          t.swingSide = -t.swingSide;
          clubHit(t.x, t.y, t.aim, reach, clubDamage() * TWIN.damageMul, false);
        }
      } else {
        tx = target.x;
        ty = target.y;
      }
    } else {
      const a = (i / Math.max(twins.length, 1)) * TWO_PI + clock * 0.0005;
      tx = hero.x + Math.cos(a) * TWIN.escortRadius;
      ty = hero.y + Math.sin(a) * TWIN.escortRadius;
    }

    const dx = tx - t.x;
    const dy = ty - t.y;
    const len = Math.hypot(dx, dy);
    if (len > 2) {
      const step = Math.min(st.speed * TWIN.speedMul * s, len);
      t.x += (dx / len) * step;
      t.y += (dy / len) * step;
    }
  });
}

// ---- the horde ----

function spawnRate() {
  const doublings = Math.floor(clock / SPAWN.doubleEveryMs);
  return Math.min(SPAWN.base * Math.pow(2, doublings), SPAWN.cap) * stats().spawnMul;
}

function rollKind() {
  const unlocked = Object.entries(DINO_KINDS).filter(([, def]) => def.weight > 0 && clock >= def.unlockAtMs);
  const total = unlocked.reduce((sum, [, def]) => sum + def.weight, 0);
  let roll = random(total);
  for (const [kind, def] of unlocked) {
    roll -= def.weight;
    if (roll <= 0) return kind;
  }
  return "grunt";
}

function spawnHorde(s) {
  spawnBudget += spawnRate() * s;
  while (spawnBudget >= 1) {
    spawnBudget -= 1;
    if (dinos.length < SPAWN.maxAlive) spawnDino(rollKind());
  }

  if (!kingWarned && clock >= nextKingAt - 5000) {
    kingWarned = true;
    queueBanner("Something royal is coming…");
  }
  if (clock >= nextKingAt) {
    nextKingAt += KING_EVERY_MS;
    kingWarned = false;
    spawnDino("king");
    queueBanner("The King of the Party has arrived!");
    shakeUntil = clock + 400;
  }
}

// Every dino gets tougher, faster and harder-hitting the longer the run goes.
function spawnDino(kind, atX, atY) {
  const def = DINO_KINDS[kind];
  const minutes = clock / 60000;
  const hp = DINO.baseHp * Math.pow(DINO.hpGrowthPerMin, minutes) * def.hpMul;
  const damageMul = Math.pow(DINO.damageGrowthPerMin, minutes);

  let x = atX;
  let y = atY;
  if (x === undefined) {
    // Enter from just off a random edge.
    const margin = def.size * 0.6;
    const side = Math.floor(random(4));
    if (side === 0) { x = random(WORLD_W); y = -margin; }
    else if (side === 1) { x = WORLD_W + margin; y = random(WORLD_H); }
    else if (side === 2) { x = random(WORLD_W); y = WORLD_H + margin; }
    else { x = -margin; y = random(WORLD_H); }
  }

  dinos.push({
    kind,
    x,
    y,
    r: def.size * 0.32,
    size: def.size,
    hp,
    maxHp: hp,
    speed: DINO.speed * Math.pow(DINO.speedGrowthPerMin, minutes) * def.speedMul * random(0.9, 1.1),
    bite: DINO.damage * def.biteMul * damageMul,
    shotDamage: (def.shotDamage || 0) * damageMul,
    mass: def.mass,
    kx: 0,
    ky: 0,
    step: random(TWO_PI),
    facing: 0,
    strafe: random([-1, 1]),
    hitAt: -Infinity,
    nextBite: 0,
    nextAttack: clock + random(800, def.cooldownMs || 1000),
    nextLay: clock + (def.layEveryMs || 0) * random(0.5, 1),
    nextSummon: clock + (def.summonEveryMs || 0),
    busyUntil: 0,
    entered: false,
    dead: false
  });

  if (!seenKinds.has(kind) && def.intro) {
    seenKinds.add(kind);
    queueBanner(`New dino: ${def.name}, ${def.intro}`);
  }
}

function onScreen(d) {
  return d.x > 0 && d.x < WORLD_W && d.y > 0 && d.y < WORLD_H;
}

function updateDinos(s) {
  const frozen = clock < frozenUntil;
  const decay = Math.max(0, 1 - 8 * s);

  for (const d of dinos.slice()) {
    if (d.dead) continue;
    const def = DINO_KINDS[d.kind];
    if (!frozen) {
      moveDino(d, def, s);
      dinoAttacks(d, def);
    }
    d.x += d.kx * s;
    d.y += d.ky * s;
    d.kx *= decay;
    d.ky *= decay;
    if (onScreen(d)) d.entered = true;
    // Ranged dinos stay on screen once they've arrived, so they can't snipe from off it.
    if (def.standoff && d.entered) {
      d.x = constrain(d.x, d.r, WORLD_W - d.r);
      d.y = constrain(d.y, d.r, WORLD_H - d.r);
    }

    // Bites land one at a time, each dino with its own cooldown.
    if (!frozen && clock >= d.nextBite && Math.hypot(hero.x - d.x, hero.y - d.y) < HERO.radius + d.r) {
      d.nextBite = clock + DINO.biteCooldownMs;
      hitHero(d.bite);
      if (state !== "playing") return;
    }
  }

  separate();
}

function moveDino(d, def, s) {
  const toX = hero.x - d.x;
  const toY = hero.y - d.y;
  const len = Math.hypot(toX, toY) || 1;
  let mx;
  let my;
  if (def.standoff && onScreen(d)) {
    // Ranged dinos hold their distance, back off if David closes in, and circle otherwise.
    if (len > def.standoff) {
      mx = toX / len;
      my = toY / len;
    } else if (len < def.standoff * 0.6) {
      mx = (-toX / len) * 0.7;
      my = (-toY / len) * 0.7;
    } else {
      mx = (-toY / len) * 0.35 * d.strafe;
      my = (toX / len) * 0.35 * d.strafe;
    }
  } else {
    // Melee dinos aim a little ahead of where David is heading.
    const lead = def.lead || 0;
    const tx = hero.x + hero.vx * lead - d.x;
    const ty = hero.y + hero.vy * lead - d.y;
    const l2 = Math.hypot(tx, ty) || 1;
    mx = tx / l2;
    my = ty / l2;
  }
  d.x += mx * d.speed * s;
  d.y += my * d.speed * s;
  d.facing = hero.x < d.x ? 1 : 0;
  d.step += d.speed * s * 0.12;
}

function rangedBusy() {
  let busy = 0;
  for (const d of dinos) if (d.kind !== "king" && d.busyUntil > clock) busy += 1;
  return busy;
}

function dinoAttacks(d, def) {
  if (!onScreen(d)) return;

  if (def.layEveryMs && clock >= d.nextLay) {
    d.nextLay = clock + def.layEveryMs;
    eggs.push({ x: d.x + random(-10, 10), y: d.y + d.size * 0.3, born: clock, hatchAt: clock + 1500 });
  }

  if (def.summonEveryMs && clock >= d.nextSummon) {
    d.nextSummon = clock + def.summonEveryMs;
    for (let i = 0; i < def.summonCount; i++) {
      const a = (i / def.summonCount) * TWO_PI;
      spawnDino(random() < 0.5 ? "grunt" : "charger", d.x + Math.cos(a) * 70, d.y + Math.sin(a) * 70);
    }
    burst(d.x, d.y, 20, [COLORS.wine, COLORS.gold]);
  }

  const distance = Math.hypot(hero.x - d.x, hero.y - d.y);
  if (!def.range || distance > def.range || clock < d.nextAttack) return;
  // Only a few ranged dinos may fire at once, so attacks stay readable.
  if (d.kind !== "king" && rangedBusy() >= SPAWN.maxRangedAttackers) return;

  d.nextAttack = clock + def.cooldownMs * random(0.85, 1.15);
  const angle = Math.atan2(hero.y - d.y, hero.x - d.x);

  if (d.kind === "spitter") {
    for (let i = 0; i < def.volley; i++) {
      const a = angle + (i / (def.volley - 1) - 0.5) * def.spreadRad;
      projectiles.push({
        type: "spit",
        x: d.x,
        y: d.y,
        vx: Math.cos(a) * def.shotSpeed,
        vy: Math.sin(a) * def.shotSpeed,
        r: 7,
        damage: d.shotDamage,
        born: clock,
        life: 2400,
        friendly: false
      });
    }
    d.busyUntil = clock + 800;
  } else if (d.kind === "lobber") {
    // Two rocks bow out to either side and land together where David stood.
    const len = Math.hypot(hero.x - d.x, hero.y - d.y) || 1;
    const px = -(hero.y - d.y) / len;
    const py = (hero.x - d.x) / len;
    for (const side of [-1, 1]) {
      projectiles.push({
        type: "rock",
        sx: d.x,
        sy: d.y,
        tx: hero.x,
        ty: hero.y,
        cx: (d.x + hero.x) / 2 + px * side * len * 0.4,
        cy: (d.y + hero.y) / 2 + py * side * len * 0.4,
        x: d.x,
        y: d.y,
        height: 0,
        r: 7,
        damage: d.shotDamage,
        born: clock,
        life: def.flightMs,
        spin: random(TWO_PI),
        shape: rockShape()
      });
    }
    d.busyUntil = clock + def.flightMs;
  } else if (def.beams) {
    for (let i = 0; i < def.beams; i++) {
      beams.push({
        owner: d,
        x: d.x,
        y: d.y,
        angle: angle + (i - (def.beams - 1) / 2) * def.beamSpreadRad,
        chargeUntil: clock + def.chargeMs,
        fireUntil: clock + def.chargeMs + def.beamMs,
        width: def.beamWidth,
        length: def.range + 80,
        damage: d.shotDamage,
        hit: false
      });
    }
    d.busyUntil = clock + def.chargeMs + def.beamMs;
  }
}

// Push overlapping dinos apart (heavier ones push harder) and keep them off David.
function separate() {
  for (let i = 0; i < dinos.length; i++) {
    const a = dinos[i];
    for (let j = i + 1; j < dinos.length; j++) {
      const b = dinos[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.85;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const overlap = min - d;
      const ux = dx / d;
      const uy = dy / d;
      const total = a.mass + b.mass;
      a.x -= ux * overlap * (b.mass / total);
      a.y -= uy * overlap * (b.mass / total);
      b.x += ux * overlap * (a.mass / total);
      b.y += uy * overlap * (a.mass / total);
    }

    const hx = a.x - hero.x;
    const hy = a.y - hero.y;
    const hd = Math.hypot(hx, hy) || 1;
    const hmin = HERO.radius + a.r * 0.8;
    if (hd < hmin) {
      a.x = hero.x + (hx / hd) * hmin;
      a.y = hero.y + (hy / hd) * hmin;
    }
  }
}

function damageDino(d, amount, dirX, dirY, knock) {
  if (d.dead) return;
  const frozenMul = clock < frozenUntil ? stats().frozenDamageMul : 1;
  d.hp -= amount * frozenMul;
  d.hitAt = clock;
  d.kx += (dirX * knock * 30) / d.mass;
  d.ky += (dirY * knock * 30) / d.mass;
  burst(d.x, d.y, 3, [COLORS.dinoGreen, COLORS.gold]);
  if (d.hp <= 0) killDino(d);
}

function killDino(d) {
  d.dead = true;
  dinos.splice(dinos.indexOf(d), 1);
  kills += 1;

  const st = stats();
  const def = DINO_KINDS[d.kind];
  const gained = DINO.bones * def.bones * (frenzied() ? 2 : 1) * st.boneMul;
  profile.bones += gained;
  runBones += gained;

  combo = clock - lastKillAt < COMBO_WINDOW_MS ? combo + 1 : 1;
  lastKillAt = clock;
  bestCombo = Math.max(bestCombo, combo);

  killTimes.push(clock);
  const burstCount = killTimes.length;
  const tier = burstTier(burstCount);
  if (tier && tier.at > shownTierAt) {
    shownTierAt = tier.at;
    // Only the newest callout stays on screen.
    popups = [{ label: tier.text, color: tier.color, size: tier.size, born: clock }];
  }
  if (burstCount >= BOOMERANG.triggerAt && st.boomerangs > 0 && clock - lastBoomerangAt > BOOMERANG.cooldownMs) {
    launchBoomerangs();
  }

  const confetti = Math.round(Math.sqrt(def.size) * (d.kind === "king" ? 3 : 0.7));
  burst(d.x, d.y, confetti * 3);
  scatterConfetti(d.x, d.y, confetti, d.r);

  const drops = d.kind === "king" ? 3 : random() < DROPS.chance[d.kind] * st.dropMul ? 1 : 0;
  for (let i = 0; i < drops; i++) {
    pickups.push({ type: pickDropType(), x: d.x + random(-20, 20), y: d.y + random(-20, 20), born: clock });
  }

  if (d.kind === "king") {
    queueBanner(`The King has fallen! +${formatBones(gained)} bones`);
    shakeUntil = clock + 500;
  }
}

function burstTier(count) {
  let tier = null;
  for (const t of BURST_TIERS) if (count >= t.at) tier = t;
  return tier;
}

function pickDropType() {
  const hurt = hero.hp < stats().maxHp * 0.6;
  const weights = Object.entries(PICKUPS).map(([type, info]) => [type, type === "pint" && hurt ? info.weight * 2 : info.weight]);
  let roll = random(weights.reduce((sum, [, w]) => sum + w, 0));
  for (const [type, w] of weights) {
    roll -= w;
    if (roll <= 0) return type;
  }
  return "pint";
}

function nearestDinoTo(x, y, maxDist) {
  let found = null;
  let closest = maxDist;
  for (const d of dinos) {
    const gap = Math.hypot(d.x - x, d.y - y) - d.r;
    if (gap < closest) {
      closest = gap;
      found = d;
    }
  }
  return found;
}

function nearestDino(maxDist) {
  return nearestDinoTo(hero.x, hero.y, maxDist);
}

function countDinosNear(x, y, range) {
  let count = 0;
  for (const d of dinos) if (Math.hypot(d.x - x, d.y - y) < range + d.r) count += 1;
  return count;
}

// ---- eggs, shots, beams, traps, boomerangs ----

function updateEggs() {
  for (let i = eggs.length - 1; i >= 0; i--) {
    const e = eggs[i];
    if (clock < e.hatchAt) continue;
    eggs.splice(i, 1);
    burst(e.x, e.y, 10, [COLORS.cream, COLORS.goldLight, COLORS.dinoGreen]);
    spawnDino(random() < 0.7 ? "grunt" : "charger", e.x, e.y);
  }
}

function smashEgg(index) {
  const e = eggs[index];
  eggs.splice(index, 1);
  burst(e.x, e.y, 12, [COLORS.cream, COLORS.goldLight, COLORS.gold]);
  profile.bones += 1;
  runBones += 1;
}

function smashEggsNear(x, y, radius) {
  for (let i = eggs.length - 1; i >= 0; i--) {
    if (Math.hypot(eggs[i].x - x, eggs[i].y - y) < radius + 8) smashEgg(i);
  }
}

function updateProjectiles(s) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const age = clock - p.born;

    if (p.type === "rock") {
      const t = age / p.life;
      if (t >= 1) {
        // Rocks only hurt where they land.
        if (Math.hypot(hero.x - p.tx, hero.y - p.ty) < HERO.radius + 14) hitHero(p.damage);
        burst(p.tx, p.ty, 8, [COLORS.rock, COLORS.rockLight, COLORS.rockDark]);
        projectiles.splice(i, 1);
        continue;
      }
      const u = 1 - t;
      p.x = u * u * p.sx + 2 * u * t * p.cx + t * t * p.tx;
      p.y = u * u * p.sy + 2 * u * t * p.cy + t * t * p.ty;
      p.height = Math.sin(Math.PI * t) * 40;
      p.spin += 6 * s;
      continue;
    }

    p.x += p.vx * s;
    p.y += p.vy * s;
    let hit = false;
    if (p.friendly) {
      for (const d of dinos.slice()) {
        if (Math.hypot(d.x - p.x, d.y - p.y) < p.r + d.r) {
          const len = Math.hypot(p.vx, p.vy) || 1;
          damageDino(d, p.damage, p.vx / len, p.vy / len, 8);
          hit = true;
          break;
        }
      }
    } else if (Math.hypot(hero.x - p.x, hero.y - p.y) < HERO.radius + p.r) {
      hitHero(p.damage);
      hit = true;
    }
    const gone = age > p.life || p.x < -20 || p.x > WORLD_W + 20 || p.y < -20 || p.y > WORLD_H + 20;
    if (hit || gone) projectiles.splice(i, 1);
  }
}

function updateBeams() {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i];
    // Killing a fire-breather mid-charge cancels its breath.
    if (b.owner.dead && clock < b.chargeUntil) {
      beams.splice(i, 1);
      continue;
    }
    if (!b.owner.dead) {
      b.x = b.owner.x;
      b.y = b.owner.y;
    }
    if (clock >= b.fireUntil) {
      beams.splice(i, 1);
      continue;
    }
    if (clock >= b.chargeUntil && !b.hit) {
      const ex = b.x + Math.cos(b.angle) * b.length;
      const ey = b.y + Math.sin(b.angle) * b.length;
      if (distToSegment(hero.x, hero.y, b.x, b.y, ex, ey) < b.width / 2 + HERO.radius) {
        b.hit = true;
        hitHero(b.damage);
      }
    }
  }
}

function updateTraps() {
  for (let i = traps.length - 1; i >= 0; i--) {
    const t = traps[i];
    if (clock > t.until) {
      traps.splice(i, 1);
      continue;
    }
    if (clock < t.armAt) continue;
    if (dinos.some((d) => Math.hypot(d.x - t.x, d.y - t.y) < TRAPS.trigger + d.r)) {
      traps.splice(i, 1);
      explode(t.x, t.y, TRAPS.radius, TRAPS.damage * stats().all, [COLORS.tar, COLORS.fire, COLORS.gold]);
    }
  }
}

function explode(x, y, radius, damage, palette) {
  for (const d of dinos.slice()) {
    const gap = Math.hypot(d.x - x, d.y - y) || 1;
    if (gap < radius + d.r) damageDino(d, damage, (d.x - x) / gap, (d.y - y) / gap, 18);
  }
  smashEggsNear(x, y, radius);
  rings.push({ x, y, start: clock, expandMs: 260, maxRadius: radius, damage: 0, radius: 0, hits: new Set(), style: "blast" });
  burst(x, y, 24, palette);
  shakeUntil = clock + 200;
}

function launchBoomerangs() {
  const count = stats().boomerangs;
  lastBoomerangAt = clock;
  for (let i = 0; i < count; i++) {
    boomerangs.push({ x: hero.x, y: hero.y, angle: hero.aim + (i - (count - 1) / 2) * 0.45, born: clock, spin: 0, hits: new Map() });
  }
}

function updateBoomerangs(s) {
  const damage = stats().boomerangDamage;
  for (let i = boomerangs.length - 1; i >= 0; i--) {
    const b = boomerangs[i];
    const age = clock - b.born;
    if (age < BOOMERANG.outMs) {
      // Slows to a stop on the way out, then flies home.
      const v = BOOMERANG.speed * Math.cos((age / BOOMERANG.outMs) * (Math.PI / 2));
      b.x += Math.cos(b.angle) * v * s;
      b.y += Math.sin(b.angle) * v * s;
    } else {
      const dx = hero.x - b.x;
      const dy = hero.y - b.y;
      const len = Math.hypot(dx, dy);
      if (len < 16 || age > 5000) {
        boomerangs.splice(i, 1);
        continue;
      }
      const step = Math.min(BOOMERANG.speed * 1.1 * s, len);
      b.x += (dx / len) * step;
      b.y += (dy / len) * step;
    }
    b.spin += 18 * s;

    for (const d of dinos.slice()) {
      if (Math.hypot(d.x - b.x, d.y - b.y) > BOOMERANG.radius + d.r) continue;
      if (clock - (b.hits.get(d) || -Infinity) < BOOMERANG.hitCooldownMs) continue;
      b.hits.set(d, clock);
      damageDino(d, damage, Math.cos(b.angle), Math.sin(b.angle), 8);
    }
  }
}

// ---- shockwaves and pickups ----

function updateRings() {
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    const t = (clock - ring.start) / ring.expandMs;
    if (t < 0) continue;
    if (t > 1) {
      rings.splice(i, 1);
      continue;
    }
    ring.radius = ring.maxRadius * easeOut(t);
    if (!ring.damage) continue;
    for (const d of dinos.slice()) {
      if (ring.hits.has(d)) continue;
      const gap = Math.hypot(d.x - ring.x, d.y - ring.y) || 1;
      if (gap < ring.radius + d.r) {
        ring.hits.add(d);
        damageDino(d, ring.damage, (d.x - ring.x) / gap, (d.y - ring.y) / gap, 16);
      }
    }
    smashEggsNear(ring.x, ring.y, ring.radius);
  }
}

function updatePickups(s) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const dx = hero.x - p.x;
    const dy = hero.y - p.y;
    const gap = Math.hypot(dx, dy) || 1;
    // Drinks close by slide over to David.
    if (gap < DROPS.magnetRadius) {
      const pull = Math.min(260 * s, gap);
      p.x += (dx / gap) * pull;
      p.y += (dy / gap) * pull;
    }
    if (gap < HERO.radius + 12) {
      collect(p);
      pickups.splice(i, 1);
    } else if (clock - p.born > DROPS.lifeMs) {
      pickups.splice(i, 1);
    }
  }
}

function collect(p) {
  const st = stats();
  const info = PICKUPS[p.type];
  if (p.type === "pint") hero.hp = Math.min(st.maxHp, hero.hp + st.maxHp * 0.3);
  if (p.type === "rocks") {
    frozenUntil = clock + st.freezeMs;
    // Frozen breathers lose the breath they were charging.
    beams = beams.filter((b) => clock >= b.chargeUntil);
  }
  if (p.type === "shot") meteor();
  if (p.type === "wine") frenzyUntil = clock + info.duration;
  if (p.type === "margarita") {
    hero.dashCharges = st.dashCharges;
    hero.quakeAt = -Infinity;
  }
  queueBanner(info.label, true);
  burst(hero.x, hero.y, 14);
}

// ---- drawing ----

function drawFloor() {
  background(COLORS.paper);
  noStroke();
  fill(212, 175, 55, 22);
  circle(WORLD_W * 0.15, WORLD_H * 0.12, 320);
  fill(15, 61, 46, 14);
  circle(WORLD_W * 0.9, WORLD_H * 0.88, 360);

  // Dance-floor tiles.
  stroke(212, 175, 55, 30);
  strokeWeight(1);
  const tile = 50;
  for (let x = tile; x < WORLD_W; x += tile) line(x, 0, x, WORLD_H);
  for (let y = tile; y < WORLD_H; y += tile) line(0, y, WORLD_W, y);

  // Confetti left behind by fallen dinos.
  noStroke();
  const ctx = drawingContext;
  for (const b of floorBits) {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = b.color;
    ctx.fillRect(-b.size / 2, -b.size * 0.3, b.size, b.size * 0.6);
    ctx.rotate(-b.angle);
    ctx.translate(-b.x, -b.y);
  }

  if (clock < frozenUntil) {
    fill(140, 200, 222, 45);
    rect(0, 0, WORLD_W, WORLD_H);
  }
}

function drawTraps() {
  for (const t of traps) {
    const armed = clock >= t.armAt;
    noStroke();
    fill(COLORS.tar);
    ellipse(t.x, t.y, 22, 15);
    fill(255, 253, 247, 70);
    ellipse(t.x - 4, t.y - 3, 6, 3);
    if (armed) {
      noFill();
      stroke(212, 175, 55, 120 + 80 * Math.sin(clock * 0.012));
      strokeWeight(1.5);
      ellipse(t.x, t.y, 30, 21);
    }
  }
}

function drawEggs() {
  for (const e of eggs) {
    const t = (clock - e.born) / (e.hatchAt - e.born);
    // Wobble harder as it gets close to hatching.
    const wobble = Math.sin(clock * 0.03) * 0.25 * t * t;
    push();
    translate(e.x, e.y);
    rotate(wobble);
    noStroke();
    fill(15, 61, 46, 30);
    ellipse(0, 8, 16, 5);
    stroke(COLORS.forest);
    strokeWeight(1.2);
    fill(COLORS.cream);
    ellipse(0, 0, 14, 18);
    noStroke();
    fill(COLORS.dinoGreen);
    circle(-3, -2, 2.5);
    circle(2, 3, 2);
    circle(3, -4, 1.8);
    if (t > 0.6) {
      stroke(COLORS.forest);
      strokeWeight(1);
      noFill();
      beginShape();
      vertex(-6, -1);
      vertex(-2, 2);
      vertex(1, -2);
      vertex(5, 1);
      endShape();
    }
    pop();
  }
}

function drawDinos() {
  const frozen = clock < frozenUntil;
  // Draw lower dinos last so they overlap the ones behind them.
  const sorted = dinos.slice().sort((a, b) => a.y - b.y);
  for (const d of sorted) {
    const set = frozen ? sprites.trexIce : clock - d.hitAt < 110 ? sprites.trexHit : sprites.kinds[d.kind];
    const img = set[d.facing];
    const h = d.size;
    const w = h * (img.width / img.height);

    push();
    translate(d.x, d.y);
    noStroke();
    fill(15, 61, 46, 30);
    ellipse(0, h * 0.42, w * 0.65, h * 0.13);
    if (!frozen) {
      rotate(Math.sin(d.step) * 0.09);
      translate(0, -Math.abs(Math.sin(d.step)) * 2.5);
    }
    imageMode(CENTER);
    image(img, 0, 0, w, h);
    if (d.kind === "king") drawCrown(d.facing ? -w * 0.18 : w * 0.18, -h * 0.5, h * 0.2);
    pop();

    // Bars only for the king and dinos that have been hit, to keep the horde readable.
    if (d.kind === "king" || d.hp < d.maxHp) {
      const barW = Math.max(w * 0.55, 20);
      // The king's bar sits above his crown.
      const y = d.y - h * (d.kind === "king" ? 0.72 : 0.5) - 8;
      noStroke();
      fill(15, 61, 46, 60);
      rect(d.x - barW / 2, y, barW, 4, 2);
      fill(d.kind === "king" ? COLORS.danger : COLORS.gold);
      rect(d.x - barW / 2, y, barW * Math.max(d.hp / d.maxHp, 0), 4, 2);
    }
  }
}

function drawCrown(x, y, size) {
  push();
  translate(x, y);
  stroke(COLORS.forest);
  strokeWeight(1.2);
  fill(COLORS.gold);
  beginShape();
  vertex(-size / 2, 0);
  vertex(-size / 2, -size * 0.6);
  vertex(-size / 4, -size * 0.25);
  vertex(0, -size * 0.75);
  vertex(size / 4, -size * 0.25);
  vertex(size / 2, -size * 0.6);
  vertex(size / 2, 0);
  endShape(CLOSE);
  pop();
}

function drawProjectiles() {
  for (const p of projectiles) {
    if (p.type === "rock") {
      // Landing mark grows more urgent as the rock comes down.
      const t = (clock - p.born) / p.life;
      noFill();
      stroke(178, 58, 58, 60 + 160 * t);
      strokeWeight(1.5);
      circle(p.tx, p.ty, (HERO.radius + 14) * 2 * (1.3 - 0.3 * t));
      noStroke();
      fill(15, 61, 46, 40);
      ellipse(p.x, p.y, 12, 5);
      drawRock(p.x, p.y - p.height, p.r * 2, p.spin, p.shape);
    } else {
      stroke(p.friendly ? COLORS.gold : COLORS.forest);
      strokeWeight(p.friendly ? 2.5 : 1.5);
      fill(COLORS.spit);
      circle(p.x, p.y, p.r * 2);
      noStroke();
      fill(255, 253, 247, 140);
      circle(p.x - 2, p.y - 2, 3);
    }
  }
}

function drawRock(x, y, size, spin, shape) {
  push();
  translate(x, y);
  rotate(spin);
  stroke(COLORS.rockDark);
  strokeWeight(1.2);
  fill(COLORS.rock);
  beginShape();
  shape.forEach((k, i) => {
    const a = (i / shape.length) * TWO_PI;
    vertex(Math.cos(a) * (size / 2) * k, Math.sin(a) * (size / 2) * k);
  });
  endShape(CLOSE);
  noStroke();
  fill(COLORS.rockLight);
  circle(-size * 0.15, -size * 0.15, size * 0.3);
  pop();
}

function rockShape() {
  const points = Math.floor(random(6, 10));
  return Array.from({ length: points }, () => random(0.7, 1.15));
}

function drawBeams(firing) {
  for (const b of beams) {
    const charging = clock < b.chargeUntil;
    if (charging === firing) continue;
    const ex = b.x + Math.cos(b.angle) * b.length;
    const ey = b.y + Math.sin(b.angle) * b.length;
    if (charging) {
      // Telegraph: a dashed line that pulses faster as the breath gets close.
      const left = (b.chargeUntil - clock) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(clock * (0.01 + 0.02 / Math.max(left, 0.2)));
      stroke(178, 58, 58, 80 + 120 * pulse);
      strokeWeight(2);
      drawingContext.setLineDash([6, 6]);
      line(b.x, b.y, ex, ey);
      drawingContext.setLineDash([]);
    } else {
      const fade = (b.fireUntil - clock) / (b.fireUntil - b.chargeUntil);
      strokeCap(ROUND);
      stroke(224, 112, 42, 220 * fade);
      strokeWeight(b.width + 6);
      line(b.x, b.y, ex, ey);
      stroke(241, 217, 138, 255 * fade);
      strokeWeight(b.width * 0.45);
      line(b.x, b.y, ex, ey);
    }
  }
}

function drawBoomerangs() {
  for (const b of boomerangs) drawBone(b.x, b.y, b.spin, 26);
}

function drawBone(x, y, angle, length) {
  push();
  translate(x, y);
  rotate(angle);
  strokeCap(ROUND);
  stroke(COLORS.forest);
  strokeWeight(7);
  line(-length / 2, 0, length / 2, 0);
  stroke(COLORS.cream);
  strokeWeight(4);
  line(-length / 2, 0, length / 2, 0);
  stroke(COLORS.forest);
  strokeWeight(1.3);
  fill(COLORS.cream);
  for (const end of [-length / 2, length / 2]) {
    circle(end, -3, 7);
    circle(end, 3, 7);
  }
  pop();
}

function drawTwins() {
  const size = HERO.radius * 2;
  const reach = clubReach() * TWIN.reachMul;
  for (const t of twins) {
    drawClubFor(t, reach);
    noStroke();
    fill(142, 36, 64, 90);
    circle(t.x, t.y, size + 8);
    drawingContext.globalAlpha = 0.85;
    imageMode(CENTER);
    image(sprites.face, t.x, t.y, size, size);
    imageMode(CORNER);
    drawingContext.globalAlpha = 1;
  }
}

function drawHero() {
  const size = HERO.radius * 2 + 6;
  const ctx = drawingContext;
  imageMode(CENTER);

  // Dash afterimages.
  for (const t of hero.trail) {
    ctx.globalAlpha = 0.35 * (1 - (clock - t.at) / 160);
    image(sprites.face, t.x, t.y, size, size);
  }
  ctx.globalAlpha = 1;

  if (frenzied()) {
    noStroke();
    fill(142, 36, 64, 60 + 40 * Math.sin(clock * 0.015));
    circle(hero.x, hero.y, size + 18);
  }

  drawClubFor(hero, clubReach());

  const invulnerable = clock - hero.dashAt < DASH.iframeMs;
  if (invulnerable) ctx.globalAlpha = 0.65;
  imageMode(CENTER);
  image(sprites.face, hero.x, hero.y, size, size);
  ctx.globalAlpha = 1;
  imageMode(CORNER);

  // Turtle Shell layers show as gold rings around David.
  if (hero.shell > 0) {
    noFill();
    stroke(COLORS.gold);
    strokeWeight(1.5);
    for (let i = 0; i < hero.shell; i++) circle(hero.x, hero.y, size + 6 + i * 5);
  }

  if (clock - hero.hurtAt < 160 && frameCount % 6 < 3) {
    noStroke();
    fill(178, 58, 58, 110);
    circle(hero.x, hero.y, size);
  }
}

// The bone club: a swipe across the arc while swinging, otherwise resting at the side.
function drawClubFor(who, reach) {
  const swingT = (clock - who.swingAt) / CLUB.swingMs;
  let angle = who.aim + 0.9 * who.swingSide;
  if (swingT >= 0 && swingT < 1) {
    const from = who.swingAim - who.swingSide * (CLUB.arc / 2);
    angle = from + who.swingSide * CLUB.arc * easeOut(swingT);
    noStroke();
    fill(212, 175, 55, 110 * (1 - swingT));
    arc(who.x, who.y, reach * 2, reach * 2, Math.min(from, angle), Math.max(from, angle), PIE);
  }

  push();
  translate(who.x, who.y);
  rotate(angle);
  const start = HERO.radius - 2;
  const end = reach * 0.92;
  strokeCap(ROUND);
  stroke(COLORS.forest);
  strokeWeight(8);
  line(start, 0, end, 0);
  stroke(COLORS.cream);
  strokeWeight(5);
  line(start, 0, end, 0);
  // Knobby bone ends.
  stroke(COLORS.forest);
  strokeWeight(1.5);
  fill(COLORS.cream);
  for (const x of [start, end]) {
    circle(x, -3.5, 8);
    circle(x, 3.5, 8);
  }
  pop();
}

function drawRings() {
  noFill();
  for (const ring of rings) {
    const t = (clock - ring.start) / ring.expandMs;
    if (t < 0 || t > 1) continue;
    const fade = 1 - t;
    if (ring.style === "blast") {
      noStroke();
      fill(224, 112, 42, 70 * fade);
      circle(ring.x, ring.y, ring.radius * 2);
      noFill();
      stroke(178, 58, 58, 220 * fade);
      strokeWeight(5);
    } else {
      stroke(212, 175, 55, 230 * fade);
      strokeWeight(4);
    }
    circle(ring.x, ring.y, ring.radius * 2);
  }
}

function drawPickups() {
  for (const p of pickups) {
    const age = clock - p.born;
    // Blink during the last three seconds before it disappears.
    if (age > DROPS.lifeMs - 3000 && Math.floor(age / 150) % 2 === 0) continue;
    push();
    translate(p.x, p.y + Math.sin(age * 0.005) * 3);
    noStroke();
    fill(212, 175, 55, 70);
    circle(0, 0, 40);
    drawDrink(PICKUPS[p.type].sprite, -14, -17, 28, 34);
    pop();
  }
}

// Draw one drink sticker, fit inside the box without stretching.
function drawDrink(index, x, y, w, h) {
  const s = DRINK_SPRITES[index];
  const fit = Math.min(w / s.w, h / s.h);
  const dw = s.w * fit;
  const dh = s.h * fit;
  image(images.drinks, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, s.x, s.y, s.w, s.h);
}

function drawHud() {
  const st = stats();
  push();
  // Health.
  const barW = Math.min(150, WORLD_W * 0.32);
  const hpFrac = constrain(hero.hp / st.maxHp, 0, 1);
  noStroke();
  fill(15, 61, 46, 40);
  rect(16, 16, barW, 12, 6);
  fill(hpFrac < 0.3 ? COLORS.danger : COLORS.gold);
  rect(16, 16, barW * hpFrac, 12, 6);
  noFill();
  stroke(COLORS.forest);
  strokeWeight(1);
  rect(16, 16, barW, 12, 6);
  // Turtle Shell layers next to the bar.
  for (let i = 0; i < st.shellLayers; i++) {
    stroke(COLORS.forest);
    fill(i < hero.shell ? COLORS.gold : COLORS.paper);
    circle(16 + barW + 10 + i * 12, 22, 9);
  }

  noStroke();
  fill(COLORS.forest);
  textStyle(BOLD);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(formatTime(clock), WORLD_W / 2, 22);
  textSize(13);
  textAlign(RIGHT, CENTER);
  text(`${kills} ${kills === 1 ? "DINO" : "DINOS"}`, WORLD_W - 16, 22);

  stroke(COLORS.gold);
  strokeWeight(1);
  line(16, 38, WORLD_W - 16, 38);

  // Timers for active drinks.
  const timers = [];
  if (clock < frozenUntil) timers.push({ left: frozenUntil - clock, total: st.freezeMs, color: COLORS.ice });
  if (frenzied()) timers.push({ left: frenzyUntil - clock, total: PICKUPS.wine.duration, color: COLORS.wine });
  timers.forEach((t, i) => {
    noStroke();
    fill(t.color);
    rect(16, 42 + i * 5, (WORLD_W - 32) * (t.left / t.total), 3, 2);
  });

  if (combo >= 2) {
    noStroke();
    fill(COLORS.forest);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(`COMBO ×${combo}`, 16, 60);
  }

  // Bone Market button with the bones banked.
  const label = `${formatBones(profile.bones)} BONES · MARKET${touchMode ? "" : " (B)"}`;
  textSize(10);
  textStyle(BOLD);
  const w = textWidth(label) + 22;
  drawPillButton("market", WORLD_W - 16 - w, 50, w, 20, label, false);

  if (!touchMode && state === "playing") {
    const dashLabel = `SHIFT · DASH${st.dashCharges > 1 ? ` ×${hero.dashCharges}` : ""}`;
    const dashProgress = hero.dashCharges >= 1 ? 1 : 1 - (hero.nextDashAt - clock) / st.dashCooldownMs;
    drawCooldownPill(16, WORLD_H - 30, dashLabel, dashProgress);
    drawCooldownPill(124, WORLD_H - 30, "R · QUAKE", (clock - hero.quakeAt) / QUAKE.cooldownMs);
  }
  pop();
}

// A clickable pill drawn on the canvas; taps on it are matched through uiButtons.
function drawPillButton(id, x, y, w, h, label, filled) {
  uiButtons.push({ id, x, y, w, h });
  stroke(COLORS.gold);
  strokeWeight(1.2);
  fill(filled ? COLORS.forest : COLORS.paper);
  rect(x, y, w, h, h / 2);
  noStroke();
  fill(filled ? COLORS.paper : COLORS.forest);
  textStyle(BOLD);
  textSize(10);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 + 1);
}

function drawCooldownPill(x, y, label, progress) {
  const w = 100;
  const h = 18;
  const ready = progress >= 1;
  noStroke();
  fill(ready ? COLORS.gold : COLORS.paper);
  rect(x, y, w, h, 9);
  if (!ready) {
    fill(COLORS.goldLight);
    rect(x, y, w * constrain(progress, 0, 1), h, 9);
  }
  noFill();
  stroke(COLORS.gold);
  strokeWeight(1);
  rect(x, y, w, h, 9);
  noStroke();
  fill(COLORS.forest);
  textStyle(BOLD);
  textSize(9);
  textAlign(CENTER, CENTER);
  text(label, x + w / 2, y + h / 2 + 1);
}

function touchButtons() {
  const st = stats();
  return {
    dash: {
      x: WORLD_W - 56,
      y: WORLD_H - 62,
      r: 30,
      label: st.dashCharges > 1 ? `DASH ×${hero.dashCharges}` : "DASH",
      progress: hero.dashCharges >= 1 ? 1 : 1 - (hero.nextDashAt - clock) / st.dashCooldownMs
    },
    quake: { x: WORLD_W - 124, y: WORLD_H - 44, r: 25, label: "QUAKE", progress: (clock - hero.quakeAt) / QUAKE.cooldownMs }
  };
}

function drawTouchControls() {
  push();
  for (const b of Object.values(touchButtons())) {
    const ready = b.progress >= 1;
    stroke(COLORS.gold);
    strokeWeight(1.5);
    fill(ready ? COLORS.forest : COLORS.paper);
    circle(b.x, b.y, b.r * 2);
    if (!ready) {
      noStroke();
      fill(15, 61, 46, 70);
      arc(b.x, b.y, b.r * 2, b.r * 2, -HALF_PI, -HALF_PI + TWO_PI * constrain(b.progress, 0, 1), PIE);
    }
    noStroke();
    fill(ready ? COLORS.paper : COLORS.forest);
    textStyle(BOLD);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(b.label, b.x, b.y + 1);
  }

  if (stick) {
    const ox = stick.ox / viewScale;
    const oy = stick.oy / viewScale;
    const dx = (stick.x - stick.ox) / viewScale;
    const dy = (stick.y - stick.oy) / viewScale;
    const len = Math.hypot(dx, dy) || 1;
    const max = 44 / viewScale;
    const k = Math.min(len, max) / len;
    noFill();
    stroke(212, 175, 55, 150);
    strokeWeight(2);
    circle(ox, oy, max * 2 + 20);
    noStroke();
    fill(15, 61, 46, 120);
    circle(ox + dx * k, oy + dy * k, 26);
  } else if (clock < 5000) {
    noStroke();
    fill(COLORS.muted);
    textStyle(ITALIC);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("Drag anywhere to move", WORLD_W / 2, WORLD_H - 110);
  }
  pop();
}

function drawPopups() {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    const age = clock - p.born;
    if (age > 1100) {
      popups.splice(i, 1);
      continue;
    }
    const popScale = age < 120 ? 1.3 - 0.3 * (age / 120) : 1;
    const fade = age > 700 ? 1 - (age - 700) / 400 : 1;
    push();
    translate(WORLD_W / 2, Math.max(WORLD_H * 0.3, 158) - age * 0.02);
    scale(popScale);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    textSize(p.size);
    // Shrink long callouts so they fit narrow screens.
    const fit = Math.min(1, (WORLD_W - 40) / textWidth(p.label));
    textSize(p.size * fit);
    stroke(255, 253, 247, 255 * fade);
    strokeWeight(5);
    const c = color(p.color);
    c.setAlpha(255 * fade);
    fill(c);
    text(p.label, 0, 0);
    pop();
  }
}

function drawStartScreen() {
  const controls = touchMode
    ? "Drag to move · the club swings by itself · tap DASH and QUAKE"
    : "WASD to move · click to swing · Shift to dash · R to quake";
  const record = profile.best.time > 0 ? ` · best ${formatTime(profile.best.time)}` : "";
  drawOverlay("Prehistoric Carnage", [
    "Tuxedo T-rexes are crashing David's party, and they get tougher every minute. Hold the dance floor!",
    controls,
    `${formatBones(profile.bones)} bones banked${record}`
  ], touchMode ? "Tap to start" : "Click to start");
}

function drawGameOver() {
  const lines = [
    `Lasted ${formatTime(clock)} · ${kills} dinos · best combo ×${bestCombo}`,
    `+${formatBones(runBones)} bones this run · ${formatBones(profile.bones)} banked`,
    newBest ? "New personal best!" : `Best: ${formatTime(profile.best.time)} · ${profile.best.kills} dinos`
  ];
  drawOverlay("Extinct!", lines, touchMode ? "Tap to play again" : "Click to play again");
}

function drawOverlay(title, lines, prompt) {
  push();
  noStroke();
  fill(246, 240, 228, 225);
  rect(0, 0, WORLD_W, WORLD_H);

  const cardW = 330;
  const cardH = Math.min(384, WORLD_H - 12);
  const cx = WORLD_W / 2;
  const top = WORLD_H / 2 - cardH / 2;
  stroke(COLORS.gold);
  strokeWeight(1.5);
  fill(COLORS.paper);
  rect(cx - cardW / 2, top, cardW, cardH, 16);

  const trex = sprites.trex[0];
  const trexH = 112;
  const trexW = trexH * (trex.width / trex.height);
  image(trex, cx - trexW / 2, top + 14, trexW, trexH);

  noStroke();
  fill(COLORS.forest);
  textAlign(CENTER, CENTER);
  textSize(title.length > 16 ? 26 : 30);
  text(title, cx, top + 146);

  fill(COLORS.muted);
  textStyle(ITALIC);
  textSize(13);
  textAlign(CENTER, TOP);
  const wrapW = cardW - 44;
  let y = top + 170;
  for (const entry of lines) {
    text(entry, cx - wrapW / 2, y, wrapW, 70);
    y += Math.ceil(textWidth(entry) / (wrapW - 10)) * 17 + 6;
  }

  drawPillButton("market", cx - 85, top + cardH - 68, 170, 26, `BONE MARKET${touchMode ? "" : " (B)"}`, true);

  if (prompt) {
    noStroke();
    fill(COLORS.gold);
    textStyle(BOLD);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(prompt.toUpperCase(), cx, top + cardH - 22);
  }
  pop();
}

// Banners queue up so a new-dino warning doesn't hide a pickup message.
function queueBanner(message, urgent = false) {
  if (urgent) banners = banners.filter((b) => !b.shown);
  banners.push({ message, until: 0, shown: false });
}

function drawBanner() {
  if (state !== "playing" && state !== "paused") return;
  while (banners.length && banners[0].shown && clock > banners[0].until) banners.shift();
  const banner = banners[0];
  if (!banner) return;
  if (!banner.shown) {
    banner.shown = true;
    banner.until = clock + 2200;
  }
  const fade = constrain((banner.until - clock) / 400, 0, 1);
  push();
  textSize(13);
  textStyle(BOLD);
  const w = Math.min(textWidth(banner.message) + 36, WORLD_W - 24);
  const y = 90;
  noStroke();
  fill(15, 61, 46, 230 * fade);
  rect(WORLD_W / 2 - w / 2, y - 17, w, 34, 17);
  fill(255, 253, 247, 255 * fade);
  textAlign(CENTER, CENTER);
  text(banner.message, WORLD_W / 2 - w / 2 + 12, y - 16, w - 24, 32);
  pop();
}

// ---- confetti ----

function burst(x, y, count, palette = [COLORS.gold, COLORS.goldLight, COLORS.forest, COLORS.dinoGreen]) {
  for (let i = 0; i < count && sparks.length < 600; i++) {
    const a = random(TWO_PI);
    const v = random(1, 4.5);
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 1.5,
      life: 1,
      size: random(3, 6),
      color: random(palette),
      spin: random(TWO_PI)
    });
  }
}

function updateSparks(s) {
  const f = s * 60;
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.x += p.vx * f;
    p.y += p.vy * f;
    p.vy += 0.12 * f;
    p.spin += 0.2 * f;
    p.life -= 0.025 * f;
    if (p.life <= 0) sparks.splice(i, 1);
  }
}

function drawSparks() {
  const ctx = drawingContext;
  for (const p of sparks) {
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.rotate(-p.spin);
    ctx.translate(-p.x, -p.y);
  }
  ctx.globalAlpha = 1;
}

// Confetti that settles on the dance floor and stays for the rest of the run.
function scatterConfetti(x, y, count, spread) {
  const palette = [COLORS.gold, COLORS.goldLight, COLORS.forestLight, COLORS.dinoGreen];
  for (let i = 0; i < count; i++) {
    floorBits.push({
      x: x + random(-spread, spread),
      y: y + random(-spread, spread),
      angle: random(TWO_PI),
      size: random(3, 6),
      color: random(palette)
    });
  }
  if (floorBits.length > 320) floorBits.splice(0, floorBits.length - 320);
}

// ---- helpers ----

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = constrain(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatBones(n) {
  return Math.floor(n).toLocaleString("en-US");
}

// Circular crop of David's face from the photo, with a gold rim.
function makeFaceSprite() {
  const size = 128;
  const g = createGraphics(size, size);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
  ctx.clip();
  // The face sits at about (960, 390) in the 2100 x 1500 photo.
  const photo = images.photo;
  const crop = photo.width * 0.23;
  g.image(photo, 0, 0, size, size, photo.width * 0.457 - crop / 2, photo.height * 0.26 - crop / 2, crop, crop);
  ctx.restore();
  g.noFill();
  g.stroke(COLORS.gold);
  g.strokeWeight(6);
  g.circle(size / 2, size / 2, size - 6);
  const sprite = g.get();
  g.remove();
  return sprite;
}

// The T-rex art sits on solid white. Flood-fill from the edges to make that
// background transparent while keeping the white shirt inside the outline.
function cutOutWhite(source, maxSide) {
  const img = source.get();
  const shrink = Math.min(1, maxSide / Math.max(img.width, img.height));
  img.resize(Math.round(img.width * shrink), Math.round(img.height * shrink));
  img.loadPixels();

  const w = img.width;
  const h = img.height;
  const px = img.pixels;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const isWhite = (i) => px[i * 4] > 232 && px[i * 4 + 1] > 232 && px[i * 4 + 2] > 232;

  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !isWhite(i)) continue;
    seen[i] = 1;
    px[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }

  img.updatePixels();
  return img;
}

// Mirror an image left to right, so dinos can face the way they walk.
function flipImage(img) {
  const g = createGraphics(img.width, img.height);
  g.pixelDensity(1);
  g.translate(img.width, 0);
  g.scale(-1, 1);
  g.image(img, 0, 0);
  const flipped = g.get();
  g.remove();
  return flipped;
}

// Pre-tinted copies, so dino types and hit flashes don't need tint() every frame.
function tintedCopy(img, rgb) {
  const g = createGraphics(img.width, img.height);
  g.pixelDensity(1);
  g.tint(rgb[0], rgb[1], rgb[2]);
  g.image(img, 0, 0);
  const tinted = g.get();
  g.remove();
  return tinted;
}

// ---- the Bone Market (HTML panel over the canvas) ----

const marketEl = {
  root: document.getElementById("market"),
  list: document.getElementById("market-list"),
  bones: document.getElementById("market-bones"),
  close: document.getElementById("market-close"),
  reset: document.getElementById("market-reset"),
  tabs: Array.from(document.querySelectorAll(".market-tab"))
};
let marketPage = "arsenal";
let holdTimer = 0;
let resetArmedUntil = 0;

function openMarket() {
  if (marketOpen) return;
  marketOpen = true;
  holding = false;
  stick = null;
  saveProfile();
  renderMarketPage();
  marketEl.root.hidden = false;
  marketEl.close.focus();
}

function closeMarket() {
  if (!marketOpen) return;
  marketOpen = false;
  stopHold();
  marketEl.root.hidden = true;
  saveProfile();
}

function renderMarketPage() {
  marketEl.tabs.forEach((tab) => {
    const active = tab.dataset.page === marketPage;
    tab.setAttribute("aria-selected", String(active));
    tab.classList.toggle("is-active", active);
  });
  marketEl.list.textContent = "";
  for (const item of UPGRADES.filter((u) => u.page === marketPage)) {
    const row = document.createElement("li");
    row.className = "upgrade";
    row.innerHTML = `
      <div class="upgrade-copy">
        <h3 class="upgrade-name">${item.name} <span class="upgrade-level"></span></h3>
        <p class="upgrade-desc">${item.desc}</p>
      </div>
      <button class="upgrade-buy" type="button" data-id="${item.id}"></button>`;
    marketEl.list.appendChild(row);
  }
  refreshMarket();
}

// Update prices and levels in place, so a held button isn't replaced mid-press.
function refreshMarket() {
  if (!marketOpen) return;
  marketEl.bones.textContent = formatBones(profile.bones);
  for (const button of marketEl.list.querySelectorAll(".upgrade-buy")) {
    const item = UPGRADE_BY_ID.get(button.dataset.id);
    const rank = level(item.id);
    const maxed = item.max && rank >= item.max;
    const cost = costOf(item);
    button.textContent = maxed ? "Max" : `${formatBones(cost)} bones`;
    button.disabled = maxed || profile.bones < cost;
    button.setAttribute("aria-label", maxed ? `${item.name} is maxed out` : `Buy ${item.name} for ${formatBones(cost)} bones`);
    const levelText = rank > 0 ? `Lv ${rank}${item.max ? ` / ${item.max}` : ""}` : "";
    button.closest(".upgrade").querySelector(".upgrade-level").textContent = levelText;
  }
}

// Press and hold to keep buying: first repeat after 300 ms, then every 140 ms,
// speeding up to every 75 ms after a second (Carnage's hold-to-buy timing).
function startHold(id) {
  stopHold();
  if (!buy(id)) return;
  const startedAt = performance.now();
  const repeat = () => {
    if (!buy(id)) {
      stopHold();
      return;
    }
    holdTimer = setTimeout(repeat, performance.now() - startedAt > 1000 ? 75 : 140);
  };
  holdTimer = setTimeout(repeat, 300);
}

function stopHold() {
  clearTimeout(holdTimer);
  holdTimer = 0;
}

marketEl.list.addEventListener("pointerdown", (event) => {
  const button = event.target.closest(".upgrade-buy");
  if (!button || button.disabled) return;
  event.preventDefault();
  startHold(button.dataset.id);
});
// Keyboard presses arrive as clicks with no pointer behind them.
marketEl.list.addEventListener("click", (event) => {
  const button = event.target.closest(".upgrade-buy");
  if (button && event.detail === 0) buy(button.dataset.id);
});
window.addEventListener("pointerup", stopHold);
window.addEventListener("pointercancel", stopHold);
marketEl.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    marketPage = tab.dataset.page;
    stopHold();
    renderMarketPage();
  });
});
marketEl.close.addEventListener("click", closeMarket);
marketEl.root.addEventListener("click", (event) => {
  if (event.target === marketEl.root) closeMarket();
});
marketEl.reset.addEventListener("click", () => {
  if (performance.now() < resetArmedUntil) {
    const before = stats();
    profile = freshProfile();
    statsCache = null;
    hero.hp = Math.min(hero.hp, stats().maxHp);
    applyUpgradesToRun(before);
    saveProfile();
    resetArmedUntil = 0;
    marketEl.reset.textContent = "Reset progress";
    refreshMarket();
    return;
  }
  resetArmedUntil = performance.now() + 3000;
  marketEl.reset.textContent = "Tap again to erase all bones and upgrades";
  setTimeout(() => {
    if (performance.now() >= resetArmedUntil) marketEl.reset.textContent = "Reset progress";
  }, 3100);
});

// ---- input ----

function isCanvasEvent(event) {
  return !event || !event.target || event.target.tagName === "CANVAS";
}

function uiButtonAt(wx, wy) {
  return uiButtons.find((b) => wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h);
}

function handleTap() {
  if (state === "ready") startGame();
  else if (state === "paused") state = "playing";
  else if (state === "lost") {
    newGame();
    startGame();
  }
}

function mousePressed(event) {
  // Only presses on the game itself, so links and the market still work.
  if (!isCanvasEvent(event) || marketOpen) return;
  touchMode = false;
  if (uiButtonAt(mouseX / viewScale, mouseY / viewScale)) {
    openMarket();
    return;
  }
  if (state === "playing") {
    holding = true;
    swing();
  } else {
    handleTap();
  }
}

function mouseReleased() {
  holding = false;
}

function touchStarted(event) {
  if (!isCanvasEvent(event) || marketOpen) return;
  touchMode = true;
  const buttons = touchButtons();
  for (const t of touches) {
    if (seenTouches.has(t.id)) continue;
    seenTouches.add(t.id);
    const wx = t.x / viewScale;
    const wy = t.y / viewScale;
    if (uiButtonAt(wx, wy)) {
      openMarket();
      return false;
    }
    if (state !== "playing") {
      handleTap();
      return false;
    }
    if (dist(wx, wy, buttons.dash.x, buttons.dash.y) < buttons.dash.r + 8) dash();
    else if (dist(wx, wy, buttons.quake.x, buttons.quake.y) < buttons.quake.r + 8) quake();
    else if (!stick) stick = { id: t.id, ox: t.x, oy: t.y, x: t.x, y: t.y };
  }
  return false;
}

function touchMoved(event) {
  if (!isCanvasEvent(event)) return;
  if (stick) {
    const t = touches.find((touch) => touch.id === stick.id);
    if (t) {
      stick.x = t.x;
      stick.y = t.y;
    }
  }
  return false;
}

function touchEnded(event) {
  const active = new Set(touches.map((t) => t.id));
  for (const id of [...seenTouches]) if (!active.has(id)) seenTouches.delete(id);
  if (stick && !active.has(stick.id)) stick = null;
  if (isCanvasEvent(event)) return false;
}

function keyPressed() {
  if (marketOpen) {
    if (keyCode === ESCAPE || key === "b" || key === "B") {
      closeMarket();
      return false;
    }
    return;
  }
  if (key === "b" || key === "B") {
    openMarket();
    return false;
  }

  if (keyCode === ESCAPE || key === "p" || key === "P") {
    if (state === "playing") {
      state = "paused";
      holding = false;
    } else if (state === "paused") {
      state = "playing";
    }
    return;
  }

  if (state !== "playing") {
    if (keyCode === ENTER || key === " ") {
      handleTap();
      return false;
    }
    return;
  }

  if (keyCode === SHIFT || key === " ") {
    dash();
    return false;
  }
  if (key === "r" || key === "R" || key === "e" || key === "E") quake();
}

// Pause and save when the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  if (state === "playing") {
    state = "paused";
    holding = false;
    stick = null;
  }
  saveProfile();
});
