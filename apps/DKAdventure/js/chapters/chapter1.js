import { STATE } from '../constants.js';
import { vibrate } from '../utils.js';

export class Chapter1 {
  constructor({ game, ui, saveStore, content, assets }) {
    this.game = game;
    this.ui = ui;
    this.saveStore = saveStore;
    this.content = content;
    this.assets = assets;
    this.p = game.p;
    this.taps = 0;
    this.crack = 0;
    this.crackNeeded = content.crackNeeded ?? 80;
    this.heartPhase = 0;
    this.maskWobble = 0;
    this.cracked = false;
    this.enterRoomTimeoutId = null;
    this.player = { x: 0, y: 0, tx: 0, ty: 0, r: 22 };
    this.roomCenter = null;
    this.maskAtlas = assets.atlases?.atlases?.chapter1Mask ?? null;
    this.items = content.room.items.map((item) => ({
      ...item,
      collected: Boolean(saveStore.data.inventory[item.id]),
    }));
  }

  dispose() {
    window.clearTimeout(this.enterRoomTimeoutId);
  }

  tap() {
    if (this.cracked) {
      return;
    }

    this.taps += 1;
    this.crack = Math.min(1, this.taps / this.crackNeeded);
    this.maskWobble = 1;
    this.ui.updateProgress({
      countText: `${this.taps} taps`,
      percent: (this.crack * 100).toFixed(1),
    });
    vibrate(10);

    if (this.crack >= 1 && !this.cracked) {
      this.cracked = true;
      this.enterRoomTimeoutId = window.setTimeout(() => {
        this.enterRoom();
      }, 300);
    }
  }

  enterRoom() {
    this.player.x = 0;
    this.player.y = 0;
    this.player.tx = 0;
    this.player.ty = 0;
    this.syncRoomCenter();
    this.game.setState(STATE.CH1_ROOM);
  }

  syncRoomCenter() {
    this.roomCenter = {
      x: this.p.width / 2,
      y: this.p.height / 2,
    };
  }

  moveTo(mouseX, mouseY) {
    this.syncRoomCenter();
    this.player.tx = mouseX - this.roomCenter.x;
    this.player.ty = mouseY - this.roomCenter.y;
  }

  drawIntro(p) {
    this.drawHeartBg(p);
    this.drawMask(p, p.width / 2, p.height / 2 + 20);
    this.drawIntroText(p);
  }

  drawCrack(p) {
    this.drawHeartBg(p);
    this.drawMask(p, p.width / 2, p.height / 2 + 20, true);
  }

  drawHeartBg(p) {
    p.push();
    p.translate(p.width / 2, p.height / 2 - 40);
    this.heartPhase += 0.04;

    const beat = 1 + 0.08 * Math.sin(this.heartPhase * 2) + 0.04 * Math.sin(this.heartPhase * 6);
    const size = Math.min(p.width, p.height) * 0.22;
    const colorValue = p.map(Math.sin(this.heartPhase), -1, 1, 0, 255);

    p.scale(beat);
    p.noStroke();
    p.fill(colorValue);
    p.beginShape();
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const x = 16 * Math.pow(Math.sin(angle), 3);
      const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
      p.vertex(x * size * 0.05, -y * size * 0.05);
    }
    p.endShape(p.CLOSE);

    p.stroke(255, 30);
    for (let y = -size; y < size; y += 6) {
      p.line(-size, y, size, y);
    }
    p.pop();
  }

  drawMask(p, centerX, centerY, cracked = false) {
    p.push();
    p.translate(centerX, centerY);
    this.maskWobble *= 0.85;
    p.rotate(Math.sin(p.frameCount * 0.2) * 0.02 * this.maskWobble);

    const width = 180;
    const height = 220;
    const flicker = p.frameCount % 8 < 4 ? 240 : 220;

    p.noStroke();
    p.fill(flicker);
    p.rect(-width / 2, -height / 2, width, height, 40);
    p.fill(20);
    p.ellipse(-40, -30, 38, 28);
    p.ellipse(40, -30, 38, 28);
    p.fill(255);
    p.ellipse(-40, -30, 12, 12);
    p.ellipse(40, -30, 12, 12);
    p.fill(20);
    p.rect(-50, 40, 100, 14, 7);

    if (this.crack > 0) {
      p.stroke(20, 200);
      p.strokeWeight(3);
      const crackLines = Math.floor(this.crack * 12);
      for (let index = 0; index < crackLines; index += 1) {
        const angle = p.random(Math.PI);
        const length = p.random(20, 80);
        p.line(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
      }
    }

    if (cracked && this.cracked) {
      p.fill(30, 30, 40);
      p.ellipse(0, -180, 80, 80);
      p.fill(20);
      p.rect(-6, -215, 12, 20);
      p.fill(60);
      p.rect(-30, -140, 60, 80, 12);
    }

    p.pop();
  }

  drawIntroText(p) {
    p.push();
    p.textAlign(p.CENTER, p.TOP);
    p.textSize(Math.min(18, p.width * 0.045));
    p.fill(220);
    p.textWrap(p.WORD);
    p.text(this.content.introText, p.width * 0.1, 80, p.width * 0.8);
    p.pop();
  }

  drawRoom(p) {
    this.syncRoomCenter();
    const roomCenter = this.roomCenter;

    p.push();
    p.translate(roomCenter.x, roomCenter.y);
    p.noStroke();
    p.fill(18, 22, 35);
    p.rect(-200, -160, 400, 320, 24);
    p.stroke(40);
    for (let x = -200; x <= 200; x += 40) {
      p.line(x, -160, x, 160);
    }
    for (let y = -160; y <= 160; y += 40) {
      p.line(-200, y, 200, y);
    }

    this.items.forEach((item) => {
      if (item.collected) {
        return;
      }

      p.push();
      p.translate(item.x, item.y);
      p.noStroke();
      p.fill(25, 30, 50);
      p.ellipse(0, 12, 50, 18);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(36);
      p.text(item.emoji, 0, 0);
      p.pop();
    });

    this.player.x = p.lerp(this.player.x, this.player.tx, 0.12);
    this.player.y = p.lerp(this.player.y, this.player.ty, 0.12);

    p.push();
    p.translate(this.player.x, this.player.y);
    p.noStroke();
    p.fill(40, 45, 70);
    p.ellipse(0, 18, 44, 22);
    p.fill(90, 110, 180);
    p.rect(-18, -20, 36, 40, 10);
    p.fill(240, 210, 180);
    p.ellipse(0, -38, 36, 36);
    p.fill(30);
    p.arc(0, -48, 38, 28, Math.PI, 0);
    p.pop();
    p.pop();

    this.items.forEach((item) => {
      if (item.collected) {
        return;
      }

      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      if (Math.hypot(dx, dy) < 40) {
        item.collected = true;
        this.saveStore.data.inventory[item.id] = true;
        this.saveStore.persist();
        this.ui.updateInventoryUI(this.saveStore.data.inventory);
        vibrate([20, 30, 20]);
      }
    });
  }
}