// Throw Rocks at Dinos: tuxedo T-rexes close in on David, who defends his drinks with rocks.
// Everything is laid out in a world 400 units wide and scaled to fit the screen.
// The world's height stretches between 560 and 760 to fill tall phone screens.

const WORLD_W = 400;
let WORLD_H = 600;

const COLORS = {
  forest: "#0f3d2e",
  forestLight: "#1f664d",
  gold: "#d4af37",
  goldLight: "#f1d98a",
  cream: "#f6f0e4",
  paper: "#fffdf7",
  muted: "#527064",
  rock: "#8a8273",
  rockDark: "#5f584c",
  rockLight: "#b8b0a0"
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

// Lives are drinks; these are the ones shown in the corner, in order.
const LIFE_SPRITES = [2, 6, 4, 3, 0];
const MAX_LIVES = 5;

const PICKUPS = {
  refill: { sprite: 1, label: "Fresh drink! +1 life" },
  triple: { sprite: 7, label: "Triple throw!", duration: 6000 }
};

const PLAYER_SIZE = 58;
const ROCK_SPEED = 8;
const ROCK_SIZE = 12;
const THROW_COOLDOWN = 260;

let images = {};
let sprites = {};
let viewScale = 1;

let player;
let rocks = [];
let dinos = [];
let pickups = [];
let sparks = [];
let banner = null;

let lives = 3;
let score = 0;
let wave = 1;
let waveKills = 0;
let state = "ready"; // ready | playing | paused | lost
let lastThrow = 0;
let nextSpawn = 0;
let tripleUntil = 0;
let hurtUntil = 0;
let holding = false;

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
  sprites.trex = cutOutWhite(images.trex, 260);
  sprites.trexFlipped = flipImage(sprites.trex);

  player = { x: WORLD_W / 2, y: WORLD_H / 2, aim: -HALF_PI };
  fitToScreen();
  newGame();
}

function windowResized() {
  fitToScreen();
}

// Scale the world to the largest size that fits the game area, keeping its shape.
function fitToScreen() {
  const area = document.getElementById("game");
  const availW = area.clientWidth;
  const availH = Math.max(area.clientHeight, 320);
  WORLD_H = constrain(Math.round((availH / availW) * WORLD_W), 560, 760);
  viewScale = Math.min(availW / WORLD_W, availH / WORLD_H);
  resizeCanvas(Math.floor(WORLD_W * viewScale), Math.floor(WORLD_H * viewScale));

  if (player) {
    player.x = WORLD_W / 2;
    player.y = WORLD_H / 2 + 20;
  }
}

function newGame() {
  lives = 3;
  score = 0;
  wave = 1;
  waveKills = 0;
  rocks = [];
  dinos = [];
  pickups = [];
  tripleUntil = 0;
  hurtUntil = 0;
  state = "ready";
}

function startGame() {
  state = "playing";
  nextSpawn = millis() + 600;
  showBanner("Wave 1");
}

function draw() {
  scale(viewScale);
  drawBackground();

  if (state === "playing") update();
  else updateSparks();

  drawPickups();
  drawDinos();
  drawRocks();
  drawSparks();
  drawPlayer();
  drawHud();
  drawBanner();

  if (state === "ready") drawOverlay("Throw Rocks at Dinos", "Dinos in tuxedos are after David's drinks. Tap to start!");
  if (state === "paused") drawOverlay("Paused", "Press Esc or tap to keep playing");
  if (state === "lost") drawOverlay("Out of drinks!", `You made it to wave ${wave} with ${score} points · tap to play again`);
}

function update() {
  const now = millis();
  const pointer = worldPointer();
  player.aim = Math.atan2(pointer.y - player.y, pointer.x - player.x);

  if (holding && now - lastThrow > THROW_COOLDOWN) throwRock(now);

  if (now > nextSpawn) {
    spawnDino();
    // Dinos come faster each wave, down to one every 0.45 s.
    nextSpawn = now + Math.max(450, 1500 - wave * 120) * random(0.7, 1.3);
  }

  updateRocks();
  updateDinos(now);
  updatePickups();
  updateSparks();
}

function worldPointer() {
  return { x: mouseX / viewScale, y: mouseY / viewScale };
}

function throwRock(now) {
  lastThrow = now;
  const spread = now < tripleUntil ? [-0.22, 0, 0.22] : [0];
  for (const offset of spread) {
    const a = player.aim + offset;
    rocks.push({
      x: player.x + Math.cos(a) * PLAYER_SIZE * 0.5,
      y: player.y + Math.sin(a) * PLAYER_SIZE * 0.5,
      dx: Math.cos(a) * ROCK_SPEED,
      dy: Math.sin(a) * ROCK_SPEED,
      size: ROCK_SIZE,
      spin: random(TWO_PI),
      shape: [random(0.8, 1.1), random(0.8, 1.1), random(0.8, 1.1), random(0.8, 1.1), random(0.8, 1.1), random(0.8, 1.1)]
    });
  }
}

