// world.js — deterministic seeded procedural generation with guaranteed reachability
import { createPlatform, PLATFORM_TYPES } from './platforms.js';
import { GRAVITY, BOUNCE_VELOCITY } from './player.js';

export const PIXELS_PER_METER = 18;

// --- Seeded PRNG (mulberry32) for deterministic "Daily Sky" support -------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// --- Difficulty bands (by height in meters) --------------------------------
const BANDS = [
  { name: 'Beginner', min: 0, gapFrac: [0.35, 0.55], width: [72, 92], moving: 0, breakable: 0, ice: 0, spike: 0, spring: 0.03, cloud: 0.05, golden: 0.01 },
  { name: 'Easy', min: 250, gapFrac: [0.4, 0.62], width: [64, 86], moving: 0.18, breakable: 0, ice: 0, spike: 0, spring: 0.04, cloud: 0.08, golden: 0.012 },
  { name: 'Medium', min: 750, gapFrac: [0.45, 0.68], width: [56, 78], moving: 0.24, breakable: 0.18, ice: 0.14, spike: 0, spring: 0.05, cloud: 0.1, golden: 0.015 },
  { name: 'Hard', min: 1500, gapFrac: [0.5, 0.74], width: [48, 68], moving: 0.3, breakable: 0.22, ice: 0.18, spike: 0.03, spring: 0.06, cloud: 0.12, golden: 0.018 },
  { name: 'SkyMaster', min: 2500, gapFrac: [0.55, 0.8], width: [44, 62], moving: 0.34, breakable: 0.26, ice: 0.2, spike: 0.045, spring: 0.07, cloud: 0.14, golden: 0.02 },
];

export function bandForHeight(meters) {
  let b = BANDS[0];
  for (const band of BANDS) if (meters >= band.min) b = band;
  return b;
}

export function environmentForHeight(meters) {
  if (meters < 500) return 'sunny';
  if (meters < 1000) return 'sunset';
  if (meters < 1750) return 'night';
  if (meters < 2500) return 'upper';
  return 'space';
}

// Max vertical gap Puff can always clear from a standard auto-bounce.
export function maxSafeGap() {
  const H = (BOUNCE_VELOCITY * BOUNCE_VELOCITY) / (2 * GRAVITY);
  return H * 0.8; // safety margin
}

// Horizontal range achievable by the time Puff falls back through a given
// vertical offset `dy` (falling only, matching the "landing while falling" rule).
export function maxHorizontalRangeForGap(dy, maxHSpeed) {
  const v = -BOUNCE_VELOCITY;
  const g = GRAVITY;
  const disc = Math.max(0, v * v - 2 * g * dy);
  const tFall = (v + Math.sqrt(disc)) / g;
  return maxHSpeed * tFall * 0.85;
}

function weightedPick(rng, entries) {
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = rng() * total;
  for (const e of entries) {
    if (r < e.w) return e.v;
    r -= e.w;
  }
  return entries[entries.length - 1].v;
}

export class World {
  constructor(seed, worldWidth, maxHSpeed) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.worldWidth = worldWidth;
    this.maxHSpeed = maxHSpeed;
    this.platforms = [];
    this.collectibles = []; // {kind:'star'|'heart'|'mystery', x, y, collected}
    this.lastY = 0;
    this.lastX = worldWidth / 2;
    this.heightMeters = 0;
    this.heartActiveInWorld = false;
    this._sinceGolden = 0;
  }

  setWorldWidth(w) { this.worldWidth = w; }

  metersAt(y0, y) { return Math.max(0, (y0 - y) / PIXELS_PER_METER); }

  // Seed the first guaranteed-safe platform directly beneath the player.
  seedStart(startX, startY) {
    const p = createPlatform(PLATFORM_TYPES.NORMAL, startX - 55, startY, 110);
    this.platforms.push(p);
    this.lastY = startY;
    this.lastX = startX;
    return p;
  }

  // Generate platforms upward until `targetTopY` is covered.
  generateUpTo(targetTopY, refHeightY0) {
    let guard = 0;
    while (this.lastY > targetTopY && guard < 500) {
      guard++;
      this._generateNext(refHeightY0);
    }
  }

  _generateNext(refHeightY0) {
    const meters = this.metersAt(refHeightY0, this.lastY);
    const band = bandForHeight(meters);
    const safeGap = maxSafeGap();
    const [gMin, gMax] = band.gapFrac;
    const dy = safeGap * (gMin + this.rng() * (gMax - gMin));
    const hRange = maxHorizontalRangeForGap(dy, this.maxHSpeed);

    const width = band.width[0] + this.rng() * (band.width[1] - band.width[0]);
    let dx = (this.rng() * 2 - 1) * hRange;
    let x = this.lastX + dx;
    x = Math.max(4, Math.min(this.worldWidth - width - 4, x));

    const y = this.lastY - dy;

    // Choose a type — safe path never spawns SPIKE.
    const type = weightedPick(this.rng, [
      { v: PLATFORM_TYPES.NORMAL, w: 1 },
      { v: PLATFORM_TYPES.MOVING, w: band.moving },
      { v: PLATFORM_TYPES.BREAKABLE, w: band.breakable },
      { v: PLATFORM_TYPES.ICE, w: band.ice },
      { v: PLATFORM_TYPES.SPRING, w: band.spring },
      { v: PLATFORM_TYPES.CLOUD, w: band.cloud },
    ]);

    const opts = {};
    this._sinceGolden++;
    if (this._sinceGolden > 12 && this.rng() < band.golden) {
      opts.isGolden = true;
      this._sinceGolden = 0;
    }
    if (this.rng() < 0.34) opts.hasStar = true;
    if (!this.heartActiveInWorld && meters > 80 && this.rng() < 0.01) {
      opts.hasHeart = true;
      this.heartActiveInWorld = true;
    }

    if (type === PLATFORM_TYPES.MOVING) {
      opts.vx = (this.rng() < 0.5 ? -1 : 1) * (40 + this.rng() * 50 + meters * 0.01);
      opts.moveRange = Math.min(50, this.worldWidth * 0.18);
    }

    const platform = createPlatform(type, x, y, width, opts);
    this.platforms.push(platform);

    // Occasional standalone mystery cloud placed near the flight arc (never required).
    if (this.rng() < 0.05) {
      const mx = Math.max(10, Math.min(this.worldWidth - 10, (this.lastX + x) / 2 + (this.rng() * 40 - 20)));
      const my = (this.lastY + y) / 2;
      this.collectibles.push({ kind: 'mystery', x: mx, y: my, collected: false });
    }

    // Very rare, clearly optional spike hazard placed away from the safe platform.
    if (band.spike > 0 && this.rng() < band.spike) {
      const side = x + width / 2 > this.worldWidth / 2 ? -1 : 1;
      const sx = Math.max(4, Math.min(this.worldWidth - 40, x + side * (width + 60 + this.rng() * 40)));
      const spike = createPlatform(PLATFORM_TYPES.SPIKE, sx, y - dy * 0.35, 36 + this.rng() * 20);
      this.platforms.push(spike);
    }

    this.lastX = x;
    this.lastY = y;
  }

  // Drop platforms/collectibles that have fallen far below the camera.
  pruneBelow(cutoffY) {
    this.platforms = this.platforms.filter((p) => p.y < cutoffY);
    this.collectibles = this.collectibles.filter((c) => c.y < cutoffY);
  }
}

export function generateWorld(seed, worldWidth, maxHSpeed) {
  return new World(seed, worldWidth, maxHSpeed);
}
