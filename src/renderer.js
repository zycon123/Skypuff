// renderer.js — canvas drawing for background, platforms, Puff and effects
import { PLATFORM_TYPES } from './platforms.js';
import { PuffState } from './player.js';

export const SKINS = [
  { id: 'classic', name: 'Classic Puff', cost: 0, body: '#ffffff', cheek: '#ffc2d6' },
  { id: 'blue', name: 'Blue Puff', cost: 50, body: '#bfe4ff', cheek: '#ffdce7' },
  { id: 'pink', name: 'Pink Puff', cost: 100, body: '#ffd1e6', cheek: '#ff9fc4' },
  { id: 'storm', name: 'Storm Puff', cost: 200, body: '#c9ccd6', cheek: '#8fa0c9' },
  { id: 'golden', name: 'Golden Puff', cost: 500, body: '#ffe28a', cheek: '#ffb347' },
  { id: 'galaxy', name: 'Galaxy Puff', cost: 1000, body: '#c9a7ff', cheek: '#7c6bd6' },
];

const ENV_GRADIENTS = {
  sunny: ['#8fd3ff', '#e8faff'],
  sunset: ['#ff9a76', '#ffd3a5'],
  night: ['#0d1b3e', '#1c2c5c'],
  upper: ['#2b1e5c', '#4d2f8c'],
  space: ['#04041a', '#170a33'],
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this._bgStars = [];
    for (let i = 0; i < 60; i++) {
      this._bgStars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 0.5, tw: Math.random() * Math.PI * 2 });
    }
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  drawBackground(env, timeSec) {
    const { ctx, width, height } = this;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    const cols = ENV_GRADIENTS[env] || ENV_GRADIENTS.sunny;
    grad.addColorStop(0, cols[0]);
    grad.addColorStop(1, cols[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (env === 'night' || env === 'upper' || env === 'space') {
      for (const s of this._bgStars) {
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 1.5 + s.tw));
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (env === 'space') {
      ctx.fillStyle = 'rgba(255,180,220,0.18)';
      ctx.beginPath();
      ctx.arc(width * 0.75, height * 0.2, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlatform(p, camY) {
    const { ctx } = this;
    const y = p.y - camY;
    if (y < -40 || y > this.height + 40) return;
    const squashY = 1 - p.squash * 0.4;
    ctx.save();
    ctx.translate(p.x + p.width / 2, y + p.height / 2);
    ctx.scale(1 + p.squash * 0.3, squashY);
    ctx.translate(-(p.width / 2), -(p.height / 2));

    let fill = '#7bd88f', stroke = '#3f9e5c';
    let alpha = 1;
    switch (p.type) {
      case PLATFORM_TYPES.MOVING: fill = '#7ec8ff'; stroke = '#2f7fc9'; break;
      case PLATFORM_TYPES.BREAKABLE:
        fill = p.state === 'cracking' ? '#c98a55' : '#a9673a';
        stroke = '#6e4222';
        break;
      case PLATFORM_TYPES.ICE: fill = '#d6f3ff'; stroke = '#8fd6ee'; break;
      case PLATFORM_TYPES.SPRING: fill = '#ffd166'; stroke = '#e0a13b'; break;
      case PLATFORM_TYPES.CLOUD:
        fill = '#ffffff'; stroke = '#dfe9f2';
        alpha = p.state === 'fading' ? Math.max(0, p.stateTimer / 0.6) : 1;
        break;
      case PLATFORM_TYPES.SPIKE: fill = '#ff5d5d'; stroke = '#8f1f1f'; break;
      default: break;
    }
    if (p.isGolden) { fill = '#ffe27a'; stroke = '#e0a800'; }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    const r = 8;
    const w = p.width, h = p.height;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (p.type === PLATFORM_TYPES.SPIKE) {
      ctx.fillStyle = '#ffffff';
      const spikes = Math.max(3, Math.floor(w / 14));
      for (let i = 0; i < spikes; i++) {
        const sx = (i + 0.5) * (w / spikes);
        ctx.beginPath();
        ctx.moveTo(sx - 5, 0);
        ctx.lineTo(sx + 5, 0);
        ctx.lineTo(sx, -9);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (p.type === PLATFORM_TYPES.MOVING) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.vx > 0 ? '\u25B6' : '\u25C0', w / 2, h / 2 + 4);
    }
    if (p.type === PLATFORM_TYPES.SPRING) {
      ctx.strokeStyle = '#8a5a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(w / 2 - 8, h - 2 - i * 3);
        ctx.lineTo(w / 2 + 8, h - 2 - i * 3);
      }
      ctx.stroke();
    }
    if (p.isGolden) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u2605', w / 2, h / 2 + 4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawStar(x, y, camY, collected) {
    if (collected) return;
    const { ctx } = this;
    const yy = y - camY;
    if (yy < -20 || yy > this.height + 20) return;
    ctx.save();
    ctx.translate(x, yy);
    ctx.fillStyle = '#ffd93d';
    ctx.strokeStyle = '#e0a800';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawCollectible(c, camY) {
    const { ctx } = this;
    const yy = c.y - camY;
    if (yy < -20 || yy > this.height + 20) return;
    ctx.save();
    ctx.translate(c.x, yy);
    if (c.kind === 'heart') {
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-10, -6, -2, -12, 0, -3);
      ctx.bezierCurveTo(2, -12, 10, -6, 0, 5);
      ctx.fill();
    } else if (c.kind === 'mystery') {
      ctx.fillStyle = '#b98cff';
      ctx.strokeStyle = '#7c4fd6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }

  drawRainbowTrail(trail, camY) {
    const { ctx } = this;
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1], p1 = trail[i];
      const alpha = 1 - p1.life / p1.maxLife;
      if (alpha <= 0) continue;
      const hue = (i * 28) % 360;
      ctx.strokeStyle = `hsla(${hue},90%,65%,${(alpha * 0.7).toFixed(2)})`;
      ctx.lineWidth = 5 + p1.intensity * 3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y - camY);
      ctx.lineTo(p1.x, p1.y - camY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(particles, camY) {
    const { ctx } = this;
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts(texts, camY) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const f of texts) {
      const alpha = 1 - f.life / f.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = f.color;
      ctx.font = `bold ${f.size}px 'Baloo 2', sans-serif`;
      ctx.fillText(f.text, f.x, f.y - camY);
    }
    ctx.globalAlpha = 1;
  }

  drawPuff(player, camY, skinId) {
    const { ctx } = this;
    const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    const y = player.y - camY;
    const r = player.radius * player.sizeMult;
    ctx.save();
    ctx.translate(player.x, y);
    ctx.scale(player.squashX, player.squashY);

    ctx.fillStyle = skin.body;
    ctx.strokeStyle = '#d9e6f2';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-r * 0.55, r * 0.15, r * 0.62, 0, Math.PI * 2);
    ctx.arc(r * 0.55, r * 0.15, r * 0.62, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.35, r * 0.75, 0, Math.PI * 2);
    ctx.arc(0, r * 0.25, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin.cheek;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(-r * 0.42, r * 0.18, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.42, r * 0.18, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    this._drawFace(player, r);

    if (player.state === PuffState.SUPER) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawFace(player, r) {
    const { ctx } = this;
    const eyeY = -r * 0.05;
    const eyeDX = r * 0.32;
    let eyeR = r * 0.22;
    let mouth = 'smile';
    switch (player.state) {
      case PuffState.RISING: mouth = 'open'; break;
      case PuffState.FALLING: mouth = 'flat'; break;
      case PuffState.FAST_FALL: mouth = 'oh'; eyeR *= 1.15; break;
      case PuffState.PERFECT: mouth = 'grin'; break;
      case PuffState.SUPER: mouth = 'grin'; eyeR *= 1.1; break;
      case PuffState.DEATH: mouth = 'shock'; eyeR *= 1.2; break;
      default: mouth = 'smile';
    }

    for (const dx of [-eyeDX, eyeDX]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2f3a';
      ctx.beginPath();
      ctx.arc(dx + (player.vx > 5 ? 1.5 : player.vx < -5 ? -1.5 : 0), eyeY + eyeR * 0.15, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#2b2f3a';
    ctx.lineWidth = Math.max(1.6, r * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const my = r * 0.42;
    if (mouth === 'smile') {
      ctx.arc(0, my - r * 0.12, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (mouth === 'grin') {
      ctx.arc(0, my - r * 0.18, r * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
    } else if (mouth === 'open') {
      ctx.ellipse(0, my, r * 0.12, r * 0.16, 0, 0, Math.PI * 2);
    } else if (mouth === 'flat') {
      ctx.moveTo(-r * 0.12, my);
      ctx.lineTo(r * 0.12, my);
    } else if (mouth === 'oh') {
      ctx.ellipse(0, my, r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
    } else if (mouth === 'shock') {
      ctx.ellipse(0, my, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
}
