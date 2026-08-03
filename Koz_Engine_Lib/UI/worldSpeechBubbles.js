(function initWorldSpeechBubblesLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorldSpeechBubblesApi() {
  class WorldSpeechBubbleManager {
    constructor(options = {}) {
      const opts = options || {};
      this.typeSpeed = Math.max(0.01, Number(opts.typeSpeed) || 0.024);
      this.holdTime = Math.max(0.4, Number(opts.holdTime) || 1.4);
      this.maxBubbles = Math.max(1, Number(opts.maxBubbles) || 6);
      this._nextId = 1;
      this._bubbles = [];
    }

    say(input = {}) {
      const bubble = {
        id: `bubble-${this._nextId++}`,
        anchor: input.anchor || null,
        speaker: String(input.speaker || ""),
        text: String(input.text || ""),
        visibleText: "",
        charIndex: 0,
        charTimer: 0,
        holdTimer: 0,
        typeSpeed: Math.max(0.01, Number(input.typeSpeed) || this.typeSpeed),
        holdTime: Math.max(0.4, Number(input.holdTime) || this.holdTime),
        offsetY: Number.isFinite(input.offsetY) ? Number(input.offsetY) : 48,
        tone: String(input.tone || "boss"),
      };
      if (!bubble.anchor || !bubble.text) return null;
      this._bubbles.push(bubble);
      while (this._bubbles.length > this.maxBubbles) this._bubbles.shift();
      return bubble.id;
    }

    update(dt) {
      const step = Math.max(0, Number(dt) || 0);
      for (let index = this._bubbles.length - 1; index >= 0; index -= 1) {
        const bubble = this._bubbles[index];
        const anchor = typeof bubble.anchor === "function" ? bubble.anchor() : bubble.anchor;
        if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
          this._bubbles.splice(index, 1);
          continue;
        }
        if (bubble.charIndex < bubble.text.length) {
          bubble.charTimer += step;
          while (bubble.charIndex < bubble.text.length && bubble.charTimer >= bubble.typeSpeed) {
            bubble.charTimer -= bubble.typeSpeed;
            bubble.charIndex += 1;
            bubble.visibleText = bubble.text.slice(0, bubble.charIndex);
          }
          continue;
        }
        bubble.holdTimer += step;
        if (bubble.holdTimer >= bubble.holdTime) {
          this._bubbles.splice(index, 1);
        }
      }
    }

    clear() {
      this._bubbles = [];
    }

    getActive() {
      return this._bubbles.map((bubble) => {
        const anchor = typeof bubble.anchor === "function" ? bubble.anchor() : bubble.anchor;
        return {
          id: bubble.id,
          anchor,
          speaker: bubble.speaker,
          text: bubble.text,
          visibleText: bubble.visibleText,
          offsetY: bubble.offsetY,
          tone: bubble.tone,
        };
      }).filter((bubble) => bubble.anchor && Number.isFinite(bubble.anchor.x) && Number.isFinite(bubble.anchor.y));
    }
  }

  return { WorldSpeechBubbleManager };
});
