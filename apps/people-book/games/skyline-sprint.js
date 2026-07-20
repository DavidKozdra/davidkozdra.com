(() => {
  let running = false, frame = 0, removeListeners = () => {};
  PeopleArcade.boot({
    title: "Skyline Sprint",
    hint: "Move with A/D or ←/→ · jump with Space · dash with Shift",
    instructions: "This is a real rooftop platform race: clear the gaps, use your double jump when you need it, and tap Shift for a mid-air dash. Reach the beacon twice before your rival.",
    start({ canvas, ctx, getConfig, finish }) {
      running = true;
      const scoreEl = document.querySelector("#progress");
      const keys = new Set();
      let width = canvas.clientWidth, height = canvas.clientHeight;
      let level = 0, playerRounds = 0, cpuRounds = 0, finishLock = 0;
      const player = { x: 0, y: 0, vx: 0, vy: 0, grounded: false, jumps: 0, dash: 0, dashReady: true, color: "#67e8f9" };
      const cpu = { x: 0, y: 0, vx: 0, vy: 0, grounded: false, jumps: 0, target: 1, color: "#f0abfc" };
      const difficulty = getConfig().opponent.difficulty || .6;
      let platforms = [];
      let beacon = null;

      function buildLevel() {
        const y = (fraction) => Math.round(height * fraction);
        const w = (fraction) => Math.round(width * fraction);
        // A deliberately readable route: each platform is a real collision surface,
        // with two optional shortcuts that reward accurate double-jumps/dashes.
        platforms = [
          { x: w(.03), y: y(.83), w: w(.18), h: 18 },
          { x: w(.26), y: y(.69), w: w(.13), h: 18 },
          { x: w(.45), y: y(.53), w: w(.15), h: 18 },
          { x: w(.65), y: y(.72), w: w(.14), h: 18 },
          { x: w(.84), y: y(.46), w: w(.13), h: 18 },
          { x: w(.34), y: y(.38), w: w(.12), h: 14, shortcut: true },
          { x: w(.68), y: y(.34), w: w(.11), h: 14, shortcut: true },
        ];
        beacon = { x: width - w(.09), y: platforms[4].y - 62, w: 18, h: 62 };
      }
      function resetRacers() {
        const start = platforms[0];
        Object.assign(player, { x: start.x + 24, y: start.y - 19, vx: 0, vy: 0, grounded: false, jumps: 0, dash: 0, dashReady: true });
        Object.assign(cpu, { x: start.x + 43, y: start.y - 19, vx: 0, vy: 0, grounded: false, jumps: 0, target: 1 });
      }
      function resize() { width = canvas.clientWidth; height = canvas.clientHeight; buildLevel(); resetRacers(); }
      buildLevel(); resetRacers();

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

      function jump(racer) {
        if (racer.jumps >= 2) return;
        racer.vy = racer.jumps === 0 ? -470 : -405;
        racer.jumps++;
        racer.grounded = false;
      }
      function dash(racer, direction) {
        if (!racer.dashReady) return;
        racer.vx = direction * 530;
        racer.dash = .17;
        racer.dashReady = false;
      }
      function physics(racer, dt) {
        const oldY = racer.y;
        racer.vy += 1180 * dt;
        racer.x += racer.vx * dt;
        racer.y += racer.vy * dt;
        racer.vx *= racer.dash > 0 ? .985 : .79;
        racer.dash = Math.max(0, racer.dash - dt);
        racer.grounded = false;
        for (const platform of platforms) {
          const insideX = racer.x + 12 > platform.x && racer.x - 12 < platform.x + platform.w;
          const fellOnto = oldY + 17 <= platform.y && racer.y + 17 >= platform.y && racer.vy >= 0;
          if (insideX && fellOnto) {
            racer.y = platform.y - 17;
            racer.vy = 0;
            racer.grounded = true;
            racer.jumps = 0;
            racer.dashReady = true;
          }
        }
        if (racer.y > height + 44 || racer.x < -40 || racer.x > width + 42) resetRacer(racer);
      }
      function resetRacer(racer) {
        const start = platforms[0];
        racer.x = start.x + (racer === player ? 24 : 43);
        racer.y = start.y - 19; racer.vx = 0; racer.vy = 0; racer.jumps = 0; racer.dashReady = true;
        if (racer === cpu) racer.target = 1;
      }
      function updatePlayer(dt) {
        const left = keys.has("ArrowLeft") || keys.has("KeyA"), right = keys.has("ArrowRight") || keys.has("KeyD");
        if (left !== right) player.vx += (right ? 1 : -1) * 870 * dt;
        player.vx = Math.max(-255, Math.min(255, player.vx));
        physics(player, dt);
      }
      function updateCpu(dt) {
        const target = platforms[Math.min(cpu.target, platforms.length - 1)];
        const targetX = target.x + target.w * .55;
        const direction = Math.sign(targetX - cpu.x);
        cpu.vx += direction * (560 + difficulty * 380) * dt;
        cpu.vx = Math.max(-200, Math.min(220 + difficulty * 70, cpu.vx));
        const launchPad = platforms[Math.max(0, cpu.target - 1)];
        const next = platforms[Math.min(cpu.target + 1, 4)];
        const nearLaunchEdge = direction > 0 && cpu.x > launchPad.x + launchPad.w - 29;
        if (cpu.grounded && (nearLaunchEdge || (next && next.y < target.y - 34 && Math.abs(cpu.x - targetX) < 38))) jump(cpu);
        if (cpu.grounded && Math.abs(cpu.x - targetX) < 30 && cpu.target < 4) cpu.target++;
        if (cpu.dashReady && cpu.target >= 2 && Math.random() < dt * difficulty * .8) dash(cpu, direction || 1);
        physics(cpu, dt);
      }
      function drawPlatform(platform) {
        ctx.fillStyle = platform.shortcut ? "#4338ca" : "#1d4ed8";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = platform.shortcut ? "#f0abfc" : "#67e8f9";
        ctx.fillRect(platform.x, platform.y, platform.w, 4);
        ctx.fillStyle = "rgba(255,255,255,.08)";
        for (let x = platform.x + 9; x < platform.x + platform.w; x += 18) ctx.fillRect(x, platform.y + 8, 7, 3);
      }
      function drawRacer(racer, label) {
        ctx.fillStyle = racer.color; ctx.shadowColor = racer.color; ctx.shadowBlur = racer.dash > 0 ? 28 : 11;
        ctx.beginPath(); ctx.arc(racer.x, racer.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "white"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, racer.x, racer.y - 26);
        if (racer.dash > 0) { ctx.strokeStyle = racer.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(racer.x - Math.sign(racer.vx || 1) * 38, racer.y); ctx.lineTo(racer.x - Math.sign(racer.vx || 1) * 16, racer.y); ctx.stroke(); }
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#111b46"); sky.addColorStop(.55, "#172554"); sky.addColorStop(1, "#070b1d"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(253,224,71,.75)"; ctx.beginPath(); ctx.arc(width * .8, height * .17, 28, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 13; i++) { const x = i * 43 - 10, h = 45 + (i * 31) % 92; ctx.fillStyle = i % 2 ? "#101a35" : "#0c1530"; ctx.fillRect(x, height - h, 37, h); ctx.fillStyle = "rgba(103,232,249,.16)"; ctx.fillRect(x + 8, height - h + 13, 5, 7); }
        platforms.forEach(drawPlatform);
        ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(beacon.x, beacon.y); ctx.lineTo(beacon.x, beacon.y + beacon.h); ctx.stroke(); ctx.fillStyle = "#f43f5e"; ctx.beginPath(); ctx.moveTo(beacon.x, beacon.y); ctx.lineTo(beacon.x + 28, beacon.y + 10); ctx.lineTo(beacon.x, beacon.y + 20); ctx.fill();
        drawRacer(player, "YOU"); drawRacer(cpu, getConfig().opponent.name.slice(0, 7));
      }
      function score(racer) {
        if (finishLock > 0) return;
        finishLock = .8;
        if (racer === player) playerRounds++; else cpuRounds++;
        scoreEl.textContent = `${playerRounds} / 2`;
        if (playerRounds >= 2 || cpuRounds >= 2) {
          running = false;
          finish(playerRounds >= 2, playerRounds >= 2 ? "Two beacon captures. You owned the rooftops." : `${getConfig().opponent.name} won the rooftop race.`);
          return;
        }
        level++;
        setTimeout(resetRacers, 650);
      }
      let previous = performance.now();
      function loop(now) {
        if (!running) return;
        const dt = Math.min(.032, (now - previous) / 1000); previous = now;
        finishLock = Math.max(0, finishLock - dt);
        updatePlayer(dt); updateCpu(dt);
        if (player.x + 14 > beacon.x && player.y + 18 > beacon.y && player.y < beacon.y + beacon.h) score(player);
        if (cpu.x + 14 > beacon.x && cpu.y + 18 > beacon.y && cpu.y < beacon.y + beacon.h) score(cpu);
        draw(); frame = requestAnimationFrame(loop);
      }
      frame = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(frame); removeListeners(); },
  });
})();
