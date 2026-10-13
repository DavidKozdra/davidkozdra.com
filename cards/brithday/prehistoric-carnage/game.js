// Prehistoric Carnage: a birthday-sized take on Infinite Carnage.
// David holds the dance floor with a bone club while a horde of tuxedo T-rexes
// closes in, arriving faster and faster the longer he lasts.
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
  ice: "#8cc8de",
  wine: "#8e2440"
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

// Speeds are in world units per second, times in milliseconds.
const HERO = { radius: 18, maxHp: 100, speed: 150, regen: 1.5 };
const CLUB = { reach: 66, arc: Math.PI * 0.9, damage: 34, swingMs: 170, cooldownMs: 110, holdRepeatMs: 280 };
const DASH = { speed: 640, durationMs: 160, cooldownMs: 1100, iframeMs: 280, damage: 26, radius: 28 };
const QUAKE = { rings: 3, staggerMs: 190, expandMs: 460, maxRadius: 170, damage: 60, cooldownMs: 7000 };
const METEOR = { radius: 160, damage: 220, expandMs: 320 };

const DINO_KINDS = {
  grunt: { size: 40, hp: 30, speed: 66, dps: 10, mass: 1, drop: 0.04, confetti: 4 },
  brute: { size: 66, hp: 110, speed: 46, dps: 20, mass: 2.2, drop: 0.3, confetti: 8 },
  king: { size: 124, hp: 600, speed: 34, dps: 35, mass: 8, drop: 1, confetti: 30 }
};
const MAX_DINOS = 140;
const KING_EVERY_MS = 60000;

const PICKUPS = {
  pint: { sprite: 1, label: "Fresh pint! +35 health" },
  rocks: { sprite: 0, label: "ICE AGE! The horde is frozen", duration: 4000 },
  shot: { sprite: 8, label: "METEOR SHOT!" },
  wine: { sprite: 6, label: "FRENZY! Faster, bigger swings", duration: 6000 }
};

// Kills less than this far apart keep a streak going.
const STREAK_WINDOW_MS = 1500;
const STREAK_TIERS = [
  { at: 2, text: "DOUBLE KILL", color: "#c9a22f", size: 20 },
  { at: 3, text: "TRIPLE KILL", color: "#c28a29", size: 22 },
  { at: 5, text: "DINO-MITE", color: "#ba6f25", size: 25 },
  { at: 8, text: "STAMPEDE", color: "#ad5422", size: 28 },
  { at: 12, text: "PREHISTORIC CARNAGE", color: "#9c3a20", size: 28 },
  { at: 18, text: "MASS EXTINCTION", color: "#8a2620", size: 30 },
  { at: 26, text: "METEOR STRIKE", color: "#741a20", size: 32 }
];

const BEST_KEY = "prehistoric-carnage-best";

let images = {};
let sprites = {};
let viewScale = 1;

let hero;
let dinos = [];
let pickups = [];
let rings = [];
let sparks = [];
let floorBits = [];
let popups = [];
let banner = null;

let state = "ready"; // ready | playing | paused | lost
let clock = 0; // game time; stops while paused
let kills = 0;
let streak = 0;
let bestStreak = 0;
let lastKillAt = -Infinity;
let spawnBudget = 0;
let nextKingAt = KING_EVERY_MS;
let frozenUntil = 0;
let frenzyUntil = 0;
let shakeUntil = 0;
let best = { time: 0, kills: 0 };
let newBest = false;

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

  touchMode = window.matchMedia("(pointer: coarse)").matches;
  best = loadBest();
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

function newGame() {
  hero = {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    vx: 0,
    vy: 0,
    hp: HERO.maxHp,
    aim: -Math.PI / 2,
    lastSwing: -Infinity,
    swingAt: -Infinity,
    swingAim: 0,
    swingSide: 1,
    dashAt: -Infinity,
    dashDirX: 0,
    dashDirY: 0,
    dashHits: new Set(),
    quakeAt: -Infinity,
    hurtAt: -Infinity,
    trail: []
  };
  dinos = [];
  pickups = [];
  rings = [];
  sparks = [];
  floorBits = [];
  popups = [];
  banner = null;
  clock = 0;
  kills = 0;
  streak = 0;
  bestStreak = 0;
  lastKillAt = -Infinity;
  spawnBudget = 0;
  nextKingAt = KING_EVERY_MS;
  frozenUntil = 0;
  frenzyUntil = 0;
  shakeUntil = 0;
  newBest = false;
  holding = false;
  state = "ready";
}