function spawnDino() {
  // Enter from a random point just off any edge.
  const side = Math.floor(random(4));
  const margin = 50;
  let x;
  let y;
  if (side === 0) { x = random(WORLD_W); y = -margin; }
  else if (side === 1) { x = WORLD_W + margin; y = random(WORLD_H); }
  else if (side === 2) { x = random(WORLD_W); y = WORLD_H + margin; }
  else { x = -margin; y = random(WORLD_H); }

  const big = wave >= 2 && random() < 0.2 + wave * 0.03;
  dinos.push({
    x, y,
    size: big ? 84 : 60,
    hp: big ? 3 : 1,
    maxHp: big ? 3 : 1,
    speed: (big ? 0.55 : 0.85) + wave * 0.08 + random(0.15),
    step: random(TWO_PI),
    knockX: 0,
    knockY: 0,
    flashUntil: 0
  });
}

function updateRocks() {
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];
    r.x += r.dx;
    r.y += r.dy;
    r.spin += 0.25;

    let hit = false;
    for (let j = dinos.length - 1; j >= 0; j--) {
      const d = dinos[j];
      if (dist(r.x, r.y, d.x, d.y) > d.size * 0.38 + r.size / 2) continue;
      hit = true;
      hitDino(d, j, r);
      break;
    }

    // Rocks can also knock a dropped drink toward David.
    for (const p of pickups) {
      if (!p.collecting && dist(r.x, r.y, p.x, p.y) < 22) {
        p.collecting = true;
        hit = true;
      }
    }

    const off = r.x < -20 || r.x > WORLD_W + 20 || r.y < -20 || r.y > WORLD_H + 20;
    if (hit || off) rocks.splice(i, 1);
  }
}

function hitDino(d, index, rock) {
  d.hp -= 1;
  d.flashUntil = millis() + 120;
  const len = Math.hypot(rock.dx, rock.dy) || 1;
  d.knockX += (rock.dx / len) * 9;
  d.knockY += (rock.dy / len) * 9;
  burst(rock.x, rock.y, 6, [COLORS.rock, COLORS.rockLight, COLORS.rockDark]);

  if (d.hp > 0) return;

  score += d.maxHp > 1 ? 50 : 20;
  burst(d.x, d.y, 18);
  if (random() < 0.14) {
    const type = lives < MAX_LIVES && random() < 0.5 ? "refill" : "triple";
    pickups.push({ type, x: d.x, y: d.y, born: millis(), collecting: false });
  }
  dinos.splice(index, 1);

  waveKills += 1;
  if (waveKills >= 8 + wave * 2) {
    wave += 1;
    waveKills = 0;
    score += 100;
    showBanner(`Wave ${wave}`);
  }
}

function updateDinos(now) {
  for (let i = dinos.length - 1; i >= 0; i--) {
    const d = dinos[i];
    const toX = player.x - d.x;
    const toY = player.y - d.y;
    const len = Math.hypot(toX, toY) || 1;
    d.x += (toX / len) * d.speed + d.knockX;
    d.y += (toY / len) * d.speed + d.knockY;
    d.knockX *= 0.8;
    d.knockY *= 0.8;
    d.step += d.speed * 0.18;
    d.facingLeft = toX < 0;

    if (len < PLAYER_SIZE * 0.45 + d.size * 0.3) {
      dinos.splice(i, 1);
      loseLife(now, d);
      if (state !== "playing") return;
    }
  }
}

function loseLife(now, d) {
  lives -= 1;
  hurtUntil = now + 500;
  burst(d.x, d.y, 20, ["#b23a3a", COLORS.gold, COLORS.forest]);
  if (lives < 1) {
    state = "lost";
    holding = false;
  } else {
    showBanner(lives === 1 ? "A dino stole a drink! Last one!" : "A dino stole a drink!");
  }
}

function updatePickups() {
  const now = millis();
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (p.collecting) {
      // Fly to David.
      p.x = lerp(p.x, player.x, 0.18);
      p.y = lerp(p.y, player.y, 0.18);
      if (dist(p.x, p.y, player.x, player.y) < 10) {
        collect(p);
        pickups.splice(i, 1);
      }
    } else if (now - p.born > 7000) {
      pickups.splice(i, 1);
    }
  }
}

function collect(p) {
  const info = PICKUPS[p.type];
  if (p.type === "refill") lives = Math.min(lives + 1, MAX_LIVES);
  if (p.type === "triple") tripleUntil = millis() + info.duration;
  score += 30;
  showBanner(info.label);
  burst(player.x, player.y, 16);
}

