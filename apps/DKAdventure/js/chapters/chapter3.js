import { vibrate } from '../utils.js';

export class Chapter3 {
  constructor({ game, content }) {
    this.game = game;
    this.content = content;
    this.p = game.p;
    this.introTimeoutId = null;
    this.reset();
  }

  dispose() {
    window.clearTimeout(this.introTimeoutId);
  }

  reset() {
    const introDelay = this.content.timing?.introDurationMs ?? 1200;

    window.clearTimeout(this.introTimeoutId);

    this.t = 0;
    this.state = 'intro';
    this.lx = -200;
    this.rx = this.p.width + 200;
    this.targetX = this.p.width / 2;
    this.handOverlap = false;
    this.hitWindow = 0;
    this.success = false;
    this.introTimeoutId = window.setTimeout(() => {
      this.state = 'approach';
    }, introDelay);
  }

  tap() {
    const hitDistance = this.content.timing?.hitDistance ?? 80;

    if (this.state !== 'approach') {
      return;
    }

    if (Math.abs(this.lx - this.rx) < hitDistance) {
      this.success = true;
      this.state = 'result';
      this.hitWindow = 1;
      vibrate([10, 20, 10]);
      return;
    }

    this.hitWindow = -1;
    vibrate(30);
  }

  draw(p) {
    const overlapDistance = this.content.timing?.overlapDistance ?? 40;

    p.background(8, 10, 18);
    if (this.state === 'intro') {
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(220);
      p.textSize(20);
      p.textWrap(p.WORD);
      p.text(this.content.message, p.width * 0.1, p.height * 0.25, p.width * 0.8);
      p.textSize(14);
      p.fill(150);
      p.text(this.content.subtitle, p.width / 2, p.height * 0.5);
      return;
    }

    if (this.state === 'approach') {
      this.lx = p.lerp(this.lx, this.targetX - 40, 0.02);
      this.rx = p.lerp(this.rx, this.targetX + 40, 0.02);
    }

    p.noStroke();
    p.fill(20, 24, 38);
    p.rect(0, p.height * 0.7, p.width, p.height * 0.3);

    const drawCharacter = (x, flip = false) => {
      p.push();
      p.translate(x, p.height * 0.7);
      p.scale(flip ? -1 : 1, 1);
      p.noStroke();
      p.fill(90, 110, 200);
      p.rect(-20, -80, 40, 80, 12);
      p.fill(240, 210, 180);
      p.ellipse(0, -98, 36, 36);
      p.fill(30);
      p.arc(0, -110, 38, 24, Math.PI, 0);
      p.stroke(240, 210, 180);
      p.strokeWeight(10);
      p.line(20, -60, 60, -40);
      p.noStroke();
      p.fill(240, 210, 180);
      p.ellipse(60, -40, 18, 18);
      p.pop();
    };

    drawCharacter(this.lx, false);
    drawCharacter(this.rx, true);

    const handDistance = Math.abs(this.lx + 60 - (this.rx - 60));
    this.handOverlap = handDistance < overlapDistance;

    if (this.state === 'approach') {
      p.noStroke();
      p.fill(this.handOverlap ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.15)');
      p.ellipse(this.targetX, p.height * 0.7 - 40, 100, 100);
      p.textAlign(p.CENTER);
      p.fill(255);
      p.textSize(16);
      p.text(this.handOverlap ? this.content.tapNow : this.content.waitText, this.targetX, p.height * 0.7 - 120);
    }

    if (this.state === 'result') {
      p.textAlign(p.CENTER, p.CENTER);
      p.fill(this.success ? '#10b981' : '#ef4444');
      p.textSize(32);
      p.text(this.success ? this.content.result.success : this.content.result.miss, p.width / 2, p.height * 0.3);
      p.fill(180);
      p.textSize(16);
      p.text(this.content.result.retry, p.width / 2, p.height * 0.3 + 40);
      if (p.frameCount % 60 < 30 && this.success) {
        for (let index = 0; index < 10; index += 1) {
          p.fill(255, 255, 255, 150);
          p.ellipse(this.targetX + p.random(-60, 60), p.height * 0.7 - 40 + p.random(-40, 40), 4, 4);
        }
      }
      if (p.mouseIsPressed) {
        this.reset();
      }
    }
  }
}