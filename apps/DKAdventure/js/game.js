import p5 from 'p5';
import { STATE } from './constants.js';
import { Chapter1 } from './chapters/chapter1.js';
import { Chapter2 } from './chapters/chapter2.js';
import { Chapter3 } from './chapters/chapter3.js';

export class Game {
  constructor({ ui, saveStore, content, assets }) {
    this.ui = ui;
    this.saveStore = saveStore;
    this.content = content;
    this.assets = assets;
    this.p = null;
    this.state = STATE.MENU;
    this.chapter = 0;
    this.touchStart = null;
    this.ch1 = null;
    this.ch2 = null;
    this.ch3 = null;
    this.initP5();
  }

  initP5() {
    const sketch = (p) => {
      this.p = p;
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('canvas-container');
        p.frameRate(60);
        p.textFont('system-ui');
      };
      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
      p.draw = () => this.draw();
      p.touchStarted = () => this.onTouchStart();
      p.touchEnded = () => this.onTouchEnd();
      p.mousePressed = () => this.onTouchStart();
      p.mouseReleased = () => this.onTouchEnd();
    };

    new p5(sketch);
  }

  disposeChapters() {
    this.ch1?.dispose?.();
    this.ch2?.dispose?.();
    this.ch3?.dispose?.();
    this.ch1 = null;
    this.ch2 = null;
    this.ch3 = null;
  }

  startChapter(id) {
    this.chapter = id;
    this.ui.setChapterLabel(`Chapter ${id}`);
    this.ui.hideAllUI();
    this.ui.hideInfo();
    this.ui.hideTos();
    this.disposeChapters();

    if (id === 1) {
      this.ch1 = new Chapter1({
        game: this,
        ui: this.ui,
        saveStore: this.saveStore,
        content: this.content.chapter1,
        assets: this.assets,
      });
      this.ui.updateProgress({
        label: this.content.chapter1.progressLabel,
        countText: '0 taps',
        percent: 0,
      });
      if (!this.saveStore.data.tosAccepted) {
        this.ui.showTos();
      }
      this.setState(STATE.CH1_INTRO);
      return;
    }

    if (id === 2) {
      this.ch2 = new Chapter2({
        game: this,
        content: this.content.chapter2,
      });
      this.setState(STATE.CH2_RUN);
      return;
    }

    if (id === 3) {
      this.ch3 = new Chapter3({
        game: this,
        content: this.content.chapter3,
      });
      this.setState(STATE.CH3_HIGHFIVE);
      return;
    }

    this.ui.showInfo('Coming Soon', 'This chapter is not yet implemented in the starter.');
    this.ui.showScreen('menu');
  }

  setState(state) {
    this.state = state;
    this.ui.hideAllUI();

    if (state === STATE.CH1_INTRO || state === STATE.CH1_CRACK) {
      this.ui.showProgress();
      this.ui.showTapHint(this.content.chapter1.tapHint);
      this.ui.showLegend(this.content.chapter1.legend.crack);
      return;
    }

    if (state === STATE.CH1_ROOM) {
      this.ui.showInventory();
      this.ui.showLegend(this.content.chapter1.legend.room);
      this.ui.updateInventoryUI(this.saveStore.data.inventory);
      return;
    }

    if (state === STATE.CH2_RUN) {
      this.ui.showDebugChip('DEBUG');
      this.ui.showLegend(this.content.chapter2.legend);
      return;
    }

    if (state === STATE.CH3_HIGHFIVE) {
      this.ui.showLegend(this.content.chapter3.legend);
    }
  }

  stop() {
    this.state = STATE.MENU;
    this.disposeChapters();
  }

  draw() {
    if (!this.p) {
      return;
    }

    const p = this.p;
    p.clear();
    p.background(5, 5, 8);
    p.noStroke();
    for (let index = 0; index < 80; index += 1) {
      p.fill(5, 5, 8, 2);
      p.ellipse(p.width / 2, p.height / 2, p.width * 1.5 - index * 12, p.height * 1.5 - index * 12);
    }

    switch (this.state) {
      case STATE.CH1_INTRO:
        this.ch1?.drawIntro(p);
        break;
      case STATE.CH1_CRACK:
        this.ch1?.drawCrack(p);
        break;
      case STATE.CH1_ROOM:
        this.ch1?.drawRoom(p);
        break;
      case STATE.CH2_RUN:
        this.ch2?.draw(p);
        break;
      case STATE.CH3_HIGHFIVE:
        this.ch3?.draw(p);
        break;
      default:
        break;
    }
  }

  onTouchStart() {
    if (!this.p) {
      return false;
    }

    const p = this.p;
    this.touchStart = { x: p.mouseX, y: p.mouseY, t: p.millis() };

    switch (this.state) {
      case STATE.CH1_INTRO:
        this.ch1?.tap();
        this.setState(STATE.CH1_CRACK);
        break;
      case STATE.CH1_CRACK:
        this.ch1?.tap();
        break;
      case STATE.CH1_ROOM:
        this.ch1?.moveTo(p.mouseX, p.mouseY);
        break;
      case STATE.CH2_RUN:
        this.ch2?.touchStart();
        break;
      case STATE.CH3_HIGHFIVE:
        this.ch3?.tap();
        break;
      default:
        break;
    }

    return false;
  }

  onTouchEnd() {
    if (!this.p || !this.touchStart) {
      return;
    }

    const p = this.p;
    const dx = p.mouseX - this.touchStart.x;
    const dy = p.mouseY - this.touchStart.y;
    this.touchStart = null;

    if (this.state === STATE.CH2_RUN) {
      this.ch2?.swipe(dx, dy);
    }
  }
}