// ---- drawing ----

function drawBackground() {
  background(COLORS.paper);
  noStroke();
  fill(212, 175, 55, 22);
  circle(60, 80, 320);
  fill(15, 61, 46, 14);
  circle(WORLD_W - 40, WORLD_H - 70, 360);

  // A gold ring marks David's spot.
  noFill();
  stroke(212, 175, 55, 90);
  strokeWeight(1);
  circle(player.x, player.y, PLAYER_SIZE + 46);
  stroke(212, 175, 55, 45);
  circle(player.x, player.y, PLAYER_SIZE + 110);
}

function drawPlayer() {
  const now = millis();
  push();
  translate(player.x, player.y);

  // Aim guide.
  if (state === "playing") {
    stroke(212, 175, 55, 140);
    strokeWeight(2);
    drawingContext.setLineDash([4, 6]);
    const a = player.aim;
    line(Math.cos(a) * (PLAYER_SIZE / 2 + 6), Math.sin(a) * (PLAYER_SIZE / 2 + 6), Math.cos(a) * 70, Math.sin(a) * 70);
    drawingContext.setLineDash([]);
  }

  if (now < tripleUntil) {
    noStroke();
    fill(212, 175, 55, 70 + 50 * sin(frameCount * 0.25));
    circle(0, 0, PLAYER_SIZE + 16);
  }

  // Shake when a dino gets through.
  if (now < hurtUntil) translate(random(-3, 3), random(-3, 3));
  imageMode(CENTER);
  image(sprites.face, 0, 0, PLAYER_SIZE, PLAYER_SIZE);
  if (now < hurtUntil) {
    noStroke();
    fill(178, 58, 58, 90);
    circle(0, 0, PLAYER_SIZE);
  }
  pop();
}

function drawDinos() {
  const now = millis();
  // Draw lower dinos last so they overlap the ones behind them.
  const sorted = [...dinos].sort((a, b) => a.y - b.y);
  for (const d of sorted) {
    const img = d.facingLeft ? sprites.trexFlipped : sprites.trex;
    const h = d.size;
    const w = h * (img.width / img.height);
    push();
    translate(d.x, d.y);

    noStroke();
    fill(15, 61, 46, 30);
    ellipse(0, h * 0.42, w * 0.7, h * 0.14);

    // Waddle.
    rotate(Math.sin(d.step) * 0.09);
    translate(0, -Math.abs(Math.sin(d.step)) * 3);
    imageMode(CENTER);
    if (now < d.flashUntil) tint(255, 180, 180);
    image(img, 0, 0, w, h);
    noTint();

    if (d.maxHp > 1) {
      const barW = w * 0.6;
      noStroke();
      fill(15, 61, 46, 60);
      rect(-barW / 2, -h / 2 - 8, barW, 4, 2);
      fill(COLORS.gold);
      rect(-barW / 2, -h / 2 - 8, barW * (d.hp / d.maxHp), 4, 2);
    }
    pop();
  }
}

function drawRocks() {
  push();
  for (const r of rocks) {
    push();
    translate(r.x, r.y);
    rotate(r.spin);
    stroke(COLORS.rockDark);
    strokeWeight(1.2);
    fill(COLORS.rock);
    beginShape();
    r.shape.forEach((k, i) => {
      const a = (i / r.shape.length) * TWO_PI;
      vertex(Math.cos(a) * (r.size / 2) * k, Math.sin(a) * (r.size / 2) * k);
    });
    endShape(CLOSE);
    noStroke();
    fill(COLORS.rockLight);
    circle(-r.size * 0.15, -r.size * 0.15, r.size * 0.3);
    pop();
  }
  pop();
}

