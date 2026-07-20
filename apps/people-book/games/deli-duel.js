(() => {
  let running = false, frame = 0, removeListeners = () => {}, cpuTimer = null;
  PeopleArcade.boot({
    title: "Deli Duel",
    hint: "Click a tile on the rival's board to launch a condiment strike",
    instructions: "Your fleet is one hot dog, one sub, and one burger. Find every sandwich on the rival's board before they find yours. Hit a sandwich and you keep the turn.",
    start({ canvas, ctx, getConfig, finish }) {
      running = true;
      const turnEl = document.querySelector("#turn");
      const size = 6;
      let width = canvas.clientWidth, height = canvas.clientHeight;
      let playerBoard, enemyBoard, playerTurn = true, layout;
      const difficulty = getConfig().opponent.difficulty || .6;
      const cpuTargets = [];
      const key = (x, y) => `${x},${y}`;

      function makeBoard() { return { fleet: placeFleet(), shots: new Set(), flash: [] }; }
      function placeFleet() {
        const specs = [{ type: "hotdog", length: 3 }, { type: "sub", length: 2 }, { type: "burger", length: 1 }];
        const used = new Set();
        return specs.map((spec) => {
          let cells;
          do {
            const horizontal = spec.length === 1 || Math.random() < .5;
            const x = Math.floor(Math.random() * (horizontal ? size - spec.length + 1 : size));
            const y = Math.floor(Math.random() * (horizontal ? size : size - spec.length + 1));
            cells = Array.from({ length: spec.length }, (_, index) => ({ x: x + (horizontal ? index : 0), y: y + (horizontal ? 0 : index) }));
          } while (cells.some((cell) => used.has(key(cell.x, cell.y))));
          cells.forEach((cell) => used.add(key(cell.x, cell.y)));
          return { ...spec, cells, hits: new Set() };
        });
      }
      function getShip(board, x, y) { return board.fleet.find((ship) => ship.cells.some((cell) => cell.x === x && cell.y === y)); }
      function allSunk(board) { return board.fleet.every((ship) => ship.hits.size === ship.length); }
      function fire(board, x, y) {
        const shot = key(x, y);
        if (board.shots.has(shot)) return null;
        board.shots.add(shot);
        const ship = getShip(board, x, y);
        const hit = !!ship;
        if (ship) ship.hits.add(shot);
        board.flash.push({ x, y, hit, life: .42 });
        return { hit, sunk: !!ship && ship.hits.size === ship.length, type: ship?.type };
      }
      function updateLayout() {
        width = canvas.clientWidth; height = canvas.clientHeight;
        const cell = Math.floor(Math.min((width - 54) / 12, (height - 78) / 6));
        const boardWidth = cell * size;
        layout = { cell, y: Math.max(42, Math.floor((height - boardWidth) / 2) + 15), left: 16, right: width - boardWidth - 16 };
      }
      function reset() { playerBoard = makeBoard(); enemyBoard = makeBoard(); playerTurn = true; updateTurn(); }
      function updateTurn(text) { turnEl.textContent = text || (playerTurn ? "YOUR TURN" : `${getConfig().opponent.name.toUpperCase()} THINKING…`); }
      function drawFood(type, x, y, cell, hit) {
        const inset = Math.max(3, cell * .14), w = cell - inset * 2, h = cell - inset * 2;
        ctx.save(); ctx.translate(x + inset, y + inset); ctx.globalAlpha = hit ? 1 : .78;
        if (type === "hotdog") { ctx.fillStyle = "#fbbf24"; ctx.fillRect(0, h * .27, w, h * .46); ctx.fillStyle = "#dc2626"; ctx.fillRect(w * .08, h * .4, w * .84, h * .2); }
        if (type === "sub") { ctx.fillStyle = "#f59e0b"; ctx.fillRect(0, h * .26, w, h * .48); ctx.fillStyle = "#34d399"; ctx.fillRect(w * .08, h * .42, w * .84, h * .12); }
        if (type === "burger") { ctx.fillStyle = "#f59e0b"; ctx.fillRect(w * .08, h * .12, w * .84, h * .28); ctx.fillStyle = "#78350f"; ctx.fillRect(w * .12, h * .42, w * .76, h * .2); ctx.fillStyle = "#fbbf24"; ctx.fillRect(w * .08, h * .64, w * .84, h * .18); }
        ctx.restore();
      }
      function drawBoard(board, x, reveal, label) {
        const { cell, y } = layout;
        ctx.fillStyle = "#e2e8f0"; ctx.font = "800 11px system-ui"; ctx.textAlign = "left"; ctx.fillText(label, x, y - 12);
        for (let gy = 0; gy < size; gy++) for (let gx = 0; gx < size; gx++) {
          const px = x + gx * cell, py = y + gy * cell, shot = board.shots.has(key(gx, gy)), ship = getShip(board, gx, gy);
          ctx.fillStyle = shot && ship ? "#7f1d1d" : shot ? "#1e3a8a" : "#172554";
          ctx.fillRect(px, py, cell - 2, cell - 2);
          if (ship && (reveal || shot)) drawFood(ship.type, px, py, cell, shot);
          if (shot) { ctx.strokeStyle = ship ? "#fef08a" : "#93c5fd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 6, py + 6); ctx.lineTo(px + cell - 8, py + cell - 8); ctx.moveTo(px + cell - 8, py + 6); ctx.lineTo(px + 6, py + cell - 8); ctx.stroke(); }
        }
        board.flash.forEach((flash) => { const px = x + flash.x * cell + cell / 2, py = y + flash.y * cell + cell / 2; ctx.globalAlpha = flash.life / .42; ctx.fillStyle = flash.hit ? "#fef08a" : "#93c5fd"; ctx.beginPath(); ctx.arc(px, py, cell * (.2 + (1 - flash.life / .42) * .34), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        const background = ctx.createLinearGradient(0, 0, width, height); background.addColorStop(0, "#4c1d15"); background.addColorStop(.5, "#7c2d12"); background.addColorStop(1, "#1f2937"); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
        for (let x = -30; x < width + 50; x += 38) { ctx.strokeStyle = "rgba(254,215,170,.08)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 110, height); ctx.stroke(); }
        drawBoard(playerBoard, layout.left, true, "YOUR DELI"); drawBoard(enemyBoard, layout.right, false, "RIVAL DELI");
      }
      function chooseCpuShot() {
        if (cpuTargets.length && Math.random() < .35 + difficulty * .55) return cpuTargets.shift();
        const choices = [];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!playerBoard.shots.has(key(x, y))) choices.push({ x, y });
        return choices[Math.floor(Math.random() * choices.length)];
      }
      function addNeighbors(x, y) {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { const target = { x: x + dx, y: y + dy }; if (target.x >= 0 && target.x < size && target.y >= 0 && target.y < size && !playerBoard.shots.has(key(target.x, target.y)) && !cpuTargets.some((item) => item.x === target.x && item.y === target.y)) cpuTargets.push(target); });
      }
      function cpuMove() {
        if (!running) return;
        const target = chooseCpuShot();
        if (!target) return;
        const result = fire(playerBoard, target.x, target.y);
        if (result?.hit) addNeighbors(target.x, target.y);
        if (allSunk(playerBoard)) { running = false; finish(false, `${getConfig().opponent.name} cleared your deli first.`); return; }
        playerTurn = true;
        updateTurn(result?.hit ? "THEY HIT — YOUR TURN" : "YOUR TURN");
      }
      function playerMove(event) {
        if (!playerTurn || !running) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const gx = Math.floor((x - layout.right) / layout.cell), gy = Math.floor((y - layout.y) / layout.cell);
        if (gx < 0 || gx >= size || gy < 0 || gy >= size) return;
        const result = fire(enemyBoard, gx, gy);
        if (!result) return;
        if (allSunk(enemyBoard)) { running = false; finish(true, "You found every sandwich before your rival could." ); return; }
        if (result.hit) { updateTurn(result.sunk ? `SUNK ${result.type.toUpperCase()} — GO AGAIN` : "HIT — GO AGAIN"); return; }
        playerTurn = false; updateTurn();
        cpuTimer = setTimeout(cpuMove, 420 + Math.floor(Math.random() * 500));
      }
      function tick() {
        if (!running) return;
        [playerBoard, enemyBoard].forEach((board) => { for (let i = board.flash.length - 1; i >= 0; i--) { board.flash[i].life -= .016; if (board.flash[i].life <= 0) board.flash.splice(i, 1); } });
        draw(); frame = requestAnimationFrame(tick);
      }
      function resize() { updateLayout(); }
      window.addEventListener("resize", resize); canvas.addEventListener("pointerdown", playerMove);
      removeListeners = () => { window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", playerMove); if (cpuTimer) clearTimeout(cpuTimer); };
      updateLayout(); reset(); frame = requestAnimationFrame(tick);
    },
    stop() { running = false; cancelAnimationFrame(frame); removeListeners(); },
  });
})();
