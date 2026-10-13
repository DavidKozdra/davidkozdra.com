// Dino Break-Out: knock down the drink menu with David's face.
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
  muted: "#527064"
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

const POWER_UPS = {
  party: { sprite: 8, label: "Party mode! Smash straight through", duration: 8000 },
  wide: { sprite: 1, label: "Big paddle!", duration: 10000 }
};

const BRICK_COLS = 6;
const BRICK_W = 56;
const BRICK_H = 44;
const BRICK_GAP = 6;
const BRICK_TOP = 70;
const PADDLE_W = 96;
const BALL_SIZE = 30;

let images = {};
let sprites = {};
let viewScale = 1;

let paddle;
let ball;
let blocks = [];
let powerUps = [];
let sparks = [];
let banner = null;

let lives = 3;
let score = 0;
let level = 1;
let state = "ready"; // ready | playing | paused | won | lost
let partyUntil = 0;
let wideUntil = 0;

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

  sprites.ball = makeBallSprite();
  sprites.trex = cutOutWhite(images.trex, 360);
  sprites.trexHead = cropImage(sprites.trex, 0.58, 0, 0.42, 0.4);

  paddle = { x: WORLD_W / 2 - PADDLE_W / 2, y: WORLD_H - 46, w: PADDLE_W, h: 14 };
  ball = { x: 0, y: 0, dirX: 0, dirY: 0, size: BALL_SIZE, speed: 0, spin: 0 };

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

  if (paddle) {
    paddle.y = WORLD_H - 46;
    if (state === "ready") parkBall();
  }
}

function newGame() {
  lives = 3;
  score = 0;
  level = 1;
  buildLevel();
}

function buildLevel() {
  blocks = [];
  powerUps = [];
  partyUntil = 0;
  wideUntil = 0;

  const rows = Math.min(2 + level, 7);
  const rowWidth = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP;
  const left = (WORLD_W - rowWidth) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      blocks.push({
        x: left + col * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        sprite: (row * 2 + col) % DRINK_SPRITES.length,
        // From level 3 on, the top row takes two hits.
        hits: level >= 3 && row === 0 ? 2 : 1
      });
    }
  }

  parkBall();
  state = "ready";
}

// Sit the ball on the paddle until the player launches it.
function parkBall() {
  ball.speed = 0;
  ball.dirX = 0;
  ball.dirY = 0;
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.size / 2;
}

function launchBall() {
  ball.speed = 4.2 + level * 0.5;
  const angle = random(-0.5, 0.5);
  ball.dirX = Math.sin(angle);
  ball.dirY = -Math.cos(angle);
  state = "playing";
}

function draw() {
  scale(viewScale);
  drawBackground();

  if (state === "playing") {
    update();
  } else if (state === "ready") {
    movePaddle();
    parkBall();
  }

  drawBlocks();
  drawPowerUps();
  drawSparks();
  drawPaddle();
  drawBall();
  drawHud();
  drawBanner();

  if (state === "ready") drawPrompt();
  if (state === "paused") drawOverlay("Paused", "Press Esc or tap to keep playing");
  if (state === "won") drawOverlay(`Level ${level} cleared!`, `Score ${score} · tap for the next round`);
  if (state === "lost") drawOverlay("Extinct!", `Final score ${score} · tap to play again`);
}

function update() {
  movePaddle();

  const now = millis();
  paddle.w = now < wideUntil ? PADDLE_W * 1.5 : PADDLE_W;

  // Move in small steps so a fast ball can't tunnel through a brick.
  const steps = Math.ceil(ball.speed / 3);
  for (let i = 0; i < steps && state === "playing"; i++) {
    ball.x += (ball.dirX * ball.speed) / steps;
    ball.y += (ball.dirY * ball.speed) / steps;
    collideWalls();
    collidePaddle();
    collideBlocks(now < partyUntil);
  }
  ball.spin += ball.dirX * 0.08;

  updatePowerUps();
  updateSparks();

  if (blocks.length === 0) {
    state = "won";
    score += lives * 100;
    burst(WORLD_W / 2, WORLD_H / 2, 70);
  }
}

function movePaddle() {
  const target = mouseX / viewScale - paddle.w / 2;
  if (keyIsDown(LEFT_ARROW)) paddle.x -= 7;
  else if (keyIsDown(RIGHT_ARROW)) paddle.x += 7;
  else if (mouseX !== 0 || mouseY !== 0) paddle.x = target;
  paddle.x = constrain(paddle.x, 0, WORLD_W - paddle.w);
}

