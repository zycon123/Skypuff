// platforms.js — platform type definitions, behavior and collision helpers
export const PLATFORM_TYPES = Object.freeze({
  NORMAL: 'normal',
  MOVING: 'moving',
  BREAKABLE: 'breakable',
  ICE: 'ice',
  SPRING: 'spring',
  CLOUD: 'cloud',
  SPIKE: 'spike',
});

export const PLATFORM_WIDTH = { min: 46, max: 92 };
export const PLATFORM_HEIGHT = 16;

let _idCounter = 1;

export function createPlatform(type, x, y, width, opts = {}) {
  return {
    id: _idCounter++,
    type,
    x, y,
    width,
    height: PLATFORM_HEIGHT,
    vx: opts.vx || 0,
    moveRange: opts.moveRange || 0,
    moveOrigin: x,
    state: 'idle', // idle | cracking | broken | fading | gone
    stateTimer: 0,
    hasStar: !!opts.hasStar,
    starCollected: false,
    hasHeart: !!opts.hasHeart,
    heartCollected: false,
    isGolden: !!opts.isGolden,
    goldenCollected: false,
    landedOnce: false,
    squash: 0,
  };
}

// Advance any per-platform animation/movement (does not touch the player).
export function updatePlatform(p, dt, worldWidth) {
  if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 4);

  if (p.type === PLATFORM_TYPES.MOVING && p.state === 'idle') {
    p.x += p.vx * dt;
    if (p.x < p.moveOrigin - p.moveRange) { p.x = p.moveOrigin - p.moveRange; p.vx *= -1; }
    if (p.x > p.moveOrigin + p.moveRange) { p.x = p.moveOrigin + p.moveRange; p.vx *= -1; }
  }

  if (p.type === PLATFORM_TYPES.BREAKABLE) {
    if (p.state === 'cracking') {
      p.stateTimer -= dt;
      if (p.stateTimer <= 0) p.state = 'broken';
    }
  }

  if (p.type === PLATFORM_TYPES.CLOUD) {
    if (p.state === 'fading') {
      p.stateTimer -= dt;
      if (p.stateTimer <= 0) p.state = 'gone';
    }
  }
}

export function isPlatformSolid(p) {
  return p.state !== 'broken' && p.state !== 'gone';
}

// Standard axis-aligned landing test: only valid while falling, and only when
// Puff's feet cross the platform top from above (never through the side/below).
export function testLanding(player, p, prevFootY) {
  if (!isPlatformSolid(p)) return false;
  if (player.vy <= 0) return false; // only while falling
  const footY = player.y + player.radius;
  const withinX = player.x + player.radius * 0.6 > p.x && player.x - player.radius * 0.6 < p.x + p.width;
  if (!withinX) return false;
  // feet must cross the top surface this frame (prevents tunneling through from below)
  return prevFootY <= p.y && footY >= p.y && footY <= p.y + p.height + Math.max(6, player.vy * 0.05);
}