function drawPickups() {
  const now = millis();
  for (const p of pickups) {
    const age = now - p.born;
    // Blink during the last two seconds before it disappears.
    if (!p.collecting && age > 5000 && Math.floor(age / 150) % 2 === 0) continue;
    push();
    translate(p.x, p.y + Math.sin(age * 0.005) * 3);
    noStroke();
    fill(212, 175, 55, 70);
    circle(0, 0, 44);
    drawDrink(PICKUPS[p.type].sprite, -16, -19, 32, 38);
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
  noStroke();
  fill(COLORS.forest);
  textAlign(LEFT, CENTER);
  textSize(13);
  textStyle(BOLD);
  text(`SCORE ${score}`, 16, 26);
  textAlign(CENTER, CENTER);
  text(`WAVE ${wave}`, WORLD_W / 2, 26);

  // Lives as the drinks David is protecting.
  for (let i = 0; i < lives; i++) {
    drawDrink(LIFE_SPRITES[i], WORLD_W - 16 - (i + 1) * 24, 12, 22, 28);
  }

  stroke(COLORS.gold);
  strokeWeight(1);
  line(16, 48, WORLD_W - 16, 48);

  const now = millis();
  if (now < tripleUntil) {
    noStroke();
    fill(COLORS.goldLight);
    rect(16, 52, (WORLD_W - 32) * ((tripleUntil - now) / PICKUPS.triple.duration), 3, 2);
  }
  pop();
}

function drawOverlay(title, subtitle) {
  push();
  noStroke();
  fill(246, 240, 228, 225);
  rect(0, 0, WORLD_W, WORLD_H);

  const cardW = 310;
  const cardH = 350;
  const cx = WORLD_W / 2;
  const top = WORLD_H / 2 - cardH / 2;
  stroke(COLORS.gold);
  strokeWeight(1.5);
  fill(COLORS.paper);
  rect(cx - cardW / 2, top, cardW, cardH, 16);

  const trexH = 170;
  const trexW = trexH * (sprites.trex.width / sprites.trex.height);
  image(sprites.trex, cx - trexW / 2, top + 22, trexW, trexH);

  noStroke();
  fill(COLORS.forest);
  textAlign(CENTER, CENTER);
  textSize(title.length > 16 ? 25 : 30);
  text(title, cx, top + 222);
  fill(COLORS.muted);
  textStyle(ITALIC);
  textSize(14);
  text(subtitle, cx - cardW / 2 + 20, top + 248, cardW - 40, 80);
  pop();
}

function showBanner(message) {
  banner = { message, until: millis() + 1800 };
}

function drawBanner() {
  if (!banner || millis() > banner.until) return;
  const fade = constrain((banner.until - millis()) / 400, 0, 1);
  push();
  textSize(15);
  textStyle(BOLD);
  const w = textWidth(banner.message) + 36;
  const y = 90;
  noStroke();
  fill(15, 61, 46, 230 * fade);
  rect(WORLD_W / 2 - w / 2, y - 20, w, 40, 20);
  fill(255, 253, 247, 255 * fade);
  textAlign(CENTER, CENTER);
  text(banner.message, WORLD_W / 2, y);
  pop();
}

// ---- confetti sparks ----

function burst(x, y, count, palette = [COLORS.gold, COLORS.goldLight, COLORS.forest, COLORS.forestLight]) {
  for (let i = 0; i < count; i++) {
    const a = random(TWO_PI);
    const v = random(1, 4.5);
    sparks.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 1.5,
      life: 1,
      size: random(3, 6),
      color: random(palette),
      spin: random(TWO_PI)
    });
  }
}

function updateSparks() {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.12;
    s.spin += 0.2;
    s.life -= 0.02;
    if (s.life <= 0) sparks.splice(i, 1);
  }
}

function drawSparks() {
  push();
  noStroke();
  rectMode(CENTER);
  for (const s of sparks) {
    const c = color(s.color);
    c.setAlpha(255 * s.life);
    fill(c);
    push();
    translate(s.x, s.y);
    rotate(s.spin);
    rect(0, 0, s.size, s.size * 0.6);
    pop();
  }
  pop();
}

// ---- image helpers ----

// Circular crop of David's face from the photo, with a gold rim.
function makeFaceSprite() {
  const size = 160;
  const g = createGraphics(size, size);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.clip();
  // The face sits at about (960, 390) in the 2100 x 1500 photo.
  const photo = images.photo;
  const crop = photo.width * 0.23;
  g.image(photo, 0, 0, size, size, photo.width * 0.457 - crop / 2, photo.height * 0.26 - crop / 2, crop, crop);
  ctx.restore();
  g.noFill();
  g.stroke(COLORS.gold);
  g.strokeWeight(7);
  g.circle(size / 2, size / 2, size - 7);
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

// ---- input ----

function handleTap() {
  if (state === "ready") startGame();
  else if (state === "paused") state = "playing";
  else if (state === "lost") newGame();
}

function mousePressed(event) {
  // Only presses on the game itself, so the back link still works.
  if (event && event.target && event.target.tagName !== "CANVAS") return;
  if (state === "playing") {
    holding = true;
    throwRock(millis());
  } else {
    handleTap();
  }
}

function mouseReleased() {
  holding = false;
}

function touchMoved(event) {
  if (event && event.target && event.target.tagName === "CANVAS") return false;
}

function keyPressed() {
  if (keyCode === ESCAPE || key === "p" || key === "P") {
    if (state === "playing") {
      state = "paused";
      holding = false;
    } else if (state === "paused") {
      state = "playing";
    }
  } else if (key === " ") {
    if (state === "playing") throwRock(millis());
    else handleTap();
    return false;
  }
}

// Pause automatically when the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") {
    state = "paused";
    holding = false;
  }
});
