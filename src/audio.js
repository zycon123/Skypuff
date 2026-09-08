export class AudioManager {
    constructor(storage) {
        this.storage = storage;
        this.audioContext = null;
        this.sfxEnabled = storage.get('sfxEnabled');
        this.musicEnabled = storage.get('musicEnabled');
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        this.storage.set('sfxEnabled', this.sfxEnabled);
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.storage.set('musicEnabled', this.musicEnabled);
        return this.musicEnabled;
    }

    playSound(type) {
        if (!this.sfxEnabled || !this.initialized) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        switch(type) {
            case 'bounce':
                this.playTone(ctx, 400, 0.1, 'sine', 0.3);
                break;
            case 'perfect':
                this.playTone(ctx, 800, 0.15, 'sine', 0.4);
                this.playTone(ctx, 1000, 0.15, 'sine', 0.3, now + 0.05);
                break;
            case 'star':
                this.playTone(ctx, 1200, 0.1, 'sine', 0.3);
                this.playTone(ctx, 1600, 0.1, 'sine', 0.2, now + 0.05);
                break;
            case 'spring':
                this.playTone(ctx, 300, 0.2, 'square', 0.4);
                this.playTone(ctx, 600, 0.15, 'sine', 0.3, now + 0.1);
                break;
            case 'break':
                this.playNoise(ctx, 0.2, 0.3);
                break;
            case 'heart':
                this.playTone(ctx, 600, 0.2, 'sine', 0.4);
                this.playTone(ctx, 800, 0.2, 'sine', 0.3, now + 0.1);
                break;
            case 'closecall':
                this.playTone(ctx, 500, 0.3, 'sawtooth', 0.3);
                break;
            case 'starrush':
                for (let i = 0; i < 5; i++) {
                    this.playTone(ctx, 600 + i * 200, 0.1, 'sine', 0.2, now + i * 0.05);
                }
                break;
            case 'mystery':
                this.playTone(ctx, 700, 0.2, 'triangle', 0.4);
                break;
            case 'newbest':
                for (let i = 0; i < 4; i++) {
                    this.playTone(ctx, 800 + i * 200, 0.15, 'sine', 0.3, now + i * 0.1);
                }
                break;
            case 'death':
                this.playTone(ctx, 400, 0.5, 'sawtooth', 0.3);
                this.playTone(ctx, 200, 0.5, 'sawtooth', 0.2, now + 0.1);
                break;
            case 'button':
                this.playTone(ctx, 600, 0.05, 'sine', 0.2);
                break;
        }
    }

    playTone(ctx, frequency, duration, type = 'sine', volume = 0.3, startTime = null) {
        const start = startTime !== null ? startTime : ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
    }

    playNoise(ctx, duration, volume = 0.3) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        const gain = ctx.createGain();
        
        noise.buffer = buffer;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        noise.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
    }
}
