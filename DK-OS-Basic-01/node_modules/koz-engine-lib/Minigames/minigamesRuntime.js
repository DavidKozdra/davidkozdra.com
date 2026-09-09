// Minigames.js — 7 standalone minigame engines
// Each minigame: start(), update(dt), render(ctx), handleInput(e), isComplete(), getResult()
let GenericMinigameManagerCtor = null;
if (typeof require === "function") {
  try {
    ({ MinigameManager: GenericMinigameManagerCtor } = require("./manager"));
  } catch (_err) {}
}

class MinigameManager {
  constructor(options = {}) {
    const opts = options || {};
    this.active = null;       // current MinigameBase instance
    this.onComplete = null;   // callback(result) when minigame finishes
    this._keyHandler = null;
    this._clickHandler = null;
    this._bindTimer = null;
    this._registeredWithLib = false;
    const GenericManager = opts.GenericMinigameManager || GenericMinigameManagerCtor;
    this._engine = (typeof GenericManager === "function")
      ? new GenericManager({ logger: console })
      : null;
  }

  _getBuiltins() {
    return {
      haggling: HagglingMinigame,
      lockpicking: LockPickingMinigame,
      dicePoker: DicePokerMinigame,
      memoryMatch: MemoryMatchMinigame,
      wheelOfFortune: WheelOfFortuneMinigame,
      bluffMeter: BluffMeterMinigame,
      navigationDodge: NavigationDodgeMinigame,
      shipRace: ShipRaceMinigame,
      fishing: FishingMinigame,
      mining: MiningMinigame,
      harvesting: HarvestMinigame,
      woodcutting: WoodcuttingMinigame,
      sandDig: SandDigMinigame,
    };
  }

  _registerWithLib(classes) {
    if (!this._engine || this._registeredWithLib) return;
    Object.keys(classes).forEach((id) => {
      const Cls = classes[id];
      this._engine.register(id, ({ payload }) => new Cls(payload || {}));
    });
    this._registeredWithLib = true;
  }

  /** Launch a minigame by name. Returns the instance. */
  launch(name, config, onComplete) {
    // Ensure previous listeners are removed before starting a new minigame.
    this._cleanup();

    const classes = this._getBuiltins();
    this._registerWithLib(classes);
    const Cls = classes[name];
    if (!Cls) { console.warn(`Unknown minigame: ${name}`); return null; }

    if (this._engine && this._engine.has(name)) {
      this.active = this._engine.start(name, config || {});
    } else {
      this.active = new Cls(config || {});
    }
    this.onComplete = onComplete || null;
    this.active.start();
    this._launchTime = performance.now(); // track launch time for input grace period

    // Wire input
    this._keyHandler = (e) => {
      if (!this.active || this.active._done) return;
      if (e.code === 'Escape') { e.preventDefault(); this.active._doForfeit(); return; }
      // Grace period: ignore input in the first 200ms after launch to prevent
      // originating click/key events from being captured by the minigame
      if (performance.now() - this._launchTime < 200) return;
      this.active.handleKeyInput(e);
    };
    this._clickHandler = (e) => {
      if (!this.active || this.active._done) return;
      if (performance.now() - this._launchTime < 200) return;

      // Normalize client coordinates (support pointer and touch events)
      let clientX = e.clientX, clientY = e.clientY;
      if (!clientX && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
      }

      // Map client coords into canvas space (pixels) using mobileSupport helper when available
      let mapped = { x: clientX || 0, y: clientY || 0 };
      if (typeof mobileSupport !== 'undefined' && typeof mobileSupport.mapClientToCanvas === 'function') {
        try { mapped = mobileSupport.mapClientToCanvas(clientX, clientY); } catch (err) {}
      } else {
        // Fallback: derive from canvas bounding rect
        const el = document.querySelector('canvas');
        if (el) {
          const rect = el.getBoundingClientRect();
          const cssX = (clientX || 0) - rect.left;
          const cssY = (clientY || 0) - rect.top;
          const ratioX = (el.width && rect.width) ? (el.width / rect.width) : 1;
          const ratioY = (el.height && rect.height) ? (el.height / rect.height) : ratioX;
          mapped = { x: Math.round(cssX * ratioX), y: Math.round(cssY * ratioY) };
        }
      }

      // Check quit button using mapped canvas coords
      if (this.active._quitBtn) {
        const qb = this.active._quitBtn;
        if (mapped.x >= qb.x && mapped.x <= qb.x + qb.w && mapped.y >= qb.y && mapped.y <= qb.y + qb.h) {
          this.active._doForfeit();
          return;
        }
      }

      // Inject into global p5 mouse coords so existing handlers continue to work
      try { window.mouseX = mapped.x; window.mouseY = mapped.y; } catch (err) {}

      this.active.handleClickInput(e);
    };
    // Defer listener registration so the originating click/key event
    // finishes propagating before the minigame starts capturing input
    this._bindTimer = setTimeout(() => {
      this._bindTimer = null;
      if (!this._keyHandler || !this._clickHandler) return;
      window.addEventListener('keydown', this._keyHandler);
      // Use pointer events for better cross-device coverage (falls back to mouse)
      window.addEventListener('pointerdown', this._clickHandler);
      // Also add touchstart for legacy browsers that may not support pointer events
      window.addEventListener('touchstart', this._clickHandler, { passive: true });
    }, 0);

    return this.active;
  }

  /** Called every frame from game.js draw() when a minigame is active */
  update(dt) {
    if (!this.active) return;
    this.active.update(dt);
    if (this.active.isComplete()) {
      const result = this.active.getResult();
      const completeCb = this.onComplete;
      this._cleanup();
      if (completeCb) completeCb(result);
    }
  }

  /** Render the active minigame overlay (called in draw()) */
  render() {
    if (!this.active) return;
    this.active.render();
  }

  /** Cancel/abort the active minigame */
  cancel() {
    if (this.active) {
      this.active._done = true;
      this._cleanup();
    }
  }

  _cleanup() {
    if (this._engine && this._engine.isActive()) {
      this._engine.stop("cleanup");
    }
    if (this._bindTimer) {
      clearTimeout(this._bindTimer);
      this._bindTimer = null;
    }
    if (this._keyHandler) { window.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    if (this._clickHandler) {
      window.removeEventListener('pointerdown', this._clickHandler);
      window.removeEventListener('touchstart', this._clickHandler);
      this._clickHandler = null;
    }
    this.active = null;
    this.onComplete = null;
  }

  get isActive() { return this.active !== null; }
}

// ══════════════════════════════════════════════════════════
//  BASE CLASS
// ══════════════════════════════════════════════════════════
class MinigameBase {
  constructor(config) {
    this.config = config;
    this._done = false;
    this._result = null;
    this._elapsed = 0;
    this._quitBtn = null;
  }
  start() {}
  update(dt) { this._elapsed += dt; }
  render() {}
  handleKeyInput(e) {}
  handleClickInput(e) {}
  isComplete() { return this._done; }
  getResult() { return this._result; }

  /** Override in subclasses to provide a forfeit result. Return null to block quitting. */
  _buildForfeitResult() { return null; }

  /** Called by MinigameManager on Escape or quit button click. */
  _doForfeit() {
    if (this._done) return;
    const result = this._buildForfeitResult();
    if (result === null) return;
    this._result = result;
    this._done = true;
    if (typeof notificationManager !== 'undefined') {
      notificationManager.log('Game forfeited.', 'warning');
    }
  }

  /** Utility: draw a dark overlay behind the minigame */
  drawOverlay(alpha = 180) {
    push();
    resetMatrix();
    fill(0, 0, 0, alpha);
    noStroke();
    rect(0, 0, width, height);
    pop();
  }

  /** Utility: centered panel — also draws the ✕ quit button (top-right corner) */
  drawPanel(w, h, title) {
    push();
    resetMatrix();
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    // Panel bg
    fill(30, 30, 40, 240);
    stroke(120, 100, 60);
    strokeWeight(2);
    rect(x, y, w, h, 12);

    // Title
    if (title) {
      fill(255, 220, 100);
      noStroke();
      textAlign(CENTER, TOP);
      textSize(20);
      text(title, width / 2, y + 14);
    }

    // ✕ Quit button (top-right corner)
    const qbSize = (typeof isMobile === 'function' && isMobile()) ? 44 : 22;
    const qbX = x + w - qbSize - 8;
    const qbY = y + 7;
    fill(80, 40, 40);
    stroke(160, 70, 70);
    strokeWeight(1);
    rect(qbX, qbY, qbSize, qbSize, 4);
    fill(255, 110, 110);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text('✕', qbX + qbSize / 2, qbY + qbSize / 2);
    this._quitBtn = { x: qbX, y: qbY, w: qbSize, h: qbSize };

    pop();
    return { x, y, w, h };
  }
}

// ══════════════════════════════════════════════════════════
//  1. HAGGLING BAR
// ══════════════════════════════════════════════════════════
class HagglingMinigame extends MinigameBase {
  start() {
    this.basePrice = this.config.basePrice || 100;
    this.reputation = this.config.reputation || 50; // 0-100
    this.isBuying = this.config.isBuying !== false;

    // Sweet spot width: 10-40% of bar based on rep
    this.sweetSpotWidth = 0.10 + (this.reputation / 100) * 0.30;
    // Negotiation book bonus
    if (this.config.hasNegotiationBook) this.sweetSpotWidth += 0.05;
    this.sweetSpotWidth = Math.min(0.50, this.sweetSpotWidth);

    this.rounds = 3;
    this.currentRound = 0;
    this.roundResults = [];

    // Bar state
    this.barPos = 0;       // 0-1, indicator position
    this.barSpeed = 1.8;   // cycles per second
    this.barDir = 1;
    this.stopped = false;
    this._elapsed = 0;     // track time since round start for input grace period

    // Sweet spot center per round (randomized)
    this.sweetSpotCenter = 0.3 + Math.random() * 0.4;

    this._startRound();
  }

  _startRound() {
    this.barPos = 0;
    this.barDir = 1;
    this.stopped = false;
    this._elapsed = 0; // reset grace period timer each round
    // Each round has slightly different sweet spot and speed
    this.sweetSpotCenter = 0.2 + Math.random() * 0.6;
    this.barSpeed = 1.5 + this.currentRound * 0.4 + Math.random() * 0.3;
  }

  update(dt) {
    super.update(dt);
    if (this._done || this.stopped) return;
    // Note: _elapsed is incremented by super.update(dt) — no duplicate needed

    this.barPos += this.barDir * this.barSpeed * (dt / 1000);
    if (this.barPos >= 1) { this.barPos = 1; this.barDir = -1; }
    if (this.barPos <= 0) { this.barPos = 0; this.barDir = 1; }
  }

  handleKeyInput(e) {
    if (this._done || this.stopped) return;
    if (this._elapsed < 150) return; // grace period: ignore input during startup
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this._stopBar();
    }
  }

  handleClickInput(e) {
    if (this._done || this.stopped) return;
    if (this._elapsed < 150) return; // grace period: ignore input during startup
    this._stopBar();
  }

