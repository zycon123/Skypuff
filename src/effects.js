// effects.js — particles, floating text and rainbow trail. Pools objects to avoid GC churn.
const MAX_PARTICLES = 160;
const RAINBOW_COLORS = ['#ff5d73', '#ff9f43', '#ffe066', '#7bd88f', '#4fc3f7', '#7c83fd', '#c780e8'];

export class EffectsSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.rainbowTrail = [];
    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  reset() {
    this.particles.length = 0;
    this.floatingTexts.length = 0;
    this.rainbowTrail.length = 0;
  }

  spawnBurst(x, y, color, count = 10, opts = {}) {
    if (this.reducedMotion) count = Math.min(count, 4);
    const room = MAX_PARTICLES - this.particles.length;
    const n = Math.max(0, Math.min(count, room));
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed || 120) * (0.4 + Math.random() * 0.9);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (opts.upBias || 0),
        life: 0,
        maxLife: opts.life || 0.6 + Math.random() * 0.3,
        size: opts.size || 3 + Math.random() * 3,
        color: color || RAINBOW_COLORS[(Math.random() * RAINBOW_COLORS.length) | 0],
        gravity: opts.gravity ?? 260,
      });
    }
  }

  spawnImpactDust(x, y) {
    this.spawnBurst(x, y, '#ffffff', 6, { speed: 70, life: 0.35, size: 2.5, gravity: 120, upBias: 40 });
  }

  addRainbowPoint(x, y, intensity = 1) {
    if (this.reducedMotion) return;
    this.rainbowTrail.push({ x, y, life: 0, maxLife: 0.5 + intensity * 0.3, intensity });
    if (this.rainbowTrail.length > 80) this.rainbowTrail.shift();
  }

  addFloatingText(x, y, text, { color = '#ffffff', size = 18, life = 1.0 } = {}) {
    this.floatingTexts.push({ x, y, text, color, size, life: 0, maxLife: life });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rainbowTrail.length - 1; i >= 0; i--) {
      const r = this.rainbowTrail[i];
      r.life += dt;
      if (r.life >= r.maxLife) this.rainbowTrail.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.life += dt;
      f.y -= 26 * dt;
      if (f.life >= f.maxLife) this.floatingTexts.splice(i, 1);
    }
  }
}

export { RAINBOW_COLORS };
