(function initCharacterControllerLib(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCharacterControllerApi() {
  "use strict";

  const DEFAULT_BINDINGS = Object.freeze({
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
  });

  function clampAxis(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(-1, Math.min(1, number)) : 0;
  }

  function normalizeCharacterInput(x, y, deadzone = 0.16) {
    const axisX = clampAxis(x);
    const axisY = clampAxis(y);
    const length = Math.hypot(axisX, axisY);
    const threshold = Math.max(0, Math.min(0.95, Number(deadzone) || 0));
    if (length <= threshold) return { x: 0, y: 0, active: false, magnitude: 0 };
    const magnitude = Math.min(1, (length - threshold) / Math.max(0.05, 1 - threshold));
    return { x: axisX / length * magnitude, y: axisY / length * magnitude, active: true, magnitude };
  }

  function normalizedBindings(bindings = {}) {
    return Object.fromEntries(Object.keys(DEFAULT_BINDINGS).map((action) => {
      const values = Array.isArray(bindings[action]) ? bindings[action] : DEFAULT_BINDINGS[action];
      return [action, values.map(String)];
    }));
  }

  class CharacterController {
    constructor({ bindings, deadzone = 0.16, eventTarget = null, navigatorApi = null, gamepadIndex = 0 } = {}) {
      this.bindings = normalizedBindings(bindings);
      this.deadzone = deadzone;
      this.navigatorApi = navigatorApi;
      this.gamepadIndex = Math.max(0, Math.floor(Number(gamepadIndex) || 0));
      this.keys = new Set();
      this.target = null;
      this._keydown = (event) => this.setKey(event?.code, true);
      this._keyup = (event) => this.setKey(event?.code, false);
      this._blur = () => this.clear();
      if (eventTarget) this.attach(eventTarget);
    }

    attach(target) {
      this.detach();
      if (!target?.addEventListener) return false;
      this.target = target;
      target.addEventListener("keydown", this._keydown);
      target.addEventListener("keyup", this._keyup);
      target.addEventListener("blur", this._blur);
      return true;
    }

    detach() {
      if (!this.target) return;
      this.target.removeEventListener?.("keydown", this._keydown);
      this.target.removeEventListener?.("keyup", this._keyup);
      this.target.removeEventListener?.("blur", this._blur);
      this.target = null;
      this.clear();
    }

    setKey(code, pressed) {
      const key = String(code || "");
      if (!Object.values(this.bindings).some((codes) => codes.includes(key))) return false;
      if (pressed) this.keys.add(key);
      else this.keys.delete(key);
      return true;
    }

    clear() { this.keys.clear(); }

    keyboardVector() {
      const held = (action) => this.bindings[action].some((code) => this.keys.has(code));
      return normalizeCharacterInput(Number(held("right")) - Number(held("left")), Number(held("down")) - Number(held("up")), 0);
    }

    gamepadVector() {
      let pads = [];
      try { pads = this.navigatorApi?.getGamepads?.() || []; } catch { return normalizeCharacterInput(0, 0); }
      const pad = pads[this.gamepadIndex];
      return normalizeCharacterInput(pad?.axes?.[0], pad?.axes?.[1], this.deadzone);
    }

    sample() {
      const keyboard = this.keyboardVector();
      return keyboard.active ? keyboard : this.gamepadVector();
    }
  }

  return { CharacterController, DEFAULT_CHARACTER_BINDINGS: DEFAULT_BINDINGS, normalizeCharacterInput };
});
