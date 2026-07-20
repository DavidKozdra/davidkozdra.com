(() => {
  function boot(options) {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const arena = document.querySelector(".arena");
    const title = document.querySelector(".hud-title");
    const opponent = document.querySelector(".hud-opponent");
    const startLayer = document.querySelector(".start-layer");
    const resultLayer = document.querySelector(".result-layer");
    let config = { opponent: { name: "Opponent", difficulty: .6 } };
    let started = false;
    let finished = false;

    function resize() {
      const rect = arena.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      options.resize?.(rect.width, rect.height);
    }
    window.addEventListener("resize", resize);
    resize();

    function finish(playerWon, detail) {
      if (finished) return;
      finished = true;
      options.stop?.();
      resultLayer.innerHTML = `<div class="panel"><h1>${playerWon ? "You win!" : "Match lost"}</h1><p>${detail || (playerWon ? "A clean finish." : "Your opponent takes this round.")}</p><button id="leaveMatch">Return to People Book</button></div>`;
      resultLayer.classList.remove("hidden");
      document.querySelector("#leaveMatch").addEventListener("click", () => parent.postMessage({ type: "people-book:leave-game" }, "*"));
      parent.postMessage({ type: "people-book:game-result", playerWon }, "*");
    }

    function start() {
      if (started) return;
      started = true;
      startLayer.classList.add("hidden");
      options.start({ canvas, ctx, getConfig: () => config, finish, resize });
    }

    title.textContent = options.title;
    document.querySelector(".hint").textContent = options.hint;
    startLayer.innerHTML = `<div class="panel"><h1>${options.title}</h1><p>${options.instructions}</p>${options.beforeStart || ""}<button id="startGame">Start match</button></div>`;
    document.querySelector("#startGame").addEventListener("click", start);
    window.addEventListener("message", (event) => {
      const message = event.data;
      if (!message || !message.type) return;
      if (message.type === "people-book:match-config") {
        config = message;
        opponent.textContent = `VS ${config.opponent.name}`;
      }
      if (message.type === "people-book:stop") options.stop?.();
    });
    parent.postMessage({ type: "people-book:game-ready" }, "*");
  }
  window.PeopleArcade = { boot };
})();