  _stopBar() {
    this.stopped = true;
    const dist = Math.abs(this.barPos - this.sweetSpotCenter);
    const inSweet = dist <= this.sweetSpotWidth / 2;
    const accuracy = inSweet ? 1 - (dist / (this.sweetSpotWidth / 2)) : -(dist - this.sweetSpotWidth / 2);
    this.roundResults.push({ pos: this.barPos, dist, inSweet, accuracy });
    this.currentRound++;

    if (this.currentRound >= this.rounds) {
      // Calculate final modifier
      setTimeout(() => this._finish(), 600);
    } else {
      setTimeout(() => this._startRound(), 500);
    }
  }

  _finish() {
    const avgAccuracy = this.roundResults.reduce((s, r) => s + r.accuracy, 0) / this.roundResults.length;
    let modifier;
    if (avgAccuracy > 0) {
      // Good: up to 20% better price
      modifier = avgAccuracy * 0.20;
    } else {
      // Bad: up to 5% worse
      modifier = avgAccuracy * 0.05;
    }

    // For buying, lower is better (negative modifier = discount)
    // For selling, higher is better (positive modifier = bonus)
    this._result = {
      success: avgAccuracy > 0,
      modifier: this.isBuying ? -modifier : modifier,
      avgAccuracy,
      roundDetails: this.roundResults,
    };
    this._done = true;
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(450, 260, '⚖️ Haggle!');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;
    const barY = p.y + 80;
    const barW = 380;
    const barH = 30;
    const barX = cx - barW / 2;

    // Bar background
    fill(50, 50, 60);
    stroke(80);
    strokeWeight(1);
    rect(barX, barY, barW, barH, 6);

    // Sweet spot zone
    const ssLeft = barX + (this.sweetSpotCenter - this.sweetSpotWidth / 2) * barW;
    const ssW = this.sweetSpotWidth * barW;
    noStroke();
    fill(0, 180, 80, 120);
    rect(ssLeft, barY, ssW, barH, 6);

    // Indicator
    if (!this.stopped || this.currentRound < this.rounds) {
      const indX = barX + this.barPos * barW;
      stroke(255, 220, 50);
      strokeWeight(3);
      line(indX, barY - 4, indX, barY + barH + 4);
      noStroke();
      fill(255, 220, 50);
      ellipse(indX, barY - 6, 10, 10);
    }

    // Round info
    fill(200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(14);
    text(`Round ${Math.min(this.currentRound + 1, this.rounds)} / ${this.rounds}`, cx, barY + barH + 16);

    // Round results dots
    for (let i = 0; i < this.roundResults.length; i++) {
      const r = this.roundResults[i];
      const dotX = barX + r.pos * barW;
      fill(r.inSweet ? color(0, 255, 100) : color(255, 60, 60));
      noStroke();
      ellipse(dotX, barY + barH + 46, 12, 12);
    }

    // Instructions
    fill(160);
    textSize(12);
    text('Press SPACE or CLICK to stop the bar in the green zone!', cx, p.y + p.h - 40);

    if (this.stopped && this.currentRound < this.rounds) {
      const last = this.roundResults[this.roundResults.length - 1];
      fill(last.inSweet ? color(0, 255, 100) : color(255, 80, 80));
      textSize(16);
      text(last.inSweet ? '✓ Nice!' : '✗ Missed!', cx, barY - 30);
    }

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  2. LOCK PICKING
// ══════════════════════════════════════════════════════════
class LockPickingMinigame extends MinigameBase {
  start() {
    this.numTumblers = this.config.tumblers || 4;
    this.timeLimit = (this.config.timeLimit || 20) * 1000;
    this.positions = 4; // left, center-left, center-right, right
    // Generate correct combo
    this.solution = [];
    for (let i = 0; i < this.numTumblers; i++) {
      this.solution.push(Math.floor(Math.random() * this.positions));
    }
    // Player's current guess
    this.current = new Array(this.numTumblers).fill(0);
    this.selectedTumbler = 0;
    this.locked = new Array(this.numTumblers).fill(false);
    this.attempts = 0;
    // Touch button hit-areas (populated each render() call on mobile)
    this._touchBtns = null;
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) {
      this._result = { success: false, reason: 'timeout' };
      this._done = true;
    }
  }

  handleKeyInput(e) {
    if (this._done) return;
    const key = e.code;

    if (key === 'ArrowLeft' || key === 'KeyA') {
      this.selectedTumbler = Math.max(0, this.selectedTumbler - 1);
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.selectedTumbler = Math.min(this.numTumblers - 1, this.selectedTumbler + 1);
    } else if (key === 'ArrowUp' || key === 'KeyW') {
      if (!this.locked[this.selectedTumbler]) {
        this.current[this.selectedTumbler] = (this.current[this.selectedTumbler] + 1) % this.positions;
      }
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      if (!this.locked[this.selectedTumbler]) {
        this.current[this.selectedTumbler] = (this.current[this.selectedTumbler] + this.positions - 1) % this.positions;
      }
    } else if (key === 'Space' || key === 'Enter') {
      e.preventDefault();
      this._tryLock();
    }
  }

  _tryLock() {
    const idx = this.selectedTumbler;
    if (this.locked[idx]) return;
    this.attempts++;

    if (this.current[idx] === this.solution[idx]) {
      this.locked[idx] = true;
      // Check if all locked
      if (this.locked.every(l => l)) {
        this._result = { success: true, attempts: this.attempts };
        this._done = true;
      }
    }
    // Wrong guess: tumbler stays unlocked, player can try again
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 300, '🔓 Pick the Lock!');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    const timerY = p.y + 48;
    fill(50, 50, 60);
    noStroke();
    rect(p.x + 30, timerY, p.w - 60, 8, 4);
    const timerColor = timeRatio > 0.5 ? color(0, 200, 80) : timeRatio > 0.25 ? color(255, 165, 0) : color(255, 50, 50);
    fill(timerColor);
    rect(p.x + 30, timerY, (p.w - 60) * timeRatio, 8, 4);

    // Tumblers
    const tumblerW = 60;
    const tumblerH = 100;
    const gap = 16;
    const totalW = this.numTumblers * tumblerW + (this.numTumblers - 1) * gap;
    const startX = cx - totalW / 2;
    const tumY = p.y + 80;

    const posLabels = ['◁', '◇', '◈', '▷'];

    for (let i = 0; i < this.numTumblers; i++) {
      const tx = startX + i * (tumblerW + gap);
      const selected = i === this.selectedTumbler;

      // Tumbler bg
      fill(this.locked[i] ? color(0, 100, 50) : selected ? color(60, 60, 80) : color(40, 40, 50));
      stroke(this.locked[i] ? color(0, 255, 100) : selected ? color(255, 220, 50) : color(80));
      strokeWeight(selected ? 2 : 1);
      rect(tx, tumY, tumblerW, tumblerH, 8);

      // Position indicator
      fill(this.locked[i] ? color(0, 255, 100) : color(220));
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(28);
      text(posLabels[this.current[i]], tx + tumblerW / 2, tumY + tumblerH / 2);

      // Lock icon
      if (this.locked[i]) {
        textSize(16);
        text('✓', tx + tumblerW / 2, tumY + tumblerH - 14);
      }

      // Hint: proximity feedback
      if (!this.locked[i] && this.attempts > 0) {
        const diff = Math.abs(this.current[i] - this.solution[i]);
        if (diff === 0) {
          fill(0, 255, 100, 80);
        } else if (diff === 1 || diff === this.positions - 1) {
          fill(255, 200, 0, 60);
        } else {
          fill(255, 50, 50, 40);
        }
        noStroke();
        ellipse(tx + tumblerW / 2, tumY - 10, 14, 14);
      }
    }

    // Mobile touch buttons — rendered in the lower quarter of the panel
    if (typeof isMobile === 'function' && isMobile()) {
      const btnW = 72, btnH = 48, btnGap = 10;
      const totalBW = 5 * btnW + 4 * btnGap;
      const btnStartX = cx - totalBW / 2;
      const btnY = p.y + p.h - 54;
      const btnLabels = ['← Prev', '↑ Pos', '↓ Pos', 'Next →', '🔓 Try'];
      const touchBtns = [];

      for (let i = 0; i < btnLabels.length; i++) {
        const bx = btnStartX + i * (btnW + btnGap);
        // Highlight Try button
        const isTry = i === 4;
        fill(isTry ? color(40, 80, 40) : color(50, 50, 70));
        stroke(isTry ? color(0, 200, 80) : color(120, 100, 60));
        strokeWeight(1);
        rect(bx, btnY, btnW, btnH, 6);
        fill(isTry ? color(0, 220, 80) : color(200));
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(11);
        text(btnLabels[i], bx + btnW / 2, btnY + btnH / 2);
        touchBtns.push({ x: bx, y: btnY, w: btnW, h: btnH, action: i });
      }
      this._touchBtns = touchBtns;

      fill(120);
      textAlign(CENTER, TOP);
      textSize(10);
      text('🟢 = correct  🟡 = close  🔴 = wrong', cx, p.y + p.h - 14);
    } else {
      this._touchBtns = null;
      // Keyboard instructions
      fill(160);
      noStroke();
      textAlign(CENTER, TOP);
      textSize(12);
      text('← → select tumbler  |  ↑ ↓ rotate  |  SPACE to try locking', cx, p.y + p.h - 48);
      textSize(11);
      fill(120);
      text('🟢 = correct  🟡 = close  🔴 = wrong', cx, p.y + p.h - 28);
    }

    pop();
  }

  handleClickInput(e) {
    if (this._done) return;

    const clickX = mouseX;
    const clickY = mouseY;

    // Check mobile touch buttons first
    if (this._touchBtns) {
      for (const btn of this._touchBtns) {
        if (clickX >= btn.x && clickX <= btn.x + btn.w &&
            clickY >= btn.y && clickY <= btn.y + btn.h) {
          switch (btn.action) {
            case 0: // ← Prev
              this.selectedTumbler = Math.max(0, this.selectedTumbler - 1);
              break;
            case 1: // ↑ Pos
              if (!this.locked[this.selectedTumbler]) {
                this.current[this.selectedTumbler] = (this.current[this.selectedTumbler] + 1) % this.positions;
              }
              break;
            case 2: // ↓ Pos
              if (!this.locked[this.selectedTumbler]) {
                this.current[this.selectedTumbler] = (this.current[this.selectedTumbler] + this.positions - 1) % this.positions;
              }
              break;
            case 3: // Next →
              this.selectedTumbler = Math.min(this.numTumblers - 1, this.selectedTumbler + 1);
              break;
            case 4: // 🔓 Try
              this._tryLock();
              break;
          }
          return;
        }
      }
    }

    // Tap a tumbler directly to select it
    const panelW = 420, panelH = 300;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;
    const tumblerW = 60, tumblerH = 100, gap = 16;
    const totalTW = this.numTumblers * tumblerW + (this.numTumblers - 1) * gap;
    const startX = (panelX + panelW / 2) - totalTW / 2;
    const tumY = panelY + 80;

    for (let i = 0; i < this.numTumblers; i++) {
      const tx = startX + i * (tumblerW + gap);
      if (clickX >= tx && clickX <= tx + tumblerW &&
          clickY >= tumY && clickY <= tumY + tumblerH) {
        this.selectedTumbler = i;
        return;
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
//  3. DICE POKER
// ══════════════════════════════════════════════════════════
class DicePokerMinigame extends MinigameBase {
  start() {
    this.bet = this.config.bet || 50;
    this.maxRerolls = 2;
    this.rerollsLeft = this.maxRerolls;
    this.dice = [];
    this.held = [false, false, false, false, false];
    this.phase = 'rolling'; // rolling, holding, done
    this._rollDice();
    this._rollAnim = 0;
  }

  _rollDice() {
    for (let i = 0; i < 5; i++) {
      if (!this.held[i]) {
        this.dice[i] = 1 + Math.floor(Math.random() * 6);
      }
    }
    this._rollAnim = 300; // animation ms
    this.phase = 'holding';
  }

  _buildForfeitResult() {
    return { hand: 'Folded', multiplier: 0, bet: this.bet, winnings: 0, profit: -this.bet, dice: [...this.dice] };
  }

  handleKeyInput(e) {
    if (this._done) return;
    const key = e.code;

    if (this.phase === 'holding') {
      // 1-5 to toggle hold
      if (key >= 'Digit1' && key <= 'Digit5') {
        const idx = parseInt(key.charAt(5)) - 1;
        this.held[idx] = !this.held[idx];
      }
      // Space/Enter to reroll or finalize
      if (key === 'Space' || key === 'Enter') {
        e.preventDefault();
        if (this.rerollsLeft > 0) {
          this.rerollsLeft--;
          this._rollDice();
          if (this.rerollsLeft === 0) {
            this.phase = 'done';
            setTimeout(() => this._evaluate(), 400);
          }
        } else {
          this.phase = 'done';
          setTimeout(() => this._evaluate(), 400);
        }
      }
      // 'K' to keep all and finalize early
      if (key === 'KeyK') {
        this.phase = 'done';
        setTimeout(() => this._evaluate(), 400);
      }
    }
  }

  _evaluate() {
    const hand = this._getHand();
    const multiplier = hand.multiplier;
    const winnings = Math.floor(this.bet * multiplier);
    this._result = {
      hand: hand.name,
      multiplier,
      bet: this.bet,
      winnings,
      profit: winnings - this.bet,
      dice: [...this.dice],
    };
    this._done = true;
  }

  _getHand() {
    const counts = {};
    for (const d of this.dice) counts[d] = (counts[d] || 0) + 1;
    const vals = Object.values(counts).sort((a, b) => b - a);

    if (vals[0] === 5) return { name: 'Five of a Kind!', multiplier: 6 };
    if (vals[0] === 4) return { name: 'Four of a Kind', multiplier: 4 };
    if (vals[0] === 3 && vals[1] === 2) return { name: 'Full House', multiplier: 3 };
    if (vals[0] === 3) return { name: 'Three of a Kind', multiplier: 2 };
    if (vals[0] === 2 && vals[1] === 2) return { name: 'Two Pair', multiplier: 1 };
    if (vals[0] === 2) return { name: 'One Pair', multiplier: 0 };

    // Check straight
    const sorted = [...new Set(this.dice)].sort((a, b) => a - b);
    if (sorted.length === 5 && sorted[4] - sorted[0] === 4) return { name: 'Straight', multiplier: 4 };

    return { name: 'High Card', multiplier: 0 };
  }

  update(dt) {
    super.update(dt);
    if (this._rollAnim > 0) this._rollAnim = Math.max(0, this._rollAnim - dt);
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(480, 300, '🎲 Dice Poker');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;

    // Dice
    const diceSize = 56;
    const diceGap = 14;
    const totalDW = 5 * diceSize + 4 * diceGap;
    const diceStartX = cx - totalDW / 2;
    const diceY = p.y + 70;

    const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    for (let i = 0; i < 5; i++) {
      const dx = diceStartX + i * (diceSize + diceGap);
      const isRolling = this._rollAnim > 0 && !this.held[i];

      // Dice background
      fill(this.held[i] ? color(60, 100, 60) : color(250, 245, 230));
      stroke(this.held[i] ? color(0, 200, 80) : color(120));
      strokeWeight(this.held[i] ? 2 : 1);
      rect(dx, diceY, diceSize, diceSize, 8);

      // Dice face
      fill(this.held[i] ? color(200, 255, 200) : color(30));
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(36);
      const faceVal = isRolling ? (1 + Math.floor(Math.random() * 6)) : this.dice[i];
      text(diceFaces[faceVal] || faceVal, dx + diceSize / 2, diceY + diceSize / 2);

      // Hold label
      if (this.held[i]) {
        fill(0, 200, 80);
        textSize(10);
        text('HELD', dx + diceSize / 2, diceY + diceSize + 12);
      }

      // Number key hint
      fill(100);
      textSize(10);
      text(`[${i + 1}]`, dx + diceSize / 2, diceY - 10);
    }

    // Info
    fill(200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(14);
    text(`Bet: ${this.bet}g  |  Rerolls left: ${this.rerollsLeft}`, cx, diceY + diceSize + 32);

    // Hand display (evaluate current)
    const hand = this._getHand();
    fill(255, 220, 100);
    textSize(16);
    text(`${hand.name} (×${hand.multiplier})`, cx, diceY + diceSize + 54);

    // Instructions — adaptive for mobile
    fill(140);
    textSize(11);
    const diceInstr = (typeof isMobile === 'function' && isMobile())
      ? 'Tap a die to hold/release  |  Tap empty space to reroll'
      : '1-5 to hold/release  |  SPACE to reroll  |  K to keep';
    text(diceInstr, cx, p.y + p.h - 36);

    pop();
  }

  handleClickInput(e) {
    if (this._done || this.phase !== 'holding' || this._rollAnim > 0) return;

    // Use p5.js canvas-space coordinates
    const clickX = mouseX;
    const clickY = mouseY;

    const panelH = 300;
    const panelY = (height - panelH) / 2;
    const diceSize = 56;
    const diceGap = 14;
    const totalDW = 5 * diceSize + 4 * diceGap;
    const diceStartX = width / 2 - totalDW / 2;
    const diceY = panelY + 70;

    // Check if a die was tapped
    for (let i = 0; i < 5; i++) {
      const dx = diceStartX + i * (diceSize + diceGap);
      if (clickX >= dx && clickX <= dx + diceSize && clickY >= diceY && clickY <= diceY + diceSize) {
        this.held[i] = !this.held[i];
        return;
      }
    }

    // Tap outside dice = roll / finalize (same as SPACE)
    if (this.rerollsLeft > 0) {
      this.rerollsLeft--;
      this._rollDice();
      if (this.rerollsLeft === 0) {
        this.phase = 'done';
        setTimeout(() => this._evaluate(), 400);
      }
    } else {
      this.phase = 'done';
      setTimeout(() => this._evaluate(), 400);
    }
  }
}

// ══════════════════════════════════════════════════════════
//  4. MEMORY MATCH
// ══════════════════════════════════════════════════════════
class MemoryMatchMinigame extends MinigameBase {
  start() {
    this.entryFee = this.config.entryFee || 50;
    this.gridCols = 4;
    this.gridRows = 4;
    const explicitMaxFlips = Number(this.config.maxFlips);
    if (Number.isFinite(explicitMaxFlips) && explicitMaxFlips > 0) {
      this.maxFlips = Math.floor(explicitMaxFlips);
    } else {
      const cfgFlips = Number(window.DIFFICULTY_CONFIG?.memoryMatchMaxFlips);
      this.maxFlips = (Number.isFinite(cfgFlips) && cfgFlips > 0) ? Math.floor(cfgFlips) : 18;
    }
    this.flipsUsed = 0;

    // Create pairs: 8 item pairs with hidden gold payouts (same balance as before).
    const pairDefs = [
      { itemKey: 'Bread', value: 5 },
      { itemKey: 'Fish', value: 8 },
      { itemKey: 'Wood', value: 10 },
      { itemKey: 'Tools', value: 12 },
      { itemKey: 'Spices', value: 15 },
      { itemKey: 'Wine', value: 20 },
      { itemKey: 'Jewelry', value: 30 },
      { itemKey: 'GoldenIdol', value: 45 },
    ];
    this.cardValueByItem = {};
    const cards = [];
    for (const pair of pairDefs) {
      this.cardValueByItem[pair.itemKey] = pair.value;
      cards.push(pair.itemKey, pair.itemKey);
    }

    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    this.cards = cards;
    this.revealed = new Array(16).fill(false);
    this.matched = new Array(16).fill(false);
    this.selection = []; // indices of currently flipped cards (max 2)
    this.totalWon = 0;
    this.matchPairs = 0;
    this.selectedCell = 0; // keyboard cursor
    this._matchTimer = 0;
  }

  _buildForfeitResult() {
    return { totalWon: this.totalWon, entryFee: this.entryFee, profit: this.totalWon - this.entryFee, matchPairs: this.matchPairs, flipsUsed: this.flipsUsed };
  }

  handleKeyInput(e) {
    if (this._done) return;
    const key = e.code;
    const c = this.selectedCell % this.gridCols;
    const r = Math.floor(this.selectedCell / this.gridCols);

    if (key === 'ArrowLeft' || key === 'KeyA') {
      this.selectedCell = r * this.gridCols + Math.max(0, c - 1);
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.selectedCell = r * this.gridCols + Math.min(this.gridCols - 1, c + 1);
    } else if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedCell = Math.max(0, r - 1) * this.gridCols + c;
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedCell = Math.min(this.gridRows - 1, r + 1) * this.gridCols + c;
    } else if (key === 'Space' || key === 'Enter') {
      e.preventDefault();
      this._flipCard(this.selectedCell);
    }
  }

  handleClickInput(e) {
    // Map canvas click to grid cell using p5 mouseX/mouseY
    if (typeof mouseX === 'undefined' || typeof width === 'undefined') return;
    const panelW = 420, panelH = 380;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;
    const cx = px + panelW / 2;
    const cardSize = 64, cardGap = 8;
    const totalGW = this.gridCols * cardSize + (this.gridCols - 1) * cardGap;
    const gridX = cx - totalGW / 2;
    const gridY = py + 55;
    const col = Math.floor((mouseX - gridX) / (cardSize + cardGap));
    const row = Math.floor((mouseY - gridY) / (cardSize + cardGap));
    if (col >= 0 && col < this.gridCols && row >= 0 && row < this.gridRows) {
      const idx = row * this.gridCols + col;
      this.selectedCell = idx;
      this._flipCard(idx);
    }
  }

  _flipCard(idx) {
    if (this._done || this.matched[idx] || this.revealed[idx] || this.selection.length >= 2) return;
    if (this.flipsUsed >= this.maxFlips) return;

    this.revealed[idx] = true;
    this.selection.push(idx);
    this.flipsUsed++;

    if (this.selection.length === 2) {
      const [a, b] = this.selection;
      if (this.cards[a] === this.cards[b]) {
        // Match!
        this.matched[a] = true;
        this.matched[b] = true;
        this.totalWon += this.cardValueByItem[this.cards[a]] || 0;
        this.matchPairs++;
        this._matchTimer = 500;
        setTimeout(() => { this.selection = []; }, 500);
      } else {
        // No match — hide after delay
        this._matchTimer = 800;
        setTimeout(() => {
          this.revealed[a] = false;
          this.revealed[b] = false;
          this.selection = [];
        }, 800);
      }

      // Check end conditions
      setTimeout(() => {
        if (this.matchPairs >= 8 || this.flipsUsed >= this.maxFlips) {
          this._result = {
            totalWon: this.totalWon,
            entryFee: this.entryFee,
            profit: this.totalWon - this.entryFee,
            matchPairs: this.matchPairs,
            flipsUsed: this.flipsUsed,
          };
          this._done = true;
        }
      }, 900);
    }
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 380, '🃏 Memory Match');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;

    const cardSize = 64;
    const cardGap = 8;
    const totalGW = this.gridCols * cardSize + (this.gridCols - 1) * cardGap;
    const totalGH = this.gridRows * cardSize + (this.gridRows - 1) * cardGap;
    const gridX = cx - totalGW / 2;
    const gridY = p.y + 55;

    for (let i = 0; i < 16; i++) {
      const col = i % this.gridCols;
      const row = Math.floor(i / this.gridCols);
      const cx2 = gridX + col * (cardSize + cardGap);
      const cy = gridY + row * (cardSize + cardGap);
      const isSelected = i === this.selectedCell;

      if (this.matched[i]) {
        // Matched card — dim
        fill(30, 80, 40, 120);
        stroke(0, 100, 50, 80);
        strokeWeight(1);
        rect(cx2, cy, cardSize, cardSize, 6);
        this._drawMemoryCardIcon(this.cards[i], cx2, cy, cardSize);
        fill(130, 255, 180);
        noStroke();
        textAlign(RIGHT, TOP);
        textSize(14);
        text('✓', cx2 + cardSize - 6, cy + 4);
      } else if (this.revealed[i]) {
        // Revealed card
        fill(250, 240, 220);
        stroke(200, 180, 100);
        strokeWeight(isSelected ? 3 : 1);
        rect(cx2, cy, cardSize, cardSize, 6);
        this._drawMemoryCardIcon(this.cards[i], cx2, cy, cardSize);
      } else {
        // Face-down card
        fill(70, 70, 100);
        stroke(isSelected ? color(255, 220, 50) : color(90, 90, 120));
        strokeWeight(isSelected ? 3 : 1);
        rect(cx2, cy, cardSize, cardSize, 6);
        fill(100, 100, 140);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text('?', cx2 + cardSize / 2, cy + cardSize / 2);
      }
    }

    // Info bar
    fill(200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(13);
    const fy = gridY + totalGH + 12;
    text(`Flips: ${this.flipsUsed}/${this.maxFlips}  |  Won: ${this.totalWon}g  |  Pairs: ${this.matchPairs}/8`, cx, fy);

    fill(140);
    textSize(11);
    text('Arrow keys to move  |  SPACE to flip', cx, fy + 22);

    pop();
  }

  _drawMemoryCardIcon(itemKey, x, y, cardSize) {
    const iconSize = Math.floor(cardSize * 0.56);
    const iconX = x + (cardSize - iconSize) / 2;
    const iconY = y + (cardSize - iconSize) / 2;
    const canDrawAtlas = typeof AtlasManager !== 'undefined' && AtlasManager && typeof AtlasManager.draw === 'function';
    if (canDrawAtlas && AtlasManager.draw(window, itemKey, iconX, iconY, iconSize, iconSize)) return;

    const emoji = (typeof ITEM_ICONS !== 'undefined' && ITEM_ICONS[itemKey] && ITEM_ICONS[itemKey].emoji)
      ? ITEM_ICONS[itemKey].emoji
      : '📦';
    fill(40);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(Math.floor(cardSize * 0.38));
    text(emoji, x + cardSize / 2, y + cardSize / 2 + 1);
  }
}

// ══════════════════════════════════════════════════════════
//  5. WHEEL OF FORTUNE
// ══════════════════════════════════════════════════════════
class WheelOfFortuneMinigame extends MinigameBase {
  start() {
    this.bet = this.config.bet || 25;
    this.segments = [
      { label: '−2×', multiplier: -2, weight: 3,  color: [90, 10, 10] },
      { label: '−1×', multiplier: -1, weight: 7,  color: [150, 20, 20] },
      { label: '×0',  multiplier: 0,  weight: 28, color: [200, 30, 30] },
      { label: '×½',  multiplier: 0.5,weight: 18, color: [200, 100, 30] },
      { label: '×1',  multiplier: 1,  weight: 20, color: [180, 180, 60] },
      { label: '×2',  multiplier: 2,  weight: 13, color: [60, 180, 60] },
      { label: '×3',  multiplier: 3,  weight: 6,  color: [30, 150, 200] },
      { label: '×5',  multiplier: 5,  weight: 3,  color: [140, 60, 200] },
      { label: '×10', multiplier: 10, weight: 2,  color: [255, 215, 0] },
    ];
    this.angle = Math.random() * TWO_PI;
    this.spinning = false;
    this.spinSpeed = 0;
    this.resultSegment = null;
    this._targetAngle = 0;
    this._totalSpin = 0;
    this._spinDuration = 0;
    this._spinElapsed = 0;
    this._startAngle = 0;
  }

  _buildForfeitResult() {
    // Can't quit once the wheel is spinning — wait for it to stop
    if (this.spinning) return null;
    // Refund the bet if they quit before spinning, lose it if result is already in
    if (this.resultSegment) return null;
    return { segment: 'Quit', multiplier: 1, bet: this.bet, winnings: this.bet, profit: 0 };
  }

  handleKeyInput(e) {
    if (this._done) return;
    if ((e.code === 'Space' || e.code === 'Enter') && !this.spinning && !this.resultSegment) {
      e.preventDefault();
      this._startSpin();
    }
  }

  handleClickInput(e) {
    if (this._done || this.spinning || this.resultSegment) return;
    this._startSpin();
  }

  _startSpin() {
    if (this.spinning || this.resultSegment) return;
    this.spinning = true;
    // Pick the result first via weighted random
    this.resultSegment = this._weightedPick();
    const segIndex = this.segments.indexOf(this.resultSegment);
    const totalSegs = this.segments.length;
    const arcSize = TWO_PI / totalSegs;

    // The pointer is at the top (angle 0 = -HALF_PI in screen coords).
    // We want the target segment to end up under the pointer.
    // Segment i covers angle range [i*arcSize, (i+1)*arcSize] relative to wheel rotation.
    // The pointer reads the angle at -HALF_PI (top of circle).
    // Target: make the midpoint of the result segment align with -HALF_PI.
    const segMidAngle = segIndex * arcSize + arcSize / 2;
    // Where pointer is in wheel-space: (-HALF_PI - this.angle) mod TWO_PI
    // We need finalAngle such that: (-HALF_PI - finalAngle) mod TWO_PI = segMidAngle
    // => finalAngle = -HALF_PI - segMidAngle  (mod TWO_PI)
    let targetAngle = -HALF_PI - segMidAngle;
    // Add some randomness within the segment (so it doesn't always hit dead center)
    targetAngle += (Math.random() - 0.5) * arcSize * 0.7;
    // Normalize to [0, TWO_PI)
    targetAngle = ((targetAngle % TWO_PI) + TWO_PI) % TWO_PI;

    // Calculate how far we need to spin: at least 4 full rotations + distance to target
    const currentNorm = ((this.angle % TWO_PI) + TWO_PI) % TWO_PI;
    let delta = targetAngle - currentNorm;
    if (delta < 0) delta += TWO_PI;
    this._totalSpin = TWO_PI * (4 + Math.floor(Math.random() * 3)) + delta;
    this._spinDuration = 3000 + Math.random() * 1500; // 3-4.5 seconds
    this._spinElapsed = 0;
    this._startAngle = this.angle;
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (!this.spinning) return;

    this._spinElapsed += dt;
    // Ease-out cubic: fast start, slow finish
    const t = Math.min(1, this._spinElapsed / this._spinDuration);
    const eased = 1 - Math.pow(1 - t, 3);
    this.angle = this._startAngle + this._totalSpin * eased;

    if (t >= 1) {
      this.spinning = false;
      // Finalize angle
      this.angle = this._startAngle + this._totalSpin;
      const winnings = Math.floor(this.bet * this.resultSegment.multiplier);
      this._result = {
        segment: this.resultSegment.label,
        multiplier: this.resultSegment.multiplier,
        bet: this.bet,
        winnings,
        profit: winnings - this.bet,
      };
      setTimeout(() => { this._done = true; }, 1500);
    }
  }

  _weightedPick() {
    const totalWeight = this.segments.reduce((s, seg) => s + seg.weight, 0);
    let r = Math.random() * totalWeight;
    for (const seg of this.segments) {
      r -= seg.weight;
      if (r <= 0) return seg;
    }
    return this.segments[this.segments.length - 1];
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(400, 400, '🎡 Wheel of Fortune');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;
    const cy = p.y + 210;
    const radius = 120;

    // Draw wheel
    const totalSegs = this.segments.length;
    const arcSize = TWO_PI / totalSegs;

    for (let i = 0; i < totalSegs; i++) {
      const seg = this.segments[i];
      const startAngle = this.angle + i * arcSize;
      fill(seg.color[0], seg.color[1], seg.color[2]);
      stroke(40);
      strokeWeight(1);
      arc(cx, cy, radius * 2, radius * 2, startAngle, startAngle + arcSize, PIE);

      // Label
      const midAngle = startAngle + arcSize / 2;
      const labelR = radius * 0.65;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(13);
      text(seg.label, lx, ly);
    }

    // Pointer at top of wheel
    fill(255, 220, 50);
    noStroke();
    triangle(cx - 10, cy - radius - 14, cx + 10, cy - radius - 14, cx, cy - radius + 4);

    // Center hub
    fill(60);
    stroke(100);
    strokeWeight(2);
    ellipse(cx, cy, 18, 18);

    // Result text
    if (this.resultSegment && !this.spinning) {
      fill(255, 220, 100);
      textSize(22);
      textAlign(CENTER, TOP);
      text(`${this.resultSegment.label}`, cx, cy + radius + 14);
      textSize(14);
      const winnings = Math.floor(this.bet * this.resultSegment.multiplier);
      if (winnings > this.bet) {
        fill(100, 255, 100);
        text(`Won ${winnings}g! (+${winnings - this.bet}g profit)`, cx, cy + radius + 40);
      } else if (winnings === this.bet) {
        fill(200, 200, 100);
        text(`Got your ${winnings}g back — break even!`, cx, cy + radius + 40);
      } else if (winnings > 0) {
        fill(200, 150, 80);
        text(`Won ${winnings}g (lost ${this.bet - winnings}g)`, cx, cy + radius + 40);
      } else if (winnings === 0) {
        fill(255, 80, 80);
        text(`Lost ${this.bet}g! Better luck next time...`, cx, cy + radius + 40);
      } else {
        // Negative multiplier — lost more than the bet
        const totalLoss = this.bet + Math.abs(winnings);
        fill(255, 30, 30);
        text(`OUCH! Lost ${totalLoss}g total!`, cx, cy + radius + 40);
      }
    }

    // Instructions
    if (!this.spinning && !this.resultSegment) {
      fill(160);
      textSize(13);
      textAlign(CENTER, TOP);
      text(`Bet: ${this.bet}g  —  Press SPACE or click to spin!`, cx, p.y + p.h - 30);
    } else if (this.spinning) {
      fill(200, 200, 100);
      textSize(13);
      textAlign(CENTER, TOP);
      text(`Spinning...`, cx, p.y + p.h - 30);
    }

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  6. BLUFF METER
// ══════════════════════════════════════════════════════════
class BluffMeterMinigame extends MinigameBase {
  start() {
    this.timeLimit = (this.config.timeLimit || 10) * 1000;
    this.targetBPM = 72; // ideal heartbeat rhythm (taps per minute)
    this.targetInterval = 60000 / this.targetBPM; // ms between taps
    this.tolerance = 200; // ms tolerance window
    this.taps = [];
    this.score = 0;
    this.maxTaps = 8;
    this.feedback = ''; // last tap feedback
    this._pulsePhase = 0;
  }

  handleKeyInput(e) {
    if (this._done) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this._tap();
    }
  }

  handleClickInput(e) {
    if (this._done) return;
    this._tap();
  }

  _tap() {
    const now = this._elapsed;
    this.taps.push(now);

    if (this.taps.length >= 2) {
      const interval = now - this.taps[this.taps.length - 2];
      const diff = Math.abs(interval - this.targetInterval);

      if (diff < this.tolerance * 0.3) {
        this.score += 2;
        this.feedback = '♥ Perfect rhythm!';
      } else if (diff < this.tolerance) {
        this.score += 1;
        this.feedback = '♡ Good';
      } else if (interval < this.targetInterval * 0.5) {
        this.score -= 1;
        this.feedback = '💢 Too fast — nervous!';
      } else {
        this.score -= 1;
        this.feedback = '😰 Too slow — suspicious!';
      }
    } else {
      this.feedback = '♥ Tap to the heartbeat...';
    }

    if (this.taps.length >= this.maxTaps) {
      this._finish();
    }
  }

  _finish() {
    const maxScore = (this.maxTaps - 1) * 2;
    const ratio = Math.max(0, this.score / maxScore);
    this._result = {
      success: ratio >= 0.4,
      score: this.score,
      maxScore,
      ratio,
    };
    this._done = true;
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    this._pulsePhase = (this._elapsed / this.targetInterval) % 1;
    if (this._elapsed >= this.timeLimit) {
      this._finish();
    }
  }

  render() {
    this.drawOverlay(180);
    const p = this.drawPanel(400, 280, '🫀 Stay Calm — Bluff Check');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;

    // Heartbeat visual guide
    const pulseY = p.y + 80;
    const pulseRadius = 30 + Math.sin(this._pulsePhase * TWO_PI) * 10;
    fill(180, 40, 40, 180);
    noStroke();
    ellipse(cx, pulseY, pulseRadius, pulseRadius);
    fill(220, 60, 60);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('♥', cx, pulseY);

    // Tap count
    fill(200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(14);
    text(`Taps: ${this.taps.length} / ${this.maxTaps}`, cx, pulseY + 40);

    // Score bar
    const barW = 260;
    const barH = 20;
    const barX = cx - barW / 2;
    const barY = pulseY + 70;
    fill(50, 50, 60);
    rect(barX, barY, barW, barH, 6);
    const maxScore = (this.maxTaps - 1) * 2;
    const ratio = Math.max(0, Math.min(1, this.score / maxScore));
    const barColor = ratio > 0.6 ? color(0, 200, 80) : ratio > 0.3 ? color(255, 165, 0) : color(255, 50, 50);
    fill(barColor);
    rect(barX, barY, barW * ratio, barH, 6);
    fill(255);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(`Confidence: ${Math.round(ratio * 100)}%`, cx, barY + barH / 2);

    // Feedback
    if (this.feedback) {
      fill(255, 220, 100);
      textSize(15);
      textAlign(CENTER, TOP);
      text(this.feedback, cx, barY + barH + 16);
    }

    // Timer
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50, 50, 60);
    noStroke();
    rect(p.x + 30, p.y + p.h - 30, p.w - 60, 8, 4);
    fill(timeRatio > 0.4 ? color(100, 100, 180) : color(255, 80, 80));
    rect(p.x + 30, p.y + p.h - 30, (p.w - 60) * timeRatio, 8, 4);

    fill(120);
    textSize(11);
    textAlign(CENTER, TOP);
    text('Tap SPACE in rhythm with the heartbeat — not too fast, not too slow!', cx, p.y + p.h - 18);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  7. NAVIGATION DODGE
// ══════════════════════════════════════════════════════════
class NavigationDodgeMinigame extends MinigameBase {
  start() {
    this.timeLimit = (this.config.timeLimit || 12) * 1000;
    this.laneCount = 3;
    this.playerLane = 1; // center
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 800; // ms
    this.scrollSpeed = 0.3;  // px/ms
    this.hits = 0;
    this.maxHits = 3;
    this.dodged = 0;
    this._invulnTimer = 0;
  }

  handleKeyInput(e) {
    if (this._done) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.playerLane = Math.max(0, this.playerLane - 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.playerLane = Math.min(this.laneCount - 1, this.playerLane + 1);
    }
  }

  handleClickInput(e) {
    if (this._done) return;
    // Left half of canvas → move left; right half → move right
    if (mouseX < width / 2) {
      this.playerLane = Math.max(0, this.playerLane - 1);
    } else {
      this.playerLane = Math.min(this.laneCount - 1, this.playerLane + 1);
    }
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._invulnTimer > 0) this._invulnTimer -= dt;

    // Spawn obstacles
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * this.laneCount);
      // Sometimes spawn 2 obstacles in different lanes
      this.obstacles.push({ lane, y: 0 });
      if (Math.random() < 0.3) {
        const lane2 = (lane + 1 + Math.floor(Math.random() * (this.laneCount - 1))) % this.laneCount;
        this.obstacles.push({ lane: lane2, y: 0 });
      }
      // Speed up over time
      this.spawnInterval = Math.max(400, 800 - this._elapsed * 0.03);
      this.scrollSpeed = 0.3 + this._elapsed * 0.00003;
    }

    // Move obstacles
    for (const obs of this.obstacles) {
      obs.y += this.scrollSpeed * dt;
    }

    // Collision check (obstacle in player lane near bottom)
    const hitZone = 0.75; // normalized Y where player sits
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.y > 300) {
        // Past player — dodged
        this.dodged++;
        this.obstacles.splice(i, 1);
        continue;
      }

      if (obs.lane === this.playerLane && obs.y > 240 && obs.y < 290 && this._invulnTimer <= 0) {
        this.hits++;
        this._invulnTimer = 500;
        this.obstacles.splice(i, 1);
        if (this.hits >= this.maxHits) {
          this._result = { success: false, hits: this.hits, dodged: this.dodged };
          this._done = true;
          return;
        }
      }
    }

    // Time's up — survived!
    if (this._elapsed >= this.timeLimit) {
      this._result = { success: this.hits < this.maxHits, hits: this.hits, dodged: this.dodged };
      this._done = true;
    }
  }

  render() {
    this.drawOverlay(180);
    const p = this.drawPanel(300, 360, '🌊 Navigate!');

    push();
    resetMatrix();
    const cx = p.x + p.w / 2;
    const laneW = 70;
    const lanesStartX = cx - (this.laneCount * laneW) / 2;
    const trackY = p.y + 50;
    const trackH = 280;

    // Lanes
    for (let i = 0; i < this.laneCount; i++) {
      const lx = lanesStartX + i * laneW;
      fill(30, 50, 70, 200);
      stroke(50, 80, 110);
      strokeWeight(1);
      rect(lx, trackY, laneW, trackH);
    }

    // Obstacles
    for (const obs of this.obstacles) {
      const ox = lanesStartX + obs.lane * laneW + 10;
      const oy = trackY + obs.y;
      if (oy < trackY || oy > trackY + trackH - 20) continue;
      fill(200, 50, 50);
      noStroke();
      rect(ox, oy, laneW - 20, 25, 4);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(14);
      text('🪨', ox + (laneW - 20) / 2, oy + 12);
    }

    // Player boat
    const playerX = lanesStartX + this.playerLane * laneW + laneW / 2;
    const playerY = trackY + 260;
    const flash = this._invulnTimer > 0 && Math.floor(this._elapsed / 80) % 2;
    if (!flash) {
      fill(60, 160, 220);
      noStroke();
      triangle(playerX - 15, playerY + 15, playerX + 15, playerY + 15, playerX, playerY - 10);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(14);
      text('⛵', playerX, playerY + 2);
    }

    // HP display
    fill(200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(12);
    const hearts = '❤️'.repeat(this.maxHits - this.hits) + '🖤'.repeat(this.hits);
    text(hearts, cx, trackY + trackH + 4);

    // Mobile tap zone hints — semi-transparent arrows flanking the track
    if (typeof isMobile === 'function' && isMobile()) {
      noStroke();
      fill(255, 255, 255, 30);
      // Left tap zone (left of track)
      rect(p.x, trackY, lanesStartX - p.x, trackH, 4);
      // Right tap zone (right of track)
      const trackRight = lanesStartX + this.laneCount * laneW;
      rect(trackRight, trackY, (p.x + p.w) - trackRight, trackH, 4);
      // Arrow labels
      fill(255, 255, 255, 120);
      textAlign(CENTER, CENTER);
      textSize(22);
      text('◀', p.x + (lanesStartX - p.x) / 2, trackY + trackH / 2);
      text('▶', trackRight + ((p.x + p.w) - trackRight) / 2, trackY + trackH / 2);
      // Full-width tap zones (for smaller panels where track fills width)
      // If track fills the whole panel, split the panel in half
      fill(150);
      textSize(9);
      textAlign(CENTER, TOP);
      text('TAP LEFT / RIGHT to steer', cx, trackY + trackH + 20);
    }

    // Timer
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50);
    rect(p.x + 20, p.y + p.h - 20, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(60, 180, 220) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 20, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  8. SHIP RACE  (Merchant's Wager event)
// ══════════════════════════════════════════════════════════
class ShipRaceMinigame extends MinigameBase {
  start() {
    this.timeLimit = (this.config.timeLimit || 20) * 1000;

    // Wind: sum of two sine waves for unpredictability (-1 to 1)
    this._windPhase1  = Math.random() * Math.PI * 2;
    this._windPhase2  = Math.random() * Math.PI * 2;
    this._windSpeed1  = 0.0007 + Math.random() * 0.0004;
    this._windSpeed2  = 0.0012 + Math.random() * 0.0003;
    this.windAngle    = 0; // current wind -1..1

    // Player trim: nudged by keypresses, drifts back to center
    this.trimAngle    = 0; // -1..1
    this._nudgeAmount = 0.22;
    this._driftRate   = 0.0008; // per ms

    // Race progress 0-100
    this.playerProgress = 0;
    this.rivalProgress  = 0;
    this.playerBoatName = this.config.playerBoatName || 'Your Ship';
    const playerSpeedMs = Math.max(80, this.config.playerSpeedMs || 220); // lower = faster
    const playerCondition = Math.max(0, Math.min(100, this.config.playerCondition ?? 100));
    const playerBonusSpeed = this.config.playerBonusSpeed || 0;
    const rivalSpeedRating = Math.max(0.75, Math.min(1.4, this.config.rivalSpeedRating || (0.9 + Math.random() * 0.25)));
    const playerSpeedRating = Math.max(0.75, Math.min(1.5, 220 / playerSpeedMs));
    const hullFactor = 0.75 + (playerCondition / 100) * 0.35; // 75% at broken hull → 110% at pristine
    const statFactor = 1 + Math.max(-0.2, Math.min(0.3, playerBonusSpeed * 0.02));
    this._playerRaceFactor = playerSpeedRating * hullFactor * statFactor;
    this._raceBaseSpeed = 0.0052;
    this._rivalSpeed = this._raceBaseSpeed * rivalSpeedRating;
    this._rivalLabel = this.config.rivalBoatName || 'Rival';

    this._finished  = false;
    this._winner    = null;
    this._endTimer  = 0;
  }

  handleKeyInput(e) {
    if (this._done || this._finished) return;
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') {
      this.trimAngle = Math.max(-1, this.trimAngle - this._nudgeAmount);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.trimAngle = Math.min(1,  this.trimAngle + this._nudgeAmount);
    }
  }

  handleClickInput(e) {
    if (this._done || this._finished) return;
    if (mouseX < width / 2) {
      this.trimAngle = Math.max(-1, this.trimAngle - this._nudgeAmount);
    } else {
      this.trimAngle = Math.min(1,  this.trimAngle + this._nudgeAmount);
    }
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;

    if (this._finished) {
      this._endTimer -= dt;
      if (this._endTimer <= 0) this._done = true;
      return;
    }

    // Oscillate wind
    this.windAngle = 0.6 * Math.sin(this._elapsed * this._windSpeed1 + this._windPhase1)
                   + 0.4 * Math.sin(this._elapsed * this._windSpeed2 + this._windPhase2);

    // Trim drifts back toward center
    if (this.trimAngle > 0) this.trimAngle = Math.max(0, this.trimAngle - this._driftRate * dt);
    else                    this.trimAngle = Math.min(0, this.trimAngle + this._driftRate * dt);

    // Efficiency: 1 when trim matches wind perfectly, 0 when opposite
    const diff = Math.abs(this.trimAngle - this.windAngle); // 0..2
    const efficiency = Math.max(0, 1 - diff);

    // Player speed: shaped by trim efficiency plus boat/stat quality multipliers.
    const playerSpeed = this._raceBaseSpeed * efficiency * 2.2 * this._playerRaceFactor;
    this.playerProgress = Math.min(100, this.playerProgress + playerSpeed * dt);
    this.rivalProgress  = Math.min(100, this.rivalProgress  + this._rivalSpeed * dt);

    if (this.playerProgress >= 100 || this.rivalProgress >= 100) {
      this._finish();
    } else if (this._elapsed >= this.timeLimit) {
      this._finish();
    }
  }

  _finish() {
    const playerWon = this.playerProgress >= this.rivalProgress;
    this._winner  = playerWon ? 'player' : 'rival';
    this._result  = { success: playerWon, playerProgress: this.playerProgress, rivalProgress: this.rivalProgress };
    this._finished = true;
    this._endTimer = 1400;
  }

  render() {
    this.drawOverlay(180);
    const p  = this.drawPanel(380, 330, '⛵ Merchant\'s Wager — Ship Race!');

    push();
    resetMatrix();
    const cx          = p.x + p.w / 2;
    const panelBottom = p.y + p.h;
    const barW        = p.w - 60;
    const barX        = p.x + 30;

    // ── Race progress bars ──────────────────────────────
    let barY = p.y + 52;
    const barH = 22;

    // Player bar
    fill(40, 40, 55); noStroke();
    rect(barX, barY, barW, barH, 5);
    fill(60, 160, 255);
    rect(barX, barY, barW * (this.playerProgress / 100), barH, 5);
    fill(255); noStroke();
    textAlign(LEFT, CENTER); textSize(12);
    text(`⛵ ${this.playerBoatName}  ${Math.round(this.playerProgress)}%`, barX + 6, barY + barH / 2);

    // Rival bar
    barY += barH + 8;
    fill(40, 40, 55); noStroke();
    rect(barX, barY, barW, barH, 5);
    fill(220, 80, 80);
    rect(barX, barY, barW * (this.rivalProgress / 100), barH, 5);
    fill(255); noStroke();
    textAlign(LEFT, CENTER); textSize(12);
    text(`🚢 ${this._rivalLabel}  ${Math.round(this.rivalProgress)}%`, barX + 6, barY + barH / 2);

    // ── Wind dial ────────────────────────────────────────
    const dialCX = cx;
    const dialCY = p.y + 180;
    const dialR  = 50;

    fill(30, 30, 45);
    stroke(80, 100, 130); strokeWeight(2);
    ellipse(dialCX, dialCY, dialR * 2, dialR * 2);

    // Zone markers (faint lines at ±45°)
    stroke(60, 80, 100); strokeWeight(1);
    const markAngle = Math.PI * 0.25;
    for (const a of [-markAngle, markAngle]) {
      line(dialCX, dialCY,
           dialCX + Math.sin(a) * dialR,
           dialCY - Math.cos(a) * dialR);
    }

    // Wind needle (blue)
    const windRad = this.windAngle * Math.PI * 0.42;
    const windNX  = dialCX + Math.sin(windRad) * dialR * 0.85;
    const windNY  = dialCY - Math.cos(windRad) * dialR * 0.85;
    stroke(80, 160, 255); strokeWeight(3);
    line(dialCX, dialCY, windNX, windNY);
    fill(80, 160, 255); noStroke();
    ellipse(windNX, windNY, 9, 9);

    // Trim needle (yellow)
    const trimRad = this.trimAngle * Math.PI * 0.42;
    const trimNX  = dialCX + Math.sin(trimRad) * dialR * 0.6;
    const trimNY  = dialCY - Math.cos(trimRad) * dialR * 0.6;
    stroke(255, 200, 40); strokeWeight(3);
    line(dialCX, dialCY, trimNX, trimNY);
    fill(255, 200, 40); noStroke();
    ellipse(trimNX, trimNY, 9, 9);

    // Dial label
    fill(140); noStroke();
    textAlign(CENTER, CENTER); textSize(10);
    text('🌬 Wind', dialCX, dialCY + dialR + 12);

    // Legend
    fill(80, 160, 255); textAlign(RIGHT, CENTER); textSize(10);
    text('● Wind', cx - 4, dialCY + dialR + 26);
    fill(255, 200, 40); textAlign(LEFT, CENTER);
    text('● Trim', cx + 8, dialCY + dialR + 26);

    // ── Efficiency bar ───────────────────────────────────
    const diff       = Math.abs(this.trimAngle - this.windAngle);
    const efficiency = Math.max(0, 1 - diff);
    const effW  = 160;
    const effX  = cx - effW / 2;
    const effY  = dialCY + dialR + 38;
    fill(40, 40, 55); noStroke();
    rect(effX, effY, effW, 14, 4);
    fill(efficiency > 0.65 ? color(0, 220, 100) : efficiency > 0.35 ? color(255, 165, 0) : color(220, 60, 60));
    rect(effX, effY, effW * efficiency, 14, 4);
    fill(255); textSize(10); textAlign(CENTER, CENTER);
    text(efficiency > 0.65 ? '💨 Full sail!' : efficiency > 0.35 ? 'Partial wind' : 'No wind!', cx, effY + 7);

    // ── Finish banner ────────────────────────────────────
    if (this._finished) {
      fill(this._winner === 'player' ? color(0, 200, 80, 230) : color(200, 50, 50, 230));
      noStroke();
      rect(p.x + 20, dialCY - 16, p.w - 40, 32, 6);
      fill(255); textAlign(CENTER, CENTER); textSize(17);
      text(this._winner === 'player' ? '🏆 You Win!' : '💀 Rival Wins!', cx, dialCY);
    }

    // ── Timer bar ────────────────────────────────────────
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); noStroke();
    rect(p.x + 20, panelBottom - 22, p.w - 40, 7, 3);
    fill(timeRatio > 0.3 ? color(60, 180, 220) : color(255, 80, 80));
    rect(p.x + 20, panelBottom - 22, (p.w - 40) * timeRatio, 7, 3);

    fill(130); textSize(10); textAlign(CENTER, TOP);
    text('← A / → D  — Match the yellow trim to the blue wind needle!', cx, panelBottom - 13);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  9. FISHING  (Water terrain — resource collection)
// ══════════════════════════════════════════════════════════
class FishingMinigame extends MinigameBase {
  start() {
    this.rounds = this.config.rounds || 5;
    this.currentRound = 0;
    this.caught = 0;
    this.timeLimit = (this.config.timeLimit || 25) * 1000;

    // Bobber state
    this.bobberY = 0;         // 0 = surface
    this.bobberState = 'idle'; // idle | dipping | missed | caught
    this._dipTime = 0;         // when the dip starts
    this._dipWindow = 600;     // ms to react
    this._nextDipIn = 1000 + Math.random() * 2000;
    this._roundTimer = 0;
    this._flashTimer = 0;
    this._ripple = 0;
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) {
      this._finish(); return;
    }

    this._roundTimer += dt;
    this._ripple += dt * 0.003;

    if (this.bobberState === 'idle') {
      this._nextDipIn -= dt;
      if (this._nextDipIn <= 0) {
        this.bobberState = 'dipping';
        this._dipTime = this._elapsed;
        this.bobberY = 1;
      }
    } else if (this.bobberState === 'dipping') {
      if (this._elapsed - this._dipTime > this._dipWindow) {
        // Missed!
        this.bobberState = 'missed';
        this._flashTimer = 400;
      }
    } else if (this.bobberState === 'missed' || this.bobberState === 'caught') {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this.currentRound++;
        if (this.currentRound >= this.rounds) { this._finish(); return; }
        this.bobberState = 'idle';
        this.bobberY = 0;
        this._nextDipIn = 800 + Math.random() * 2500;
      }
    }
  }

  handleKeyInput(e) {
    if (this._done) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this._pull(); }
  }
  handleClickInput() { if (!this._done) this._pull(); }

  _pull() {
    if (this.bobberState === 'dipping') {
      this.caught++;
      this.bobberState = 'caught';
      this._flashTimer = 500;
    } else if (this.bobberState === 'idle') {
      // Pulled too early — scare the fish, speed up next dip slightly
      this._nextDipIn = Math.max(300, this._nextDipIn - 400);
    }
  }

  _finish() {
    this._result = {
      success: this.caught > 0,
      caught: this.caught,
      total: this.rounds,
      resourceType: 'fishing',
    };
    this._done = true;
  }

  _buildForfeitResult() {
    return { success: this.caught > 0, caught: this.caught, total: this.rounds, resourceType: 'fishing', forfeited: true };
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 300, '🎣 Fishing');
    push(); resetMatrix();

    const cx = p.x + p.w / 2;
    const waterY = p.y + 140;

    // Water
    noStroke();
    fill(30, 80, 140, 180);
    rect(p.x + 20, waterY, p.w - 40, 120, 8);

    // Ripples
    noFill(); stroke(60, 130, 200, 80); strokeWeight(1);
    for (let i = 0; i < 4; i++) {
      const ry = waterY + 20 + i * 25;
      const wv = Math.sin(this._ripple + i) * 8;
      line(p.x + 30 + wv, ry, p.x + p.w - 30 + wv, ry);
    }

    // Fishing line
    stroke(200); strokeWeight(1);
    line(cx, p.y + 70, cx, waterY + 10 + this.bobberY * 30);

    // Bobber
    noStroke();
    if (this.bobberState === 'dipping') {
      fill(255, 50, 50);
      ellipse(cx, waterY + 10 + 30, 14, 14);
      // Splash
      fill(100, 180, 255, 150);
      ellipse(cx - 10, waterY + 8, 6, 6);
      ellipse(cx + 12, waterY + 6, 5, 5);
    } else if (this.bobberState === 'caught') {
      fill(0, 255, 100);
      ellipse(cx, waterY + 5, 14, 14);
    } else if (this.bobberState === 'missed') {
      fill(255, 80, 80, 150);
      ellipse(cx, waterY + 5, 14, 14);
    } else {
      fill(255, 100, 50);
      ellipse(cx, waterY + 10, 12, 12);
    }

    // Status text
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(14);
    if (this.bobberState === 'dipping') {
      fill(255, 220, 50);
      text('🐟 NOW! Press SPACE / Click!', cx, p.y + 80);
    } else if (this.bobberState === 'caught') {
      fill(100, 255, 100);
      text('✓ Caught one!', cx, p.y + 80);
    } else if (this.bobberState === 'missed') {
      fill(255, 80, 80);
      text('✗ Too slow!', cx, p.y + 80);
    } else {
      fill(160);
      text('Wait for the bobber to dip...', cx, p.y + 80);
    }

    // Score & progress
    fill(200); textSize(13);
    text(`Caught: ${this.caught}/${this.rounds}  |  Round ${Math.min(this.currentRound + 1, this.rounds)}/${this.rounds}`, cx, p.y + p.h - 50);

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); rect(p.x + 20, p.y + p.h - 22, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(30, 130, 200) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 22, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
//  9. MINING  (Rock terrain — resource collection)
// ══════════════════════════════════════════════════════════
class MiningMinigame extends MinigameBase {
  start() {
    this.swings = this.config.swings || 8;
    this.currentSwing = 0;
    this.hits = 0;
    this.timeLimit = (this.config.timeLimit || 20) * 1000;

    // Sweet-spot timing: a moving indicator on a bar
    this.barPos = 0;
    this.barSpeed = 2.0 + Math.random() * 0.5;
    this.barDir = 1;
    this.sweetCenter = 0.45 + Math.random() * 0.1;
    this.sweetWidth = 0.18;
    this.swingState = 'ready'; // ready | hit | miss
    this._flashTimer = 0;

    // Crack meter
    this.crackLevel = 0; // 0–1, fills to 1 = vein exhausted
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) { this._finish(); return; }

    if (this.swingState === 'ready') {
      this.barPos += this.barDir * this.barSpeed * (dt / 1000);
      if (this.barPos >= 1) { this.barPos = 1; this.barDir = -1; }
      if (this.barPos <= 0) { this.barPos = 0; this.barDir = 1; }
    } else {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this.currentSwing++;
        if (this.currentSwing >= this.swings || this.crackLevel >= 1) { this._finish(); return; }
        this.swingState = 'ready';
        this.sweetCenter = 0.3 + Math.random() * 0.4;
        this.barSpeed = 2.0 + this.currentSwing * 0.2 + Math.random() * 0.4;
      }
    }
  }

  handleKeyInput(e) {
    if (this._done || this.swingState !== 'ready') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this._swing(); }
  }
  handleClickInput() { if (!this._done && this.swingState === 'ready') this._swing(); }

  _swing() {
    const dist = Math.abs(this.barPos - this.sweetCenter);
    if (dist <= this.sweetWidth / 2) {
      this.hits++;
      const accuracy = 1 - (dist / (this.sweetWidth / 2));
      this.crackLevel = Math.min(1, this.crackLevel + 0.1 + accuracy * 0.15);
      this.swingState = 'hit';
    } else {
      this.crackLevel = Math.min(1, this.crackLevel + 0.03);
      this.swingState = 'miss';
    }
    this._flashTimer = 350;
  }

  _finish() {
    this._result = {
      success: this.hits > 0,
      hits: this.hits,
      total: this.swings,
      crackLevel: this.crackLevel,
      resourceType: 'mining',
    };
    this._done = true;
  }

  _buildForfeitResult() {
    return { success: this.hits > 0, hits: this.hits, total: this.swings, crackLevel: this.crackLevel, resourceType: 'mining', forfeited: true };
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 280, '⛏️ Mining');
    push(); resetMatrix();

    const cx = p.x + p.w / 2;
    const barY = p.y + 90;
    const barW = 340;
    const barH = 26;
    const barX = cx - barW / 2;

    // Timing bar background
    fill(50, 50, 60); stroke(80); strokeWeight(1);
    rect(barX, barY, barW, barH, 6);

    // Sweet spot zone
    const ssLeft = barX + (this.sweetCenter - this.sweetWidth / 2) * barW;
    const ssW = this.sweetWidth * barW;
    noStroke(); fill(180, 120, 40, 130);
    rect(ssLeft, barY, ssW, barH, 6);

    // Moving indicator
    if (this.swingState === 'ready') {
      const indX = barX + this.barPos * barW;
      stroke(255, 200, 50); strokeWeight(3);
      line(indX, barY - 4, indX, barY + barH + 4);
      noStroke(); fill(255, 200, 50);
      ellipse(indX, barY - 6, 10, 10);
    }

    // Flash feedback
    if (this.swingState === 'hit') {
      fill(100, 255, 100); textAlign(CENTER, CENTER); textSize(18); noStroke();
      text('⛏️ HIT!', cx, p.y + 70);
    } else if (this.swingState === 'miss') {
      fill(255, 80, 80); textAlign(CENTER, CENTER); textSize(18); noStroke();
      text('✗ Miss!', cx, p.y + 70);
    }

    // Crack meter
    const cmY = barY + barH + 20;
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(12);
    text('Rock Crack Progress', cx, cmY);
    fill(50); rect(barX, cmY + 18, barW, 10, 4);
    fill(180, 120, 40); rect(barX, cmY + 18, barW * this.crackLevel, 10, 4);

    // Score
    fill(200); textSize(13); textAlign(CENTER, TOP);
    text(`Hits: ${this.hits}/${this.currentSwing + (this.swingState === 'ready' ? 0 : 1)}  |  Swing ${Math.min(this.currentSwing + 1, this.swings)}/${this.swings}`, cx, cmY + 38);

    // Instructions
    fill(160); textSize(11);
    text('Press SPACE / Click when the marker is in the brown zone!', cx, p.y + p.h - 42);

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); rect(p.x + 20, p.y + p.h - 22, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(180, 120, 40) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 22, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
// 10. HARVESTING  (Grass terrain — resource collection)
// ══════════════════════════════════════════════════════════
class HarvestMinigame extends MinigameBase {
  start() {
    this.timeLimit = (this.config.timeLimit || 18) * 1000;
    this.collected = 0;
    this.missed = 0;

    // Falling items
    this.items = [];
    this._spawnTimer = 0;
    this._spawnInterval = 700; // ms
    this._panelBounds = null;
    // Basket position (mouse/click driven)
    this._basketX = 0.5; // 0–1 normalized
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) { this._finish(); return; }

    // Spawn items
    this._spawnTimer += dt;
    if (this._spawnTimer >= this._spawnInterval) {
      this._spawnTimer = 0;
      const isHerb = Math.random() < 0.25;
      this.items.push({
        x: 0.05 + Math.random() * 0.9,
        y: 0,
        speed: 0.3 + Math.random() * 0.3 + this._elapsed / this.timeLimit * 0.3,
        type: isHerb ? 'herb' : 'wheat',
        alive: true,
      });
      // Speed up spawns over time
      this._spawnInterval = Math.max(300, 700 - (this._elapsed / this.timeLimit) * 300);
    }

    // Move items
    for (const item of this.items) {
      if (!item.alive) continue;
      item.y += item.speed * (dt / 1000);
      if (item.y >= 0.9) {
        // Check basket catch (within 0.12 range)
        if (Math.abs(item.x - this._basketX) < 0.12) {
          item.alive = false;
          this.collected++;
        } else if (item.y >= 1.05) {
          item.alive = false;
          this.missed++;
        }
      }
    }

    // Clean old items
    this.items = this.items.filter(i => i.alive || i.y < 1.2);
  }

  handleKeyInput(e) {
    if (this._done) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this._basketX = Math.max(0.05, this._basketX - 0.08);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this._basketX = Math.min(0.95, this._basketX + 0.08);
    }
  }

  handleClickInput() {
    if (this._done || !this._panelBounds) return;
    const p = this._panelBounds;
    const relX = (mouseX - p.x - 20) / (p.w - 40);
    this._basketX = Math.max(0.05, Math.min(0.95, relX));
  }

  _finish() {
    this._result = {
      success: this.collected > 0,
      collected: this.collected,
      missed: this.missed,
      resourceType: 'harvesting',
    };
    this._done = true;
  }

  _buildForfeitResult() {
    return { success: this.collected > 0, collected: this.collected, missed: this.missed, resourceType: 'harvesting', forfeited: true };
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 320, '🌾 Harvesting');
    this._panelBounds = p;
    push(); resetMatrix();

    const fieldX = p.x + 20;
    const fieldY = p.y + 50;
    const fieldW = p.w - 40;
    const fieldH = 220;

    // Field background
    noStroke();
    fill(30, 50, 20, 180);
    rect(fieldX, fieldY, fieldW, fieldH, 6);

    // Falling items
    for (const item of this.items) {
      if (!item.alive) continue;
      const ix = fieldX + item.x * fieldW;
      const iy = fieldY + item.y * fieldH;
      textSize(18); textAlign(CENTER, CENTER); noStroke();
      text(item.type === 'herb' ? '🌿' : '🌾', ix, iy);
    }

    // Basket
    const bx = fieldX + this._basketX * fieldW;
    const by = fieldY + fieldH - 15;
    fill(140, 100, 40); noStroke();
    rect(bx - 22, by - 8, 44, 16, 4);
    fill(180, 140, 60);
    rect(bx - 18, by - 12, 36, 10, 3);
    textSize(12); textAlign(CENTER, CENTER); fill(255);
    text('🧺', bx, by - 4);

    // Score
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(13);
    text(`Collected: ${this.collected}  |  Missed: ${this.missed}`, p.x + p.w / 2, p.y + p.h - 50);

    // Instructions
    fill(160); textSize(11);
    text('← → or A/D keys to move basket. Click to move.', p.x + p.w / 2, p.y + p.h - 34);

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); rect(p.x + 20, p.y + p.h - 20, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(80, 160, 40) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 20, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
// 11. WOODCUTTING  (Forest terrain — resource collection)
// ══════════════════════════════════════════════════════════
class WoodcuttingMinigame extends MinigameBase {
  start() {
    this.chops = this.config.chops || 6;
    this.currentChop = 0;
    this.goodChops = 0;
    this.timeLimit = (this.config.timeLimit || 22) * 1000;

    // Power meter: fills up, release at the right zone
    this.power = 0;          // 0–1
    this.powerDir = 1;
    this.powerSpeed = 1.2;
    this.sweetMin = 0.6;
    this.sweetMax = 0.85;
    this.chopState = 'charging'; // charging | result
    this._flashTimer = 0;

    // Tree health
    this.treeHP = 1.0; // 1 = full, 0 = felled
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) { this._finish(); return; }

    if (this.chopState === 'charging') {
      this.power += this.powerDir * this.powerSpeed * (dt / 1000);
      if (this.power >= 1) { this.power = 1; this.powerDir = -1; }
      if (this.power <= 0) { this.power = 0; this.powerDir = 1; }
    } else {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this.currentChop++;
        if (this.currentChop >= this.chops || this.treeHP <= 0) { this._finish(); return; }
        this.chopState = 'charging';
        this.powerSpeed = 1.2 + this.currentChop * 0.15;
        // Shift sweet spot slightly each chop
        this.sweetMin = 0.55 + Math.random() * 0.1;
        this.sweetMax = this.sweetMin + 0.2 + Math.random() * 0.05;
      }
    }
  }

