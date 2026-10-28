// This function is embedded unchanged in the preview and every downloaded page.
export function pageRuntime(settings) {
  'use strict';
  const project = JSON.parse(document.getElementById('cardking-project').textContent);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.querySelector('#confetti');
  const context = canvas.getContext('2d');
  const particles = new globalThis.CardKingEngine.ParticleSystemCore({ poolSize: 240, maxPoolSize: 360 });
  const colors = [project.accent, '#e8bf64', '#7da992', '#cc9cce', '#e9e1ce'];
  let frame = 0;
  let previous = 0;
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize();
  addEventListener('resize', resize, { passive: true });
  function draw(now) {
    particles.update(Math.min(now - previous || 16, 40));
    previous = now;
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles.activeParticles()) {
      context.save();
      context.globalAlpha = Math.min(1, p.alpha * 2);
      context.translate(p.x, p.y);
      context.rotate((p.maxLife - p.life) / 230 + p.vx);
      context.fillStyle = p.color;
      if (project.effect === 'sparkles') {
        context.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? p.size : p.size / 3;
          context.lineTo(Math.cos(i * Math.PI / 4) * radius, Math.sin(i * Math.PI / 4) * radius);
        }
        context.closePath(); context.fill();
      } else context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .55);
      context.restore();
    }
    if (particles.activeCount()) frame = requestAnimationFrame(draw);
    else { frame = 0; previous = 0; }
  }
  function celebrate() {
    if (project.effect === 'none' || reduceMotion.matches) return;
    for (let i = 0; i < 110; i++) particles.spawn(innerWidth / 2, Math.min(innerHeight * .35, 270), {
      vx: (Math.random() - .5) * 620, vy: -80 - Math.random() * 340, life: 2100 + Math.random() * 1600,
      size: 5 + Math.random() * 6, color: colors[i % colors.length], gravity: 360, drag: .995,
    });
    if (!frame) frame = requestAnimationFrame(draw);
  }
  const cover = document.querySelector('#card-cover');
  if (cover) cover.addEventListener('click', () => {
    cover.classList.add('is-open');
    document.querySelector('#page-content').removeAttribute('inert');
    document.querySelector('#page-content').removeAttribute('aria-hidden');
    document.querySelector('h1').focus({ preventScroll: true });
    setTimeout(() => cover.hidden = true, reduceMotion.matches ? 0 : 650);
    celebrate();
  });
  document.querySelector('#celebrate')?.addEventListener('click', celebrate);
  if (!cover) setTimeout(celebrate, 350);
  if (settings.preview) addEventListener('message', event => {
    if (event.source === parent && event.data?.type === 'cardking:celebrate') celebrate();
  });
  const countdown = document.querySelector('#countdown');
  function tick() {
    if (!countdown || !settings.timestamp) return;
    const remaining = settings.timestamp - Date.now();
    if (remaining <= 0) { countdown.textContent = 'The day is here. Let’s celebrate!'; return; }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor(remaining / 3600000) % 24;
    const minutes = Math.floor(remaining / 60000) % 60;
    countdown.textContent = `${days} days · ${hours} hours · ${minutes} minutes to go`;
  }
  tick();
  if (countdown) setInterval(tick, 30000);
  document.querySelector('#add-calendar')?.addEventListener('click', () => {
    const escape = value => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const date = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Card King//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${settings.timestamp}-${settings.slug}@cardking.local`, `DTSTAMP:${date(Date.now())}`,
      `DTSTART:${date(settings.timestamp)}`, `DTEND:${date(settings.timestamp + 3 * 3600000)}`,
      `SUMMARY:${escape(project.heading.replace(/\n/g, ' '))}`, `DESCRIPTION:${escape(project.message)}`,
      `LOCATION:${escape(project.location)}`, 'END:VEVENT', 'END:VCALENDAR', '',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${settings.slug}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
}
