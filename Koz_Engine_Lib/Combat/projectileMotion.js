(function initProjectileMotionLib(root, factory) {
  const geometry = typeof require === 'function' ? require('../Core/geometry2d.js') : root.KozEngine?.Core?.geometry2d;
  const api = factory(geometry || {});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createProjectileMotionApi(geometry) {
  'use strict';
  const normalizeAngle = geometry.normalizeAngle || (angle => Number(angle || 0));
  const turnAngleToward = geometry.turnAngleToward || ((current) => Number(current || 0));

  function steerHomingProjectile(projectile, target, deltaSeconds) {
    if (!projectile?.homing) return projectile;
    const dt = Math.max(0, Number(deltaSeconds || 0));
    const speed = Math.hypot(Number(projectile.vx || 0), Number(projectile.vy || 0)) || Number(projectile.homingSpeed || 180);
    const currentAngle = Math.atan2(Number(projectile.vy || 0), Number(projectile.vx || 1));
    const targetAngle = target ? Math.atan2(Number(target.y || 0) - Number(projectile.y || 0), Number(target.x || 0) - Number(projectile.x || 0)) : currentAngle;
    const nextAngle = turnAngleToward(currentAngle, targetAngle, Number(projectile.homingTurnRate || 2) * dt);
    const nextSpeed = speed + (Number(projectile.homingSpeed || speed) - speed) * Number(projectile.homingAccel || 2.5) * dt;
    projectile.vx = Math.cos(nextAngle) * nextSpeed;
    projectile.vy = Math.sin(nextAngle) * nextSpeed;
    return projectile;
  }
  function advanceProjectile(projectile, deltaSeconds) {
    const previous = { x: Number(projectile?.x || 0), y: Number(projectile?.y || 0) };
    if (!projectile) return previous;
    projectile.x = previous.x + Number(projectile.vx || 0) * Number(deltaSeconds || 0);
    projectile.y = previous.y + Number(projectile.vy || 0) * Number(deltaSeconds || 0);
    return previous;
  }
  function bounceProjectile(projectile, hit, previous) {
    const remaining = Math.floor(Number(projectile?.bouncesRemaining || 0));
    if (!projectile || remaining <= 0) return false;
    projectile.bouncesRemaining = remaining - 1;
    const normalX = Number(hit?.normalX || 0);
    const normalY = Number(hit?.normalY || 0);
    if (normalX || normalY) {
      const dot = Number(projectile.vx || 0) * normalX + Number(projectile.vy || 0) * normalY;
      projectile.vx -= 2 * dot * normalX;
      projectile.vy -= 2 * dot * normalY;
      projectile.x = Number.isFinite(Number(hit?.x)) ? Number(hit.x) : Number(previous?.x || projectile.x);
      projectile.y = Number.isFinite(Number(hit?.y)) ? Number(hit.y) : Number(previous?.y || projectile.y);
    } else {
      const hitX = hit?.hitX === true;
      const hitY = hit?.hitY === true;
      projectile.x = Number(previous?.x || projectile.x);
      projectile.y = Number(previous?.y || projectile.y);
      if (hitX) projectile.vx *= -1;
      if (hitY) projectile.vy *= -1;
      if (!hitX && !hitY) { projectile.vx *= -1; projectile.vy *= -1; }
    }
    const speed = Math.hypot(Number(projectile.vx || 0), Number(projectile.vy || 0)) || 1;
    const radius = Number(projectile.r ?? projectile.radius ?? 0);
    const nudge = Math.max(2, radius * 0.6);
    projectile.x += (projectile.vx / speed) * nudge;
    projectile.y += (projectile.vy / speed) * nudge;
    return true;
  }
  return { normalizeAngle, turnAngleToward, steerHomingProjectile, advanceProjectile, bounceProjectile };
});