function startGame() {
  state = "playing";
  showBanner("Hold the dance floor!");
}

function endGame() {
  hero.hp = 0;
  state = "lost";
  holding = false;
  stick = null;
  newBest = clock > best.time;
  best = { time: Math.max(best.time, clock), kills: Math.max(best.kills, kills) };
  saveBest(best);
  burst(hero.x, hero.y, 40, [COLORS.danger, COLORS.gold, COLORS.forest]);
}

function draw() {
  const dt = Math.min(deltaTime, 50);
  if (state === "playing") update(dt);

  push();
  scale(viewScale);
  if (clock < shakeUntil) translate(random(-3, 3), random(-3, 3));
  drawFloor();
  drawPickups();
  drawRings();
  drawDinos();
  drawHero();
  drawSparks();
  drawPopups();
  pop();

  push();
  scale(viewScale);
  drawHud();
  if (touchMode && state === "playing") drawTouchControls();
  drawBanner();
  if (state === "ready") drawStartScreen();
  if (state === "paused") drawOverlay("Paused", ["Press Esc or tap to keep playing"]);
  if (state === "lost") drawGameOver();
  pop();
}

function update(dt) {
  clock += dt;
  const s = dt / 1000;

  updateHero(s);
  spawnHorde(s);
  updateDinos(s);
  updateRings();
  updatePickups(s);
  updateSparks(s);
  if (streak > 0 && clock - lastKillAt > STREAK_WINDOW_MS) streak = 0;
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
  return CLUB.reach * (frenzied() ? 1.35 : 1);
}

function updateHero(s) {
  const move = moveInput();
  const dashing = clock - hero.dashAt < DASH.durationMs;

  if (dashing) {
    hero.x += hero.dashDirX * DASH.speed * s;
    hero.y += hero.dashDirY * DASH.speed * s;
    hero.trail.push({ x: hero.x, y: hero.y, at: clock });
    // The dash carves through anything in its path.
    for (const d of dinos.slice()) {
      if (hero.dashHits.has(d)) continue;
      if (dist(hero.x, hero.y, d.x, d.y) < DASH.radius + d.r) {
        hero.dashHits.add(d);
        damageDino(d, DASH.damage, hero.dashDirX, hero.dashDirY, 14);
      }
    }
  } else {
    hero.vx = move.x * HERO.speed;
    hero.vy = move.y * HERO.speed;
    hero.x += hero.vx * s;
    hero.y += hero.vy * s;
  }
  hero.x = constrain(hero.x, HERO.radius, WORLD_W - HERO.radius);
  hero.y = constrain(hero.y, HERO.radius, WORLD_H - HERO.radius);
  hero.trail = hero.trail.filter((t) => clock - t.at < 160);

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
  const repeat = CLUB.holdRepeatMs * (frenzied() ? 0.5 : 1);
  if (clock - hero.lastSwing > repeat) {
    if (holding || (touchMode && nearestDino(clubReach()))) swing();
  }

  hero.hp = Math.min(HERO.maxHp, hero.hp + HERO.regen * s);
}

function swing() {
  if (state !== "playing") return;
  const frenzy = frenzied();
  const cooldown = CLUB.cooldownMs * (frenzy ? 0.5 : 1);
  if (clock - hero.lastSwing < cooldown) return;

  hero.lastSwing = clock;
  hero.swingAt = clock;
  hero.swingAim = hero.aim;
  hero.swingSide = -hero.swingSide;

  const reach = clubReach();
  for (const d of dinos.slice()) {
    const dx = d.x - hero.x;
    const dy = d.y - hero.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > reach + d.r) continue;
    // Dinos right up against David get hit even if they're just outside the arc.
    const offAngle = Math.abs(angleDiff(Math.atan2(dy, dx), hero.aim));
    if (offAngle > CLUB.arc / 2 && distance > HERO.radius + d.r) continue;
    damageDino(d, CLUB.damage * (frenzy ? 1.5 : 1), dx / distance, dy / distance, 10);
  }
}

