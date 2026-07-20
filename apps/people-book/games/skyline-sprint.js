(() => {
  let running = false, frame = 0, removeListeners = () => {};
  PeopleArcade.boot({
    title: "Skyline Sprint",
    hint: "Run with A/D or ←/→ · Space jumps / wall-jumps · Shift dashes",
    instructions: "A fast, continuous side-scroller. There are no death pits: keep your speed, wall-jump up the towers, spring over hazards, and avoid spikes because they drain your momentum.",
    start({ canvas, ctx, getConfig, finish }) {
      running = true;
      const scoreEl = document.querySelector("#progress");
      const keys = new Set();
      let width = canvas.clientWidth, height = canvas.clientHeight;
      let groundY, worldWidth = 6400, finishX = 6150, solids = [], springs = [], spikes = [];
      const player = makeRacer("#67e8f9");
      const cpu = makeRacer("#f0abfc");
      const difficulty = getConfig().opponent.difficulty || .6;
      let cameraX = 0;

      function makeRacer(color) {
        return { x: 60, y: 0, w: 24, h: 32, vx: 0, vy: 0, grounded: false, wall: 0, dash: 0, dashReady: true, hazard: 0, color, aiJump: 0 };
      }
      function buildLevel() {
        groundY = height - 70;
        const block = (x, y, w, h) => ({ x, y: groundY - y - h, w, h });
        solids = [
          { x: 0, y: groundY, w: worldWidth + 400, h: 120 },
          block(360, 84, 150, 24), block(600, 155, 145, 24),
          block(930, 0, 42, 195), block(1110, 110, 165, 24),
          block(1420, 0, 48, 270), block(1570, 175, 138, 24),
          block(1830, 78, 120, 24), block(2050, 0, 50, 225),
          block(2180, 154, 172, 24), block(2520, 58, 125, 24),
          block(2740, 0, 46, 305), block(2895, 205, 130, 24),
          block(3220, 105, 154, 24), block(3490, 0, 48, 245),
          block(3645, 165, 180, 24), block(3990, 72, 120, 24),
          block(4210, 0, 47, 280), block(4380, 188, 150, 24),
          block(4690, 100, 135, 24), block(4940, 0, 46, 225),
          block(5105, 168, 155, 24), block(5420, 76, 140, 24),
          block(5680, 0, 50, 300), block(5845, 204, 215, 24),
        ];
        springs = [
          { x: 224, y: groundY - 16, w: 28, h: 16 }, { x: 760, y: groundY - 16, w: 28, h: 16 },
          { x: 1740, y: groundY - 16, w: 28, h: 16 }, { x: 2410, y: groundY - 16, w: 28, h: 16 },
          { x: 3328, y: groundY - 16, w: 28, h: 16 }, { x: 4560, y: groundY - 16, w: 28, h: 16 },
          { x: 5350, y: groundY - 16, w: 28, h: 16 },
        ];
        spikes = [
          { x: 790, y: groundY - 18, w: 95, h: 18 }, { x: 1300, y: groundY - 18, w: 80, h: 18 },
          { x: 1965, y: groundY - 18, w: 65, h: 18 }, { x: 3060, y: groundY - 18, w: 115, h: 18 },
          { x: 3860, y: groundY - 18, w: 92, h: 18 }, { x: 4770, y: groundY - 18, w: 105, h: 18 },
          { x: 5595, y: groundY - 18, w: 68, h: 18 },
        ];
      }
      function resetRacer(racer, offset) {
        Object.assign(racer, { x: 60 + offset, y: groundY - racer.h, vx: 0, vy: 0, grounded: true, wall: 0, dash: 0, dashReady: true, hazard: 0, aiJump: 0 });
      }
      function resize() { width = canvas.clientWidth; height = canvas.clientHeight; buildLevel(); resetRacer(player, 0); resetRacer(cpu, -34); }
      buildLevel(); resetRacer(player, 0); resetRacer(cpu, -34);

      function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
      function jump(racer) {
        if (racer.grounded) { racer.vy = -620; racer.grounded = false; racer.dashReady = true; return; }
        if (racer.wall) { racer.vy = -595; racer.vx = racer.wall * 455; racer.wall = 0; racer.dashReady = true; }
      }
      function dash(racer, direction) {
        if (!racer.dashReady) return;
        racer.dashReady = false; racer.dash = .15; racer.vx = direction * 860; racer.vy *= .24;
      }
      function moveRacer(racer, dt) {
        racer.wall = 0;
        const oldX = racer.x;
        racer.x += racer.vx * dt;
        for (const solid of solids) {
          if (!overlaps(racer, solid)) continue;
          if (racer.vx > 0 && oldX + racer.w <= solid.x + 6) { racer.x = solid.x - racer.w; racer.vx = 0; racer.wall = -1; }
          if (racer.vx < 0 && oldX >= solid.x + solid.w - 6) { racer.x = solid.x + solid.w; racer.vx = 0; racer.wall = 1; }
        }
        const oldY = racer.y;
        racer.vy += 1750 * dt;
        racer.y += racer.vy * dt;
        racer.grounded = false;
        for (const solid of solids) {
          if (!overlaps(racer, solid)) continue;
          if (racer.vy >= 0 && oldY + racer.h <= solid.y + 7) {
            racer.y = solid.y - racer.h; racer.vy = 0; racer.grounded = true; racer.dashReady = true;
          } else if (racer.vy < 0 && oldY >= solid.y + solid.h - 7) {
            racer.y = solid.y + solid.h; racer.vy = 0;
          }
        }
        for (const spring of springs) {
          if (overlaps(racer, spring) && racer.vy >= 0) { racer.y = spring.y - racer.h; racer.vy = -885; racer.grounded = false; racer.dashReady = true; }
        }
        racer.hazard = Math.max(0, racer.hazard - dt);
        for (const spike of spikes) {
          if (racer.hazard <= 0 && overlaps(racer, spike)) { racer.hazard = .6; racer.vx *= .34; racer.vy = Math.min(racer.vy, -265); }
        }
        racer.dash = Math.max(0, racer.dash - dt);
        // Preserve momentum. A sprint should feel fast on the ground, with
        // friction only taking the edge off instead of turning every run into
        // a stop-start walk between obstacles.
        racer.vx *= racer.dash > 0 ? Math.pow(.82, dt) : racer.grounded ? Math.pow(.16, dt) : Math.pow(.68, dt);
        racer.x = Math.max(0, racer.x);
      }
      function updatePlayer(dt) {
        const left = keys.has("ArrowLeft") || keys.has("KeyA"), right = keys.has("ArrowRight") || keys.has("KeyD");
        // The runner has a strong forward cruise by default. Right boosts the
        // pace, while left is the only control that can meaningfully brake.
        if (left) player.vx -= 5100 * dt;
        else player.vx += (right ? 5600 : 3500) * dt;
        if (!left) player.vx = Math.max(player.vx, right ? 1120 : 840);
        player.vx = Math.max(-620, Math.min(right ? 1450 : 1200, player.vx));
        moveRacer(player, dt);
      }
      function obstacleAhead(racer) {
        return solids.find((solid) => solid.x > racer.x + racer.w && solid.x < racer.x + 64 && solid.y < racer.y + racer.h - 9 && solid.y + solid.h > racer.y + 10);
      }
      function updateCpu(dt) {
        const topSpeed = 820 + difficulty * 280;
        cpu.vx += (topSpeed - cpu.vx) * Math.min(1, dt * 5.5);
        const obstacle = obstacleAhead(cpu);
        cpu.aiJump -= dt;
        if ((cpu.grounded && (obstacle || spikes.some((spike) => spike.x > cpu.x && spike.x < cpu.x + 80))) || (cpu.wall && cpu.aiJump <= 0)) {
          jump(cpu); cpu.aiJump = .16;
        }
        if (cpu.dashReady && !cpu.grounded && Math.random() < dt * (.18 + difficulty * .42)) dash(cpu, 1);
        moveRacer(cpu, dt);
      }
      function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#150d39"); sky.addColorStop(.58, "#3a175b"); sky.addColorStop(1, "#f35b75"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(width * .78, height * .19, 34, 0, Math.PI * 2); ctx.fill();
        const layers = [{ factor: .12, color: "#241348", base: .69, size: 180 }, { factor: .26, color: "#1b1b4c", base: .81, size: 105 }, { factor: .46, color: "#16213e", base: .93, size: 68 }];
        layers.forEach((layer) => {
          const offset = -((cameraX * layer.factor) % layer.size) - layer.size;
          ctx.fillStyle = layer.color;
          for (let x = offset, i = 0; x < width + layer.size; x += layer.size, i++) {
            const building = layer.size * (.6 + ((i * 19) % 31) / 100);
            const buildingH = height * (.1 + ((i * 31) % 17) / 100);
            ctx.fillRect(x, height * layer.base - buildingH, building, buildingH + height * (1 - layer.base));
            ctx.fillStyle = "rgba(255,224,150,.16)";
            for (let wx = x + 12; wx < x + building - 7; wx += 18) for (let wy = height * layer.base - buildingH + 13; wy < height * layer.base - 8; wy += 23) ctx.fillRect(wx, wy, 5, 8);
            ctx.fillStyle = layer.color;
          }
        });
      }
      function drawSolid(solid) {
        const x = solid.x - cameraX;
        if (x + solid.w < -20 || x > width + 20) return;
        ctx.fillStyle = solid.y === groundY ? "#15213e" : "#263b6d"; ctx.fillRect(x, solid.y, solid.w, solid.h);
        ctx.fillStyle = solid.y === groundY ? "#3c5f8f" : "#6ee7f7"; ctx.fillRect(x, solid.y, solid.w, 5);
        if (solid.y !== groundY) { ctx.fillStyle = "rgba(255,255,255,.1)"; for (let px = x + 8; px < x + solid.w; px += 19) ctx.fillRect(px, solid.y + 11, 8, 4); }
      }
      function drawRacer(racer, label) {
        const x = racer.x - cameraX, y = racer.y;
        if (racer.dash > 0) { ctx.fillStyle = racer.color; ctx.globalAlpha = .23; ctx.fillRect(x - 46, y + 6, 42, 18); ctx.globalAlpha = 1; }
        ctx.fillStyle = racer.hazard > 0 ? "#fb7185" : racer.color; ctx.shadowColor = racer.color; ctx.shadowBlur = racer.dash > 0 ? 24 : 8;
        ctx.fillRect(x, y, racer.w, racer.h); ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(x + 15, y + 8, 5, 5);
        ctx.fillStyle = "white"; ctx.font = "800 9px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, x + racer.w / 2, y - 8);
      }
      function draw() {
        drawBackground();
        solids.forEach(drawSolid);
        springs.forEach((spring) => { const x = spring.x - cameraX; if (x > -30 && x < width + 30) { ctx.fillStyle = "#facc15"; ctx.fillRect(x, spring.y + 8, spring.w, 8); ctx.strokeStyle = "#fff7ae"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 3, spring.y + 8); ctx.lineTo(x + 9, spring.y + 2); ctx.lineTo(x + 16, spring.y + 8); ctx.lineTo(x + 23, spring.y + 2); ctx.lineTo(x + 27, spring.y + 8); ctx.stroke(); } });
        spikes.forEach((spike) => { const x = spike.x - cameraX; if (x > -spike.w && x < width) { ctx.fillStyle = "#fb7185"; for (let px = x; px < x + spike.w; px += 12) { ctx.beginPath(); ctx.moveTo(px, spike.y + spike.h); ctx.lineTo(px + 6, spike.y); ctx.lineTo(px + 12, spike.y + spike.h); ctx.fill(); } } });
        const finishScreenX = finishX - cameraX;
        if (finishScreenX > -80 && finishScreenX < width + 80) { ctx.fillStyle = "#f8fafc"; ctx.fillRect(finishScreenX, groundY - 170, 6, 170); ctx.fillStyle = "#f43f5e"; ctx.fillRect(finishScreenX + 6, groundY - 170, 64, 36); ctx.fillStyle = "#fde68a"; ctx.font = "900 11px system-ui"; ctx.fillText("FINISH", finishScreenX + 37, groundY - 147); }
        drawRacer(player, "YOU"); drawRacer(cpu, getConfig().opponent.name.slice(0, 7));
        ctx.fillStyle = "rgba(6,8,20,.45)"; ctx.fillRect(12, 13, width - 24, 6); ctx.fillStyle = "#67e8f9"; ctx.fillRect(12, 13, (width - 24) * Math.min(1, player.x / finishX), 6); ctx.fillStyle = "#f0abfc"; ctx.fillRect(12 + (width - 24) * Math.min(1, cpu.x / finishX), 10, 6, 6);
      }
      function complete(won) {
        running = false;
        finish(won, won ? "You crossed the whole skyline first." : `${getConfig().opponent.name} reached the finish banner first.`);
      }
      function press(event) {
        if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "ShiftLeft", "ShiftRight"].includes(event.code)) event.preventDefault();
        if (keys.has(event.code)) return;
        keys.add(event.code);
        if (event.code === "Space") jump(player);
        if (event.code === "ShiftLeft" || event.code === "ShiftRight") dash(player, (keys.has("ArrowLeft") || keys.has("KeyA")) ? -1 : 1);
      }
      function release(event) { keys.delete(event.code); }
      window.addEventListener("resize", resize); window.addEventListener("keydown", press); window.addEventListener("keyup", release);
      removeListeners = () => { window.removeEventListener("resize", resize); window.removeEventListener("keydown", press); window.removeEventListener("keyup", release); };
      let previous = performance.now();
      function loop(now) {
        if (!running) return;
        const dt = Math.min(.025, (now - previous) / 1000); previous = now;
        updatePlayer(dt); updateCpu(dt);
        cameraX += ((player.x - width * .36) - cameraX) * Math.min(1, dt * 5.5);
        cameraX = Math.max(0, Math.min(worldWidth - width, cameraX));
        scoreEl.textContent = `${Math.floor(Math.min(100, player.x / finishX * 100))}%`;
        if (player.x >= finishX || cpu.x >= finishX) complete(player.x >= finishX && player.x >= cpu.x);
        draw(); frame = requestAnimationFrame(loop);
      }
      frame = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(frame); removeListeners(); },
  });
})();
