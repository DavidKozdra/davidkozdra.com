import { vibrate } from '../utils.js';

export class Chapter2 {
  constructor({ game, content }) {
    this.game = game;
    this.content = content;
    this.p = game.p;
    this.introTimeoutId = null;
    this.slideTimeoutId = null;
    this.reset();
  }

  dispose() {
    window.clearTimeout(this.introTimeoutId);
    window.clearTimeout(this.slideTimeoutId);
  }

  reset() {
    const physics = this.content.physics ?? {};

    window.clearTimeout(this.introTimeoutId);
    window.clearTimeout(this.slideTimeoutId);

    this.t = 0;
    this.score = 0;
    this.speed = physics.speed ?? 6;
    this.groundY = 0;
    this.player = { x: 0, y: 0, vy: 0, w: 44, h: 64, state: 'run' };
    this.obstacles = [];
    this.pool = [];
    this.spawnTimer = 0;
    this.gameOver = false;
    this.showIntro = true;
    this.introTimeoutId = window.setTimeout(() => {
      this.showIntro = false;
    }, this.content.introDurationMs ?? 1800);
  }

  touchStart() {}

  swipe(dx, dy) {
    if (this.gameOver) {
      this.reset();
      return;
    }

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
      if (dy < -30) {
        this.jump();
      } else if (dy > 30) {
        this.slide();
      }
    }
  }

  jump() {
    if (this.player.state !== 'jump' && this.player.y === 0) {
      this.player.vy = this.content.physics?.jumpVelocity ?? -18;
      this.player.state = 'jump';
      vibrate(15);
    }
  }

  slide() {
    if (this.player.state === 'slide') {
      return;
    }

    this.player.state = 'slide';
    window.clearTimeout(this.slideTimeoutId);
    this.slideTimeoutId = window.setTimeout(() => {
      if (this.player.state === 'slide') {
        this.player.state = 'run';
      }
    }, this.content.physics?.slideDurationMs ?? 600);
  }

  spawnObstacle() {
    const obstacle = this.pool.pop() || { x: 0, y: 0, w: 50, h: 80, type: 0 };

    obstacle.x = this.p.width + 100;
    obstacle.y = 0;
    obstacle.w = 44 + Math.random() * 20;
    obstacle.h = 60 + Math.random() * 20;
    obstacle.type = Math.floor(Math.random() * 3);
    this.obstacles.push(obstacle);
  }

  draw(p) {
    const physics = this.content.physics ?? {};
    const spawns = this.content.spawns ?? {};

    this.groundY = p.height * 0.72;
    p.noStroke();
    for (let y = 0; y < p.height; y += 1) {
      const blend = y / p.height;
      p.stroke(p.lerpColor(p.color(10, 12, 25), p.color(5, 5, 8), blend));
      p.line(0, y, p.width, y);
    }

    if (this.showIntro) {
      p.push();
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(255);
      p.textSize(26);
      p.text(this.content.introText, p.width / 2, p.height * 0.3);
      p.noStroke();
      p.fill(139, 92, 246, 180);
      p.rect(0, p.height * 0.45, p.width / 2 - 20, p.height);
      p.rect(p.width / 2 + 20, p.height * 0.45, p.width / 2, p.height);
      p.pop();
      return;
    }

    this.t += 1;
    this.score += this.speed * 0.1;

    p.fill(20, 24, 38);
    p.rect(0, this.groundY, p.width, p.height - this.groundY);
    p.stroke(40);
    const offset = (this.t * this.speed) % 60;
    for (let x = -offset; x < p.width; x += 60) {
      p.line(x, this.groundY, x + 30, this.groundY);
    }

    this.spawnTimer -= 1;
    if (this.spawnTimer <= 0 && !this.gameOver) {
      this.spawnObstacle();
      this.spawnTimer = (spawns.baseDelay ?? 60) + Math.random() * (spawns.randomDelay ?? 40);
    }

    for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = this.obstacles[index];
      obstacle.x -= this.speed;
      if (obstacle.x + obstacle.w < -50) {
        this.obstacles.splice(index, 1);
        this.pool.push(obstacle);
      }
    }

    this.player.vy += physics.gravity ?? 0.95;
    this.player.y += this.player.vy;
    if (this.player.y > 0) {
      this.player.y = 0;
      this.player.vy = 0;
      if (this.player.state === 'jump') {
        this.player.state = 'run';
      }
    }

    const playerX = p.width * 0.25;
    const playerY = this.groundY + this.player.y;
    const bodyHeight = this.player.state === 'slide' ? 36 : 64;

    p.push();
    p.translate(playerX, playerY);
    p.noStroke();
    p.fill(0, 80);
    p.ellipse(0, 32, 60, 16);
    p.fill(100, 120, 220);
    p.rect(-22, -bodyHeight, 44, bodyHeight, 10);
    p.fill(240, 210, 180);
    p.ellipse(0, -bodyHeight - 18, 34, 34);
    p.fill(30);
    p.arc(0, -bodyHeight - 28, 36, 24, Math.PI, 0);
    p.pop();

    this.obstacles.forEach((obstacle) => {
      p.push();
      p.translate(obstacle.x, this.groundY);
      p.noStroke();
      p.fill(80, 60);
      p.rect(0, -obstacle.h, obstacle.w, obstacle.h, 8);
      p.fill(240, 210, 180);
      p.ellipse(obstacle.w / 2, -obstacle.h - 14, 28, 28);
      p.noFill();
      p.stroke(0, 255, 150);
      p.strokeWeight(1);
      p.rect(0, -obstacle.h, obstacle.w, obstacle.h);
      p.pop();

      if (!this.gameOver) {
        const ax1 = playerX - 22;
        const ay1 = playerY - bodyHeight;
        const ax2 = playerX + 22;
        const ay2 = playerY;
        const bx1 = obstacle.x;
        const by1 = this.groundY - obstacle.h;
        const bx2 = obstacle.x + obstacle.w;
        const by2 = this.groundY;

        if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
          this.gameOver = true;
          vibrate([30, 50, 30]);
        }
      }
    });

    p.fill(255);
    p.textSize(18);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`${this.content.distanceLabel}: ${Math.floor(this.score)}`, 16, 70);

    if (this.gameOver) {
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(28);
      p.fill(255);
      p.text(this.content.gameOverTitle, p.width / 2, p.height * 0.35);
      p.textSize(16);
      p.fill(180);
      p.text(this.content.gameOverPrompt, p.width / 2, p.height * 0.35 + 40);
    }
  }
}