function collideWalls() {
  const r = ball.size / 2;
  if (ball.x - r <= 0) {
    ball.x = r;
    ball.dirX = Math.abs(ball.dirX);
  }
  if (ball.x + r >= WORLD_W) {
    ball.x = WORLD_W - r;
    ball.dirX = -Math.abs(ball.dirX);
  }
  if (ball.y - r <= 0) {
    ball.y = r;
    ball.dirY = Math.abs(ball.dirY);
  }
  if (ball.y - r > WORLD_H) {
    loseLife();
  }
}

function collidePaddle() {
  if (ball.dirY < 0 || !circleRectCollision(ball, paddle)) return;

  // Where the ball lands on the paddle sets its new angle:
  // the middle sends it straight up, the edges send it off sideways.
  const hit = constrain((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
  const angle = hit * 1.05;
  ball.dirX = Math.sin(angle);
  ball.dirY = -Math.cos(angle);
  ball.y = paddle.y - ball.size / 2;
  ball.speed = Math.min(ball.speed + 0.05, 9);
}

function collideBlocks(smashThrough) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (!circleRectCollision(ball, b)) continue;

    if (!smashThrough) {
      // Bounce off whichever side of the brick the ball went in deepest.
      const overlapX = Math.min(ball.x - b.x, b.x + b.w - ball.x);
      const overlapY = Math.min(ball.y - b.y, b.y + b.h - ball.y);
      if (overlapX < overlapY) ball.dirX = ball.x < b.x + b.w / 2 ? -Math.abs(ball.dirX) : Math.abs(ball.dirX);
      else ball.dirY = ball.y < b.y + b.h / 2 ? -Math.abs(ball.dirY) : Math.abs(ball.dirY);
    }

    b.hits -= 1;
    if (b.hits > 0) {
      score += 10;
      burst(b.x + b.w / 2, b.y + b.h / 2, 6);
    } else {
      score += 20;
      burst(b.x + b.w / 2, b.y + b.h / 2, 14);
      maybeDropPowerUp(b);
      blocks.splice(i, 1);
    }

    if (!smashThrough) return;
  }
}

function maybeDropPowerUp(b) {
  if (random() > 0.22) return;
  const type = random() < 0.5 ? "party" : "wide";
  powerUps.push({ type, x: b.x + b.w / 2 - 15, y: b.y, w: 30, h: 36, dy: 2.2 });
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.dy;

    if (rectRectCollision(p, paddle)) {
      const now = millis();
      const info = POWER_UPS[p.type];
      if (p.type === "party") partyUntil = now + info.duration;
      if (p.type === "wide") wideUntil = now + info.duration;
      score += 40;
      showBanner(info.label);
      burst(p.x + p.w / 2, paddle.y, 16);
      powerUps.splice(i, 1);
    } else if (p.y > WORLD_H) {
      powerUps.splice(i, 1);
    }
  }
}

function loseLife() {
  lives -= 1;
  powerUps = [];
  partyUntil = 0;
  wideUntil = 0;
  if (lives < 1) {
    state = "lost";
  } else {
    parkBall();
    state = "ready";
    showBanner(lives === 1 ? "Last life!" : `${lives} lives left`);
  }
}

// ---- drawing ----

function drawBackground() {
  background(COLORS.paper);
  noStroke();
  fill(212, 175, 55, 22);
  circle(60, 80, 320);
  fill(15, 61, 46, 14);
  circle(WORLD_W - 40, WORLD_H - 70, 360);

  if (sprites.trex) {
    push();
    tint(255, 16);
    const h = 300;
    const w = h * (sprites.trex.width / sprites.trex.height);
    image(sprites.trex, WORLD_W / 2 - w / 2, WORLD_H - h - 70, w, h);
    pop();
  }
}

