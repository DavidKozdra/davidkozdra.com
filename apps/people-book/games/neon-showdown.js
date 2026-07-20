(() => {
  let weapon = "pulse";
  let running = false, frame = 0, removeListeners = () => {};
  PeopleArcade.boot({
    title: "Neon Showdown",
    hint: "Move with WASD / arrows · click to fire · press Space to dash",
    instructions: "Pick a weapon and survive the bullet storm. Dashing gives you a short burst of speed and invulnerability.",
    beforeStart: '<div class="weapon-row"><button class="weapon selected" data-weapon="pulse">Pulse<br>Fast</button><button class="weapon" data-weapon="scatter">Scatter<br>Wide</button><button class="weapon" data-weapon="rail">Rail<br>Heavy</button></div>',
    start({ canvas, ctx, getConfig, finish }) {
      running = true;
      const healthEl = document.querySelector("#health");
      const keys = new Set();
      let width = canvas.clientWidth, height = canvas.clientHeight;
      const player = { x: width * .28, y: height * .55, health: 100, reload: 0, dash: 0, cooldown: 0, aimX: width * .7, aimY: height * .5, hit: 0 };
      const enemy = { x: width * .72, y: height * .45, health: 100, reload: .6, phase: Math.random() * 6.2, hit: 0 };
      const bullets = [];
      const particles = [];
      const hitMarkers = [];
      let screenHit = 0;
      const difficulty = getConfig().opponent.difficulty || .6;
      const settings = { pulse: { cooldown: .18, damage: 8, speed: 570, spread: 0 }, scatter: { cooldown: .46, damage: 5, speed: 470, spread: .22 }, rail: { cooldown: .7, damage: 24, speed: 740, spread: 0 } };
      const resize = () => { width = canvas.clientWidth; height = canvas.clientHeight; player.x = Math.min(player.x, width - 20); player.y = Math.min(player.y, height - 20); enemy.x = Math.min(enemy.x, width - 20); enemy.y = Math.min(enemy.y, height - 20); };
      function aim(event) { const rect = canvas.getBoundingClientRect(); player.aimX = event.clientX - rect.left; player.aimY = event.clientY - rect.top; }
      function fire() {
        const set = settings[weapon]; if (player.reload > 0) return; player.reload = set.cooldown;
        const base = Math.atan2(player.aimY - player.y, player.aimX - player.x);
        const count = weapon === "scatter" ? 3 : 1;
        for (let i = 0; i < count; i++) { const angle = base + (i - (count - 1) / 2) * set.spread; bullets.push({ x: player.x, y: player.y, vx: Math.cos(angle) * set.speed, vy: Math.sin(angle) * set.speed, owner: "player", damage: set.damage, radius: weapon === "rail" ? 6 : 4, life: 1.4 }); }
      }
      function keydown(event) { if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault(); keys.add(event.code); if (event.code === "Space" && player.cooldown <= 0) { player.dash = .2; player.cooldown = .95; } }
      function keyup(event) { keys.delete(event.code); }
      window.addEventListener("resize", resize); window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); canvas.addEventListener("pointermove", aim); canvas.addEventListener("pointerdown", (event) => { aim(event); fire(); });
      removeListeners = () => { window.removeEventListener("resize", resize); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); canvas.removeEventListener("pointermove", aim); };
      let previous = performance.now();
      function shootEnemy() {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (Math.random() - .5) * (1 - difficulty) * .55;
        const count = difficulty > .72 ? 3 : 2;
        for (let i = 0; i < count; i++) { const a = angle + (i - (count - 1) / 2) * .17; bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * (265 + difficulty * 120), vy: Math.sin(a) * (265 + difficulty * 120), owner: "enemy", damage: 6 + difficulty * 5, radius: 4, life: 2 }); }
      }
      function hit(target, bullet) { return Math.hypot(target.x - bullet.x, target.y - bullet.y) < 17 + bullet.radius; }
      function spawnImpact(target, bullet) {
        const enemyHit = target === enemy;
        const color = enemyHit ? "#f43f5e" : "#ef4444";
        target.hit = .16;
        if (!enemyHit) screenHit = .18;
        hitMarkers.push({ x: bullet.x, y: bullet.y, damage: Math.round(bullet.damage), life: .48, color: enemyHit ? "#fde68a" : "#fecaca" });
        // Neon blood is intentionally brief and stylized: it sells the impact
        // without making the arena unreadable or leaving a gore layer behind.
        for (let i = 0; i < 13 + Math.round(bullet.damage / 3); i++) {
          const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI + (Math.random() - .5) * 1.55;
          const speed = 55 + Math.random() * 205 + bullet.damage * 3;
          particles.push({ x: bullet.x, y: bullet.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 4, life: .36 + Math.random() * .34, maxLife: .7, color });
        }
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(103,232,249,.08)"; ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
        for (let y = 0; y < height; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
        particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife); ctx.fillStyle = particle.color; ctx.shadowColor = particle.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        const drawFighter = (fighter, color, dash) => { ctx.fillStyle = fighter.hit > 0 ? "#fff1f2" : color; ctx.shadowColor = color; ctx.shadowBlur = dash ? 28 : 12; ctx.beginPath(); ctx.arc(fighter.x, fighter.y, 15 + fighter.hit * 20, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = fighter.hit > 0 ? "rgba(244,63,94,.52)" : "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(fighter.x, fighter.y, 25 + fighter.hit * 32, 0, Math.PI * 2); ctx.fill(); };
        drawFighter(player, "#67e8f9", player.dash > 0); drawFighter(enemy, "#f0abfc", false);
        bullets.forEach((bullet) => { ctx.fillStyle = bullet.owner === "player" ? "#fde68a" : "#fb7185"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); }); ctx.shadowBlur = 0;
        hitMarkers.forEach((marker) => { const scale = 1 + (1 - marker.life / .48) * .5; ctx.strokeStyle = marker.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(marker.x - 8 * scale, marker.y - 8 * scale); ctx.lineTo(marker.x + 8 * scale, marker.y + 8 * scale); ctx.moveTo(marker.x + 8 * scale, marker.y - 8 * scale); ctx.lineTo(marker.x - 8 * scale, marker.y + 8 * scale); ctx.stroke(); ctx.fillStyle = marker.color; ctx.font = "800 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(`-${marker.damage}`, marker.x, marker.y - 15 - (1 - marker.life / .48) * 16); });
        if (screenHit > 0) { ctx.fillStyle = `rgba(239,68,68,${screenHit * .34})`; ctx.fillRect(0, 0, width, height); }
      }
      function loop(now) {
        if (!running) return;
        const dt = Math.min(.032, (now - previous) / 1000); previous = now;
        const dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
        const dy = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
        const length = Math.hypot(dx, dy) || 1, speed = player.dash > 0 ? 550 : 250;
        player.x = Math.max(16, Math.min(width - 16, player.x + dx / length * speed * dt)); player.y = Math.max(16, Math.min(height - 16, player.y + dy / length * speed * dt));
        enemy.x = Math.max(18, Math.min(width - 18, enemy.x + Math.cos(now / 640 + enemy.phase) * (90 + difficulty * 50) * dt)); enemy.y = Math.max(18, Math.min(height - 18, enemy.y + Math.sin(now / 720 + enemy.phase) * (90 + difficulty * 50) * dt));
        player.reload -= dt; player.dash = Math.max(0, player.dash - dt); player.cooldown -= dt; player.hit = Math.max(0, player.hit - dt); enemy.hit = Math.max(0, enemy.hit - dt); screenHit = Math.max(0, screenHit - dt);
        if (enemy.reload <= 0) { enemy.reload = .85 - difficulty * .36; shootEnemy(); }
        for (let i = particles.length - 1; i >= 0; i--) { const particle = particles[i]; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= .91; particle.vy = particle.vy * .91 + 130 * dt; particle.life -= dt; if (particle.life <= 0) particles.splice(i, 1); }
        for (let i = hitMarkers.length - 1; i >= 0; i--) { hitMarkers[i].life -= dt; if (hitMarkers[i].life <= 0) hitMarkers.splice(i, 1); }
        for (let i = bullets.length - 1; i >= 0; i--) { const bullet = bullets[i]; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt; if (bullet.owner === "player" && hit(enemy, bullet)) { enemy.health -= bullet.damage; spawnImpact(enemy, bullet); bullets.splice(i, 1); continue; } if (bullet.owner === "enemy" && player.dash <= 0 && hit(player, bullet)) { player.health -= bullet.damage; spawnImpact(player, bullet); bullets.splice(i, 1); continue; } if (bullet.life <= 0 || bullet.x < -20 || bullet.x > width + 20 || bullet.y < -20 || bullet.y > height + 20) bullets.splice(i, 1); }
        healthEl.textContent = `${Math.max(0, Math.ceil(player.health))} ♥ — ${Math.max(0, Math.ceil(enemy.health))} ♥`;
        if (player.health <= 0 || enemy.health <= 0) { running = false; const won = enemy.health <= 0; finish(won, won ? "Your aim held through the bullet storm." : `${getConfig().opponent.name} landed the last shot.`); return; }
        draw(); frame = requestAnimationFrame(loop);
      }
      frame = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(frame); removeListeners(); },
  });
  document.querySelectorAll(".weapon").forEach((button) => button.addEventListener("click", () => { weapon = button.dataset.weapon; document.querySelectorAll(".weapon").forEach((item) => item.classList.toggle("selected", item === button)); }));
})();
