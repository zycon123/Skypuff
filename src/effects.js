export class Effects {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.slowMotion = false;
        this.slowMotionTimer = 0;
    }

    addParticle(x, y, color = '255,255,255') {
        this.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 - 1,
            size: 2 + Math.random() * 3,
            life: 30,
            maxLife: 30,
            color
        });
    }

    addBurst(x, y, count = 10, color = '255,215,0') {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 2,
                life: 40,
                maxLife: 40,
                color
            });
        }
    }

    addFloatingText(x, y, text, color = '#FFD700') {
        this.floatingTexts.push({
            x, y, text, color,
            life: 60,
            maxLife: 60,
            vy: -1
        });
    }

    activateSlowMotion(duration = 30) {
        this.slowMotion = true;
        this.slowMotionTimer = duration;
    }

    update(dt, cameraY) {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= dt;
            return p.life > 0;
        });

        this.floatingTexts = this.floatingTexts.filter(t => {
            t.y += t.vy;
            t.life -= dt;
            return t.life > 0;
        });

        if (this.slowMotion) {
            this.slowMotionTimer -= dt;
            if (this.slowMotionTimer <= 0) {
                this.slowMotion = false;
            }
        }
    }

    render(ctx, cameraY) {
        this.particles.forEach(p => {
            const screenY = p.y - cameraY;
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `rgba(${p.color},${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, screenY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        this.floatingTexts.forEach(t => {
            const screenY = t.y - cameraY;
            const alpha = t.life / t.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = t.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(t.text, t.x, screenY);
            ctx.fillText(t.text, t.x, screenY);
            ctx.restore();
        });
    }

    clear() {
        this.particles = [];
        this.floatingTexts = [];
        this.slowMotion = false;
        this.slowMotionTimer = 0;
    }

    getTimeScale() {
        return this.slowMotion ? 0.5 : 1;
    }
}
