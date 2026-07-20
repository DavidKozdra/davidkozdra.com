(() => {
  let running = false, frame = 0, removeListeners = () => {};
  PeopleArcade.boot({
    title: "Paddle Clash",
    hint: "Move the handle with mouse or touch · press Space to swing through the ball",
    instructions: "First to five wins. Your paddle is a rotating bat now: move its handle to meet the ball, then hit Space to swing. Where the ball meets the bat and how fast it rotates decide its angle and power.",
    start({ canvas, ctx, getConfig, finish }) {
      running = true;
      const scoreEl = document.querySelector("#score");
      let width = canvas.clientWidth, height = canvas.clientHeight;
      const player = { x: 64, y: height / 2, angle: -.82, angularVelocity: 0, swinging: false, score: 0, color: "#67e8f9" };
      const cpu = { x: width - 64, y: height / 2, angle: Math.PI + .82, angularVelocity: 0, swinging: false, score: 0, color: "#f0abfc" };
      const ball = { x: width / 2, y: height / 2, vx: 320, vy: 90, radius: 8 };
      const batLength = 82, batWidth = 10, difficulty = getConfig().opponent.difficulty || .6;
      let lastPointerY = player.y;

      function resize() { width = canvas.clientWidth; height = canvas.clientHeight; player.x = 64; cpu.x = width - 64; player.y = Math.min(height - 55, player.y); cpu.y = Math.min(height - 55, cpu.y); }
      function setHandle(event) { const rect = canvas.getBoundingClientRect(); const point = event.touches ? event.touches[0] : event; player.y = Math.max(52, Math.min(height - 52, point.clientY - rect.top)); lastPointerY = player.y; }
      function swing(event) { if (event.code !== "Space") return; event.preventDefault(); if (!player.swinging) { player.swinging = true; player.angularVelocity = 8.8; } }
      window.addEventListener("resize", resize); canvas.addEventListener("pointermove", setHandle); canvas.addEventListener("pointerdown", setHandle); window.addEventListener("keydown", swing);
      removeListeners = () => { window.removeEventListener("resize", resize); canvas.removeEventListener("pointermove", setHandle); canvas.removeEventListener("pointerdown", setHandle); window.removeEventListener("keydown", swing); };

      function resetBall(toPlayer) {
        ball.x = width / 2; ball.y = height / 2;
        ball.vx = (toPlayer ? -1 : 1) * (300 + Math.random() * 65);
        ball.vy = (Math.random() * 2 - 1) * 155;
        player.angle = -.82; player.angularVelocity = 0; player.swinging = false;
        cpu.angle = Math.PI + .82; cpu.angularVelocity = 0; cpu.swinging = false;
      }
      function predictIntercept() {
        if (ball.vx <= 0) return height / 2;
        let y = ball.y + ball.vy * ((cpu.x - ball.x) / ball.vx);
        const span = height - ball.radius * 2;
        y = ((y - ball.radius) % (span * 2) + span * 2) % (span * 2);
        return y > span ? span * 2 - y + ball.radius : y + ball.radius;
      }
      function batEnd(paddle) { return { x: paddle.x + Math.cos(paddle.angle) * batLength, y: paddle.y + Math.sin(paddle.angle) * batLength }; }
      function closestOnBat(paddle, point) {
        const end = batEnd(paddle), dx = end.x - paddle.x, dy = end.y - paddle.y;
        const t = Math.max(0, Math.min(1, ((point.x - paddle.x) * dx + (point.y - paddle.y) * dy) / (dx * dx + dy * dy)));
        return { x: paddle.x + dx * t, y: paddle.y + dy * t, t };
      }
      function collide(paddle, isPlayer) {
        const closest = closestOnBat(paddle, ball);
        const dx = ball.x - closest.x, dy = ball.y - closest.y, distance = Math.hypot(dx, dy);
        if (distance > ball.radius + batWidth || (isPlayer ? ball.vx >= 0 : ball.vx <= 0)) return false;
        let nx = dx / (distance || 1), ny = dy / (distance || 1);
        // Make the normal face back into the court, which prevents a glancing hit
        // from sending the ball through the paddle toward its own goal.
        if (isPlayer && nx < .16) nx = Math.abs(nx) + .22;
        if (!isPlayer && nx > -.16) nx = -Math.abs(nx) - .22;
        const normalLength = Math.hypot(nx, ny); nx /= normalLength; ny /= normalLength;
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
        const tangentX = -Math.sin(paddle.angle), tangentY = Math.cos(paddle.angle);
        const swingForce = paddle.angularVelocity * closest.t * batLength * .92;
        ball.vx += tangentX * swingForce; ball.vy += tangentY * swingForce;
        const speed = Math.min(760, Math.max(300, Math.hypot(ball.vx, ball.vy) * 1.045));
        const direction = isPlayer ? 1 : -1;
        ball.vx = direction * Math.max(175, Math.abs(ball.vx));
        const currentSpeed = Math.hypot(ball.vx, ball.vy); ball.vx *= speed / currentSpeed; ball.vy *= speed / currentSpeed;
        ball.x = closest.x + nx * (ball.radius + batWidth + 1); ball.y = closest.y + ny * (ball.radius + batWidth + 1);
        return true;
      }
      function updatePaddle(paddle, dt, isPlayer) {
        paddle.angle += paddle.angularVelocity * dt;
        paddle.angularVelocity *= Math.pow(.025, dt);
        const rest = isPlayer ? -.82 : Math.PI + .82;
        paddle.angle += (rest - paddle.angle) * Math.min(1, dt * (paddle.swinging ? 1.4 : 5));
        if ((isPlayer && paddle.angle > .94) || (!isPlayer && paddle.angle < Math.PI - .94)) {
          paddle.swinging = false;
        }
      }
      function updateCpu(dt) {
        const intercept = predictIntercept();
        const tracking = 150 + difficulty * 330;
        cpu.y += Math.max(-1, Math.min(1, intercept - cpu.y)) * tracking * dt;
        cpu.y = Math.max(52, Math.min(height - 52, cpu.y));
        // AI only swings when the incoming line will pass near its bat. Stronger
        // personalities wait longer and use a more forceful, goal-directed return.
        const close = ball.vx > 0 && ball.x > width - (205 - difficulty * 62);
        const aligned = Math.abs(intercept - cpu.y) < 22 + (1 - difficulty) * 30;
        if (close && aligned && !cpu.swinging) { cpu.swinging = true; cpu.angularVelocity = -(6.6 + difficulty * 3.4); }
      }
      function drawBat(paddle) {
        const end = batEnd(paddle);
        ctx.strokeStyle = paddle.color; ctx.lineWidth = batWidth; ctx.lineCap = "round"; ctx.shadowColor = paddle.color; ctx.shadowBlur = paddle.swinging ? 25 : 10;
        ctx.beginPath(); ctx.moveTo(paddle.x, paddle.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        ctx.shadowBlur = 0; ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(paddle.x, paddle.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(255,255,255,.14)"; for (let y = 7; y < height; y += 25) ctx.fillRect(width / 2 - 1, y, 2, 14);
        ctx.fillStyle = "rgba(103,232,249,.1)"; ctx.fillRect(0, 0, 6, height); ctx.fillStyle = "rgba(240,171,252,.1)"; ctx.fillRect(width - 6, 0, 6, height);
        drawBat(player); drawBat(cpu);
        ctx.fillStyle = "white"; ctx.shadowColor = "white"; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      function point(playerWon) {
        if (playerWon) player.score++; else cpu.score++;
        scoreEl.textContent = `${player.score} — ${cpu.score}`;
        if (player.score >= 5 || cpu.score >= 5) {
          running = false;
          finish(player.score >= 5, player.score >= 5 ? "Your swing control was unreal." : `${getConfig().opponent.name} read the return and buried it.`); return;
        }
        resetBall(playerWon);
      }
      let previous = performance.now();
      function loop(now) {
        if (!running) return;
        const dt = Math.min(.026, (now - previous) / 1000); previous = now;
        updateCpu(dt); updatePaddle(player, dt, true); updatePaddle(cpu, dt, false);
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.y < ball.radius || ball.y > height - ball.radius) { ball.vy *= -1; ball.y = Math.max(ball.radius, Math.min(height - ball.radius, ball.y)); }
        collide(player, true); collide(cpu, false);
        if (ball.x < -24) point(false); if (ball.x > width + 24) point(true);
        draw(); frame = requestAnimationFrame(loop);
      }
      resetBall(false); frame = requestAnimationFrame(loop);
    },
    stop() { running = false; cancelAnimationFrame(frame); removeListeners(); },
  });
})();