function dash() {
  if (state !== "playing" || clock - hero.dashAt < DASH.cooldownMs) return;
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

function quake() {
  if (state !== "playing" || clock - hero.quakeAt < QUAKE.cooldownMs) return;
  hero.quakeAt = clock;
  for (let i = 0; i < QUAKE.rings; i++) {
    rings.push({
      x: hero.x,
      y: hero.y,
      start: clock + i * QUAKE.staggerMs,
      expandMs: QUAKE.expandMs,
      maxRadius: QUAKE.maxRadius * (1 + i * 0.25),
      damage: QUAKE.damage,
      radius: 0,
      hits: new Set()
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
    damage: METEOR.damage,
    radius: 0,
    hits: new Set(),
    meteor: true
  });
  burst(hero.x, hero.y, 40, ["#e0702a", COLORS.gold, COLORS.goldLight, COLORS.danger]);
  shakeUntil = clock + 450;
}

// ---- the horde ----

function spawnRate() {
  // Spawns per second double every 40 seconds: Carnage's doubling curve, but gentler.
  return Math.min(1.2 * Math.pow(2, clock / 40000), 10);
}

function spawnHorde(s) {
  spawnBudget += spawnRate() * s;
  while (spawnBudget >= 1) {
    spawnBudget -= 1;
    if (dinos.length >= MAX_DINOS) continue;
    const bruteChance = clock < 20000 ? 0 : Math.min(0.08 + (clock - 20000) / 400000, 0.3);
    spawnDino(random() < bruteChance ? "brute" : "grunt");
  }

  if (clock >= nextKingAt) {
    nextKingAt += KING_EVERY_MS;
    spawnDino("king");
    showBanner("The King of the Party has arrived!");
  }
}

function spawnDino(kind) {
  const info = DINO_KINDS[kind];
  // Enter from just off a random edge.
  const margin = info.size * 0.6;
  const side = Math.floor(random(4));
  let x;
  let y;
  if (side === 0) { x = random(WORLD_W); y = -margin; }
  else if (side === 1) { x = WORLD_W + margin; y = random(WORLD_H); }
  else if (side === 2) { x = random(WORLD_W); y = WORLD_H + margin; }
  else { x = -margin; y = random(WORLD_H); }

  // Small dinos always fall to one club hit; bigger ones toughen up over time.
  const hp = info.hp * (kind === "grunt" ? 1 : 1 + clock / 180000);
  dinos.push({
    kind,
    x,
    y,
    r: info.size * 0.32,
    size: info.size,
    hp,
    maxHp: hp,
    speed: info.speed * random(0.9, 1.15) * (1 + Math.min(clock / 240000, 0.5)),
    dps: info.dps,
    mass: info.mass,
    kx: 0,
    ky: 0,
    step: random(TWO_PI),
    facing: 0,
    hitAt: -Infinity,
    dead: false
  });
}

function updateDinos(s) {
  const frozen = clock < frozenUntil;
  const decay = Math.max(0, 1 - 8 * s);

  for (const d of dinos) {
    if (!frozen) {
      // Small dinos aim a little ahead of where David is heading.
      const lead = d.kind === "grunt" ? 0.3 : 0;
      const dx = hero.x + hero.vx * lead - d.x;
      const dy = hero.y + hero.vy * lead - d.y;
      const len = Math.hypot(dx, dy) || 1;
      d.x += (dx / len) * d.speed * s;
      d.y += (dy / len) * d.speed * s;
      d.facing = hero.x < d.x ? 1 : 0;
      d.step += d.speed * s * 0.12;
    }
    d.x += d.kx * s;
    d.y += d.ky * s;
    d.kx *= decay;
    d.ky *= decay;
  }

  separate();

  if (frozen || clock - hero.dashAt < DASH.iframeMs) return;
  let dps = 0;
  for (const d of dinos) {
    if (Math.hypot(hero.x - d.x, hero.y - d.y) < HERO.radius + d.r) dps += d.dps;
  }
  if (dps > 0) {
    hero.hp -= dps * s;
    hero.hurtAt = clock;
    if (hero.hp <= 0) endGame();
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
  d.hp -= amount;
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

  streak = clock - lastKillAt < STREAK_WINDOW_MS ? streak + 1 : 1;
  lastKillAt = clock;
  bestStreak = Math.max(bestStreak, streak);
  const tier = STREAK_TIERS.find((t) => t.at === streak);
  if (tier) {
    // Only the newest callout stays on screen.
    popups = [{ label: tier.text, color: tier.color, size: tier.size, born: clock }];
  }

  const info = DINO_KINDS[d.kind];
  burst(d.x, d.y, info.confetti * 3);
  scatterConfetti(d.x, d.y, info.confetti, d.r);

  const drops = d.kind === "king" ? 3 : random() < info.drop ? 1 : 0;
  for (let i = 0; i < drops; i++) {
    pickups.push({ type: pickDropType(), x: d.x + random(-20, 20), y: d.y + random(-20, 20), born: clock });
  }

  if (d.kind === "king") {
    showBanner("The King has fallen!");
    shakeUntil = clock + 500;
  }
}

function pickDropType() {
  const hurt = hero.hp < HERO.maxHp * 0.6;
  const r = random();
  if (r < (hurt ? 0.45 : 0.25)) return "pint";
  if (r < 0.6) return "wine";
  if (r < 0.8) return "rocks";
  return "shot";
}

function nearestDino(maxDist) {
  let found = null;
  let closest = maxDist;
  for (const d of dinos) {
    const gap = Math.hypot(d.x - hero.x, d.y - hero.y) - d.r;
    if (gap < closest) {
      closest = gap;
      found = d;
    }
  }
  return found;
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
    for (const d of dinos.slice()) {
      if (ring.hits.has(d)) continue;
      const gap = Math.hypot(d.x - ring.x, d.y - ring.y) || 1;
      if (gap < ring.radius + d.r) {
        ring.hits.add(d);
        damageDino(d, ring.damage, (d.x - ring.x) / gap, (d.y - ring.y) / gap, 16);
      }
    }
  }
}

function updatePickups(s) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    const dx = hero.x - p.x;
    const dy = hero.y - p.y;
    const gap = Math.hypot(dx, dy) || 1;
    // Drinks close by slide over to David.
    if (gap < 70) {
      const pull = Math.min(260 * s, gap);
      p.x += (dx / gap) * pull;
      p.y += (dy / gap) * pull;
    }
    if (gap < HERO.radius + 12) {
      collect(p);
      pickups.splice(i, 1);
    } else if (clock - p.born > 12000) {
      pickups.splice(i, 1);
    }
  }
}