  handleKeyInput(e) {
    if (this._done || this.chopState !== 'charging') return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); this._chop(); }
  }
  handleClickInput() { if (!this._done && this.chopState === 'charging') this._chop(); }

  _chop() {
    const inSweet = this.power >= this.sweetMin && this.power <= this.sweetMax;
    if (inSweet) {
      this.goodChops++;
      const strength = 0.15 + (this.power - this.sweetMin) / (this.sweetMax - this.sweetMin) * 0.1;
      this.treeHP = Math.max(0, this.treeHP - strength);
    } else {
      this.treeHP = Math.max(0, this.treeHP - 0.05);
    }
    this.chopState = 'result';
    this._flashTimer = 400;
  }

  _finish() {
    this._result = {
      success: this.goodChops > 0,
      goodChops: this.goodChops,
      total: this.chops,
      treeHP: this.treeHP,
      felled: this.treeHP <= 0,
      resourceType: 'woodcutting',
    };
    this._done = true;
  }

  _buildForfeitResult() {
    return { success: this.goodChops > 0, goodChops: this.goodChops, total: this.chops, treeHP: this.treeHP, felled: this.treeHP <= 0, resourceType: 'woodcutting', forfeited: true };
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(420, 300, '🪓 Woodcutting');
    push(); resetMatrix();

    const cx = p.x + p.w / 2;

    // Tree visualization
    const treeY = p.y + 80;
    const treeH = 100;
    // Trunk
    fill(110, 70, 30); noStroke();
    rect(cx - 12, treeY + 30, 24, treeH - 30, 3);
    // Canopy (shrinks as tree loses HP)
    const canopyScale = Math.max(0.1, this.treeHP);
    fill(40, 120 * canopyScale, 30);
    ellipse(cx, treeY + 20, 80 * canopyScale, 60 * canopyScale);
    // Cut marks
    if (this.treeHP < 0.7) {
      stroke(90, 50, 20); strokeWeight(2);
      const cuts = Math.floor((1 - this.treeHP) * 5);
      for (let i = 0; i < cuts; i++) {
        const cy = treeY + 50 + i * 12;
        line(cx - 14, cy, cx - 4, cy + 6);
      }
    }

    // Power meter (vertical bar on right)
    const meterX = p.x + p.w - 60;
    const meterY = p.y + 70;
    const meterH = 160;
    const meterW = 24;

    fill(50, 50, 60); stroke(80); strokeWeight(1);
    rect(meterX, meterY, meterW, meterH, 4);

    // Sweet zone
    const ssTop = meterY + meterH - this.sweetMax * meterH;
    const ssH = (this.sweetMax - this.sweetMin) * meterH;
    noStroke(); fill(60, 160, 60, 130);
    rect(meterX, ssTop, meterW, ssH, 4);

    // Power indicator
    if (this.chopState === 'charging') {
      const indY = meterY + meterH - this.power * meterH;
      stroke(255, 220, 50); strokeWeight(3);
      line(meterX - 4, indY, meterX + meterW + 4, indY);
    }

    // Result flash
    noStroke(); textAlign(CENTER, CENTER); textSize(16);
    if (this.chopState === 'result') {
      const wasGood = this.power >= this.sweetMin && this.power <= this.sweetMax;
      fill(wasGood ? color(100, 255, 100) : color(255, 80, 80));
      text(wasGood ? '🪓 CHOP!' : '✗ Weak hit', cx, p.y + 60);
    }

    // Tree HP bar
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(12);
    text('Tree HP', cx - 40, p.y + p.h - 65);
    fill(50); rect(p.x + 40, p.y + p.h - 50, 140, 8, 3);
    fill(60, 140, 40); rect(p.x + 40, p.y + p.h - 50, 140 * this.treeHP, 8, 3);

    // Score
    fill(200); textSize(13); textAlign(CENTER, TOP);
    text(`Good chops: ${this.goodChops}  |  Chop ${Math.min(this.currentChop + 1, this.chops)}/${this.chops}`, cx, p.y + p.h - 36);

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); rect(p.x + 20, p.y + p.h - 20, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(40, 120, 40) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 20, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ══════════════════════════════════════════════════════════
// 12. SAND DIGGING  (Sand terrain — resource collection)
// ══════════════════════════════════════════════════════════
class SandDigMinigame extends MinigameBase {
  start() {
    this.gridSize = this.config.gridSize || 5;
    this.timeLimit = (this.config.timeLimit || 20) * 1000;
    this.found = 0;
    this.totalHidden = this.config.totalHidden || 4;

    // Build grid: each cell is { dug, hasItem, itemType }
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        this.grid[r][c] = { dug: false, hasItem: false, itemType: null };
      }
    }
    // Place hidden items
    let placed = 0;
    while (placed < this.totalHidden) {
      const r = Math.floor(Math.random() * this.gridSize);
      const c = Math.floor(Math.random() * this.gridSize);
      if (!this.grid[r][c].hasItem) {
        this.grid[r][c].hasItem = true;
        this.grid[r][c].itemType = Math.random() < 0.3 ? 'gems' : 'clay';
        placed++;
      }
    }
    this._panelBounds = null;
    this._hoverR = -1;
    this._hoverC = -1;
  }

  update(dt) {
    super.update(dt);
    if (this._done) return;
    if (this._elapsed >= this.timeLimit) { this._finish(); return; }

    // Track hover
    if (this._panelBounds) {
      const p = this._panelBounds;
      const gridX = p.x + (p.w - this.gridSize * 44) / 2;
      const gridY = p.y + 60;
      if (typeof mouseX !== 'undefined') {
        this._hoverC = Math.floor((mouseX - gridX) / 44);
        this._hoverR = Math.floor((mouseY - gridY) / 44);
        if (this._hoverR < 0 || this._hoverR >= this.gridSize) this._hoverR = -1;
        if (this._hoverC < 0 || this._hoverC >= this.gridSize) this._hoverC = -1;
      }
    }
  }

  handleClickInput() {
    if (this._done || !this._panelBounds) return;
    const r = this._hoverR;
    const c = this._hoverC;
    if (r < 0 || c < 0 || r >= this.gridSize || c >= this.gridSize) return;
    const cell = this.grid[r][c];
    if (cell.dug) return;
    cell.dug = true;
    if (cell.hasItem) {
      this.found++;
      if (this.found >= this.totalHidden) { this._finish(); }
    }
  }

  handleKeyInput() {} // Click-only game

  _finish() {
    const gems = this.grid.flat().filter(c => c.dug && c.hasItem && c.itemType === 'gems').length;
    const clay = this.grid.flat().filter(c => c.dug && c.hasItem && c.itemType === 'clay').length;
    this._result = {
      success: this.found > 0,
      found: this.found,
      total: this.totalHidden,
      gems,
      clay,
      resourceType: 'digging',
    };
    this._done = true;
  }

  _buildForfeitResult() {
    return { success: this.found > 0, found: this.found, total: this.totalHidden, gems: 0, clay: 0, resourceType: 'digging', forfeited: true };
  }

  render() {
    this.drawOverlay(160);
    const p = this.drawPanel(Math.max(320, this.gridSize * 44 + 60), this.gridSize * 44 + 140, '⏳ Sand Digging');
    this._panelBounds = p;
    push(); resetMatrix();

    const cellSize = 40;
    const gap = 4;
    const gridW = this.gridSize * (cellSize + gap);
    const gridX = p.x + (p.w - gridW) / 2;
    const gridY = p.y + 60;

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const cell = this.grid[r][c];
        const cx = gridX + c * (cellSize + gap);
        const cy = gridY + r * (cellSize + gap);

        if (cell.dug) {
          fill(60, 50, 30);
          stroke(80, 70, 40); strokeWeight(1);
          rect(cx, cy, cellSize, cellSize, 4);
          if (cell.hasItem) {
            noStroke(); textAlign(CENTER, CENTER); textSize(18);
            text(cell.itemType === 'gems' ? '💎' : '🧱', cx + cellSize / 2, cy + cellSize / 2);
          }
        } else {
          const hover = r === this._hoverR && c === this._hoverC;
          fill(hover ? color(200, 180, 100) : color(180, 160, 80));
          stroke(140, 120, 60); strokeWeight(1);
          rect(cx, cy, cellSize, cellSize, 4);
          if (hover) {
            noStroke(); fill(255, 255, 255, 80);
            rect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 3);
          }
        }
      }
    }

    // Score
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(13);
    text(`Found: ${this.found}/${this.totalHidden}  —  Click tiles to dig!`, p.x + p.w / 2, p.y + p.h - 50);

    // Timer bar
    const timeRatio = Math.max(0, 1 - this._elapsed / this.timeLimit);
    fill(50); rect(p.x + 20, p.y + p.h - 22, p.w - 40, 6, 3);
    fill(timeRatio > 0.3 ? color(200, 180, 80) : color(255, 80, 80));
    rect(p.x + 20, p.y + p.h - 22, (p.w - 40) * timeRatio, 6, 3);

    pop();
  }
}

// ── Global instance ──
var minigameManager = null; // Initialized in startNewGame

(function exportMinigamesRuntime(root) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      MinigameManager,
      MinigameBase,
      HagglingMinigame,
      LockPickingMinigame,
      DicePokerMinigame,
      MemoryMatchMinigame,
      WheelOfFortuneMinigame,
      BluffMeterMinigame,
      NavigationDodgeMinigame,
      ShipRaceMinigame,
      FishingMinigame,
      MiningMinigame,
      HarvestMinigame,
      WoodcuttingMinigame,
      SandDigMinigame,
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