function drawBlocks() {
  for (const b of blocks) {
    push();
    stroke(b.hits > 1 ? COLORS.forest : COLORS.gold);
    strokeWeight(b.hits > 1 ? 2 : 1.2);
    fill(b.hits > 1 ? "#efe3c2" : COLORS.paper);
    rect(b.x, b.y, b.w, b.h, 8);
    drawDrink(b.sprite, b.x + 3, b.y + 3, b.w - 6, b.h - 6);
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

function drawPowerUps() {
  for (const p of powerUps) {
    push();
    translate(p.x + p.w / 2, p.y + p.h / 2);
    rotate(sin(frameCount * 0.12) * 0.25);
    noStroke();
    fill(212, 175, 55, 70);
    circle(0, 0, p.w + 16);
    drawDrink(POWER_UPS[p.type].sprite, -p.w / 2, -p.h / 2, p.w, p.h);
    pop();
  }
}

function drawPaddle() {
  const now = millis();
  push();
  translate(paddle.x, paddle.y);
  noStroke();
  fill(15, 61, 46, 40);
  rect(2, 5, paddle.w, paddle.h, 7);
  stroke(now < partyUntil ? COLORS.goldLight : COLORS.gold);
  strokeWeight(2);
  fill(COLORS.forest);
  rect(0, 0, paddle.w, paddle.h, 7);

  // Tuxedo bow tie in the middle.
  noStroke();
  fill(COLORS.paper);
  const cx = paddle.w / 2;
  const cy = paddle.h / 2;
  triangle(cx - 13, cy - 5, cx - 13, cy + 5, cx, cy);
  triangle(cx + 13, cy - 5, cx + 13, cy + 5, cx, cy);
  fill(COLORS.gold);
  circle(cx, cy, 5);
  pop();
}

function drawBall() {
  const party = millis() < partyUntil;
  push();
  translate(ball.x, ball.y);
  if (party) {
    noStroke();
    fill(212, 175, 55, 90 + 60 * sin(frameCount * 0.3));
    circle(0, 0, ball.size + 14);
  }
  rotate(ball.spin);
  imageMode(CENTER);
  image(sprites.ball, 0, 0, ball.size + 4, ball.size + 4);
  pop();
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
  text(`LEVEL ${level}`, WORLD_W / 2, 26);

  // Lives as little tuxedo T-rex heads.
  for (let i = 0; i < lives; i++) {
    const size = 30;
    image(sprites.trexHead, WORLD_W - 16 - (i + 1) * (size + 2), 26 - size / 2, size, size);
  }

  stroke(COLORS.gold);
  strokeWeight(1);
  line(16, 48, WORLD_W - 16, 48);

  const now = millis();
  const timers = [];
  if (now < partyUntil) timers.push({ left: partyUntil - now, total: POWER_UPS.party.duration });
  if (now < wideUntil) timers.push({ left: wideUntil - now, total: POWER_UPS.wide.duration });
  timers.forEach((t, i) => {
    noStroke();
    fill(COLORS.goldLight);
    rect(16, 52 + i * 5, (WORLD_W - 32) * (t.left / t.total), 3, 2);
  });
  pop();
}

function drawPrompt() {
  push();
  noStroke();
  fill(COLORS.muted);
  textAlign(CENTER, CENTER);
  textStyle(ITALIC);
  textSize(15);
  text("Tap or click to launch", WORLD_W / 2, paddle.y - 60);
  pop();
}

function drawOverlay(title, subtitle) {
  push();
  noStroke();
  fill(246, 240, 228, 225);
  rect(0, 0, WORLD_W, WORLD_H);

  const cardW = 300;
  const cardH = 330;
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
  textSize(30);
  text(title, cx, top + 222);
  fill(COLORS.muted);
  textStyle(ITALIC);
  textSize(14);
  text(subtitle, cx - cardW / 2 + 20, top + 252, cardW - 40, 60);
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
  noStroke();
  fill(15, 61, 46, 230 * fade);
  rect(WORLD_W / 2 - w / 2, WORLD_H / 2 - 20, w, 40, 20);
  fill(255, 253, 247, 255 * fade);
  textAlign(CENTER, CENTER);
  text(banner.message, WORLD_W / 2, WORLD_H / 2);
  pop();
}

// ---- confetti sparks ----

function burst(x, y, count) {
  const palette = [COLORS.gold, COLORS.goldLight, COLORS.forest, COLORS.forestLight];
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
  if (state !== "playing") updateSparks();
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
function makeBallSprite() {
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

// Crop part of an image, given as fractions of its width and height.
function cropImage(img, fx, fy, fw, fh) {
  return img.get(
    Math.round(img.width * fx),
    Math.round(img.height * fy),
    Math.round(img.width * fw),
    Math.round(img.height * fh)
  );
}

// ---- collisions ----

function circleRectCollision(circle, rect) {
  const radius = circle.size / 2;
  const closestX = constrain(circle.x, rect.x, rect.x + rect.w);
  const closestY = constrain(circle.y, rect.y, rect.y + rect.h);
  return dist(circle.x, circle.y, closestX, closestY) <= radius;
}

function rectRectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  );
}

// ---- input ----

function handleTap() {
  if (state === "ready") launchBall();
  else if (state === "paused") state = "playing";
  else if (state === "won") {
    level += 1;
    buildLevel();
  } else if (state === "lost") newGame();
}

function mousePressed(event) {
  // Only taps on the game itself, so the back link still works.
  if (event && event.target && event.target.tagName !== "CANVAS") return;
  handleTap();
}

function touchMoved(event) {
  if (event && event.target && event.target.tagName === "CANVAS") return false;
}

function keyPressed() {
  if (keyCode === ESCAPE || key === "p" || key === "P") {
    if (state === "playing") state = "paused";
    else if (state === "paused") state = "playing";
  } else if (key === " ") {
    handleTap();
    return false;
  }
}

// Pause automatically when the tab is hidden.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") state = "paused";
});