function collect(p) {
  const info = PICKUPS[p.type];
  if (p.type === "pint") hero.hp = Math.min(HERO.maxHp, hero.hp + 35);
  if (p.type === "rocks") frozenUntil = clock + info.duration;
  if (p.type === "wine") frenzyUntil = clock + info.duration;
  if (p.type === "shot") meteor();
  showBanner(info.label);
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
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = b.color;
    ctx.fillRect(-b.size / 2, -b.size * 0.3, b.size, b.size * 0.6);
    ctx.restore();
  }

  if (clock < frozenUntil) {
    fill(140, 200, 222, 45);
    rect(0, 0, WORLD_W, WORLD_H);
  }
}

function drawDinos() {
  const frozen = clock < frozenUntil;
  // Draw lower dinos last so they overlap the ones behind them.
  const sorted = dinos.slice().sort((a, b) => a.y - b.y);
  for (const d of sorted) {
    const set = frozen ? sprites.trexIce : clock - d.hitAt < 110 ? sprites.trexHit : sprites.trex;
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

    if (d.kind !== "grunt") {
      const barW = w * 0.55;
      // The king's bar sits above his crown.
      const y = d.y - h * (d.kind === "king" ? 0.72 : 0.5) - 10;
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

  // The bone club: a swipe across the arc while swinging, otherwise resting at his side.
  const reach = clubReach();
  const swingT = (clock - hero.swingAt) / CLUB.swingMs;
  let clubAngle = hero.aim + 0.9 * hero.swingSide;
  if (swingT >= 0 && swingT < 1) {
    const from = hero.swingAim - hero.swingSide * (CLUB.arc / 2);
    clubAngle = from + hero.swingSide * CLUB.arc * easeOut(swingT);
    noStroke();
    fill(212, 175, 55, 110 * (1 - swingT));
    arc(hero.x, hero.y, reach * 2, reach * 2, Math.min(from, clubAngle), Math.max(from, clubAngle), PIE);
  }
  drawClub(clubAngle, reach);

  const invulnerable = clock - hero.dashAt < DASH.iframeMs;
  if (invulnerable) ctx.globalAlpha = 0.65;
  image(sprites.face, hero.x, hero.y, size, size);
  ctx.globalAlpha = 1;
  imageMode(CORNER);

  if (clock - hero.hurtAt < 120 && frameCount % 6 < 3) {
    noStroke();
    fill(178, 58, 58, 110);
    circle(hero.x, hero.y, size);
  }
}

function drawClub(angle, reach) {
  push();
  translate(hero.x, hero.y);
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
    if (ring.meteor) {
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
    if (age > 9000 && Math.floor(age / 150) % 2 === 0) continue;
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
  push();
  // Health.
  const barW = Math.min(150, WORLD_W * 0.34);
  const hpFrac = Math.max(hero.hp, 0) / HERO.maxHp;
  noStroke();
  fill(15, 61, 46, 40);
  rect(16, 18, barW, 12, 6);
  fill(hpFrac < 0.3 ? COLORS.danger : COLORS.gold);
  rect(16, 18, barW * hpFrac, 12, 6);
  noFill();
  stroke(COLORS.forest);
  strokeWeight(1);
  rect(16, 18, barW, 12, 6);

  noStroke();
  fill(COLORS.forest);
  textStyle(BOLD);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(formatTime(clock), WORLD_W / 2, 24);
  textSize(13);
  textAlign(RIGHT, CENTER);
  text(`${kills} ${kills === 1 ? "DINO" : "DINOS"}`, WORLD_W - 16, 24);

  stroke(COLORS.gold);
  strokeWeight(1);
  line(16, 42, WORLD_W - 16, 42);

  // Timers for active drinks.
  const timers = [];
  if (clock < frozenUntil) timers.push({ left: frozenUntil - clock, total: PICKUPS.rocks.duration, color: COLORS.ice });
  if (frenzied()) timers.push({ left: frenzyUntil - clock, total: PICKUPS.wine.duration, color: COLORS.wine });
  timers.forEach((t, i) => {
    noStroke();
    fill(t.color);
    rect(16, 46 + i * 5, (WORLD_W - 32) * (t.left / t.total), 3, 2);
  });

  if (streak >= 2) {
    noStroke();
    fill(COLORS.forest);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(`STREAK ×${streak}`, 16, 60);
  }

  if (!touchMode && state === "playing") {
    drawCooldownPill(16, WORLD_H - 30, "SHIFT · DASH", (clock - hero.dashAt) / DASH.cooldownMs);
    drawCooldownPill(124, WORLD_H - 30, "R · QUAKE", (clock - hero.quakeAt) / QUAKE.cooldownMs);
  }
  pop();
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
  return {
    dash: { x: WORLD_W - 56, y: WORLD_H - 62, r: 30, label: "DASH", progress: (clock - hero.dashAt) / DASH.cooldownMs },
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
    translate(WORLD_W / 2, Math.max(WORLD_H * 0.3, 140) - age * 0.02);
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
  drawOverlay("Prehistoric Carnage", [
    "Tuxedo T-rexes are crashing David's party. Hold the dance floor as long as you can.",
    controls
  ], touchMode ? "Tap to start" : "Click to start");
}

function drawGameOver() {
  const lines = [
    `Lasted ${formatTime(clock)} · ${kills} dinos · best streak ×${bestStreak}`,
    newBest ? "New personal best!" : `Best: ${formatTime(best.time)} · ${best.kills} dinos`
  ];
  drawOverlay("Extinct!", lines, touchMode ? "Tap to play again" : "Click to play again");
}

function drawOverlay(title, lines, prompt) {
  push();
  noStroke();
  fill(246, 240, 228, 225);
  rect(0, 0, WORLD_W, WORLD_H);

  const cardW = 320;
  const cardH = 340;
  const cx = WORLD_W / 2;
  const top = WORLD_H / 2 - cardH / 2;
  stroke(COLORS.gold);
  strokeWeight(1.5);
  fill(COLORS.paper);
  rect(cx - cardW / 2, top, cardW, cardH, 16);

  const trex = sprites.trex[0];
  const trexH = 130;
  const trexW = trexH * (trex.width / trex.height);
  image(trex, cx - trexW / 2, top + 16, trexW, trexH);

  noStroke();
  fill(COLORS.forest);
  textAlign(CENTER, CENTER);
  textSize(title.length > 16 ? 26 : 30);
  text(title, cx, top + 168);

  fill(COLORS.muted);
  textStyle(ITALIC);
  textSize(13);
  textAlign(CENTER, TOP);
  let y = top + 192;
  for (const entry of lines) {
    text(entry, cx - cardW / 2 + 22, y, cardW - 44, 60);
    y += textWidth(entry) > cardW - 44 ? 38 : 22;
  }

  if (prompt) {
    fill(COLORS.gold);
    textStyle(BOLD);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(prompt.toUpperCase(), cx, top + cardH - 26);
  }
  pop();
}

function showBanner(message) {
  banner = { message, until: clock + 1800 };
}

function drawBanner() {
  if (!banner || clock > banner.until) return;
  const fade = constrain((banner.until - clock) / 400, 0, 1);
  push();
  textSize(14);
  textStyle(BOLD);
  const w = Math.min(textWidth(banner.message) + 36, WORLD_W - 24);
  const y = 82;
  noStroke();
  fill(15, 61, 46, 230 * fade);
  rect(WORLD_W / 2 - w / 2, y - 18, w, 36, 18);
  fill(255, 253, 247, 255 * fade);
  textAlign(CENTER, CENTER);
  text(banner.message, WORLD_W / 2, y);
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
    ctx.save();
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.restore();
  }
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

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function loadBest() {
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY));
    if (saved && typeof saved.time === "number") return { time: saved.time, kills: saved.kills || 0 };
  } catch (e) {
    // Storage can be blocked; play on without a saved best.
  }
  return { time: 0, kills: 0 };
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(value));
  } catch (e) {
    // Storage can be blocked; the best just won't persist.
  }
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

// Pre-tinted copies, so frozen and just-hit dinos don't need tint() every frame.
function tintedCopy(img, rgb) {
  const g = createGraphics(img.width, img.height);
  g.pixelDensity(1);
  g.tint(rgb[0], rgb[1], rgb[2]);
  g.image(img, 0, 0);
  const tinted = g.get();
  g.remove();
  return tinted;
}

// ---- input ----

function isCanvasEvent(event) {
  return !event || !event.target || event.target.tagName === "CANVAS";
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
  // Only presses on the game itself, so the back link still works.
  if (!isCanvasEvent(event)) return;
  touchMode = false;
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
  if (!isCanvasEvent(event)) return;
  touchMode = true;
  if (state !== "playing") {
    handleTap();
    for (const t of touches) seenTouches.add(t.id);
    return false;
  }

  const buttons = touchButtons();
  for (const t of touches) {
    if (seenTouches.has(t.id)) continue;
    seenTouches.add(t.id);
    const wx = t.x / viewScale;
    const wy = t.y / viewScale;
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

// Pause automatically when the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") {
    state = "paused";
    holding = false;
    stick = null;
  }
});
