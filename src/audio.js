// audio.js — lightweight synthesized audio manager (no external/copyrighted assets)
export class AudioManager {
  constructor({ sfxOn = true, musicOn = true } = {}) {
    this.sfxOn = sfxOn;
    this.musicOn = musicOn;
    this.ctx = null;
    this.musicTimer = null;
    this.musicIntensity = 0; // 0 normal, 1 star-rush
    this._musicStep = 0;
  }

  _ensureCtx() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  }

  resume() {
    const ctx = this._ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  setSfx(on) { this.sfxOn = on; }
  setMusic(on) {
    this.musicOn = on;
    if (!on) this.stopMusic();
  }

  _tone(freq, dur, { type = 'sine', gain = 0.18, glideTo = null, delay = 0 } = {}) {
    if (!this.sfxOn) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _chord(freqs, dur, opts) {
    freqs.forEach((f, i) => this._tone(f, dur, { ...opts, delay: (opts?.delay || 0) + i * 0.03 }));
  }

  bounce() { this._tone(360, 0.09, { type: 'sine', gain: 0.15, glideTo: 460 }); }
  perfect() { this._chord([660, 880], 0.15, { type: 'triangle', gain: 0.16 }); }
  star() { this._tone(880, 0.12, { type: 'square', gain: 0.1, glideTo: 1320 }); }
  heartSpawn() { this._chord([520, 660], 0.2, { type: 'sine', gain: 0.14 }); }
  heartSave() { this._chord([440, 660, 880, 1100], 0.35, { type: 'sawtooth', gain: 0.15 }); }
  spring() { this._tone(220, 0.22, { type: 'sawtooth', gain: 0.18, glideTo: 880 }); }
  breakPlatform() { this._tone(140, 0.18, { type: 'square', gain: 0.14, glideTo: 60 }); }
  closeCall() { this._tone(200, 0.3, { type: 'triangle', gain: 0.16, glideTo: 320 }); }
  starRush() { this._chord([440, 660, 880], 0.4, { type: 'square', gain: 0.15 }); }
  mysteryCloud() { this._chord([500, 750, 1000], 0.25, { type: 'sine', gain: 0.14 }); }
  newBest() { this._chord([523, 659, 784, 1046], 0.4, { type: 'triangle', gain: 0.18 }); }
  death() { this._tone(300, 0.4, { type: 'sawtooth', gain: 0.18, glideTo: 60 }); }
  button() { this._tone(500, 0.06, { type: 'square', gain: 0.08 }); }

  startMusic() {
    if (!this.musicOn || this.musicTimer) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const notesCalm = [392, 440, 523, 587, 659];
    const notesRush = [523, 659, 784, 880, 987];
    this.musicTimer = setInterval(() => {
      if (!this.musicOn) return;
      const notes = this.musicIntensity > 0 ? notesRush : notesCalm;
      const n = notes[this._musicStep % notes.length];
      this._musicStep++;
      this._tone(n, 0.18, { type: 'sine', gain: this.musicIntensity > 0 ? 0.05 : 0.03 });
    }, this.musicIntensity > 0 ? 260 : 420);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setIntensity(level) { this.musicIntensity = level; }
}
