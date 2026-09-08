export class Player {
    constructor(x, y, skin = 'classic') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 40;
        this.height = 40;
        this.radius = 20;
        
        this.gravity = 0.4;
        this.jumpPower = -12;
        this.moveSpeed = 0.6;
        this.maxSpeedX = 6;
        this.friction = 0.92;
        this.iceFriction = 0.98;
        
        this.skin = skin;
        this.state = 'normal';
        this.squash = 1;
        this.stretch = 1;
        
        this.hasHeart = false;
        this.magnetActive = false;
        this.giantActive = false;
        this.rainbowRush = false;
        
        this.perfectCombo = 0;
        this.lastLandingX = 0;
    }

    update(dt, direction) {
        const friction = this.onIce ? this.iceFriction : this.friction;
        
        if (direction !== 0) {
            this.vx += direction * this.moveSpeed;
            this.vx = Math.max(-this.maxSpeedX, Math.min(this.maxSpeedX, this.vx));
        } else {
            this.vx *= friction;
        }

        this.vy += this.gravity;
        
        this.x += this.vx;
        this.y += this.vy;

        if (Math.abs(this.vx) < 0.1) this.vx = 0;

        this.updateState();
        
        if (this.squash < 1) this.squash = Math.min(1, this.squash + 0.1);
        if (this.stretch > 1) this.stretch = Math.max(1, this.stretch - 0.08);
    }

    updateState() {
        if (this.vy > 8) {
            this.state = 'terrified';
        } else if (this.vy > 2) {
            this.state = 'worried';
        } else if (this.vy < -5) {
            this.state = 'excited';
        } else if (this.vy < -10) {
            this.state = 'super_excited';
        } else {
            this.state = 'normal';
        }
    }

    jump(multiplier = 1) {
        this.vy = this.jumpPower * multiplier;
        this.stretch = 1.3;
        this.onIce = false;
    }

    bounce(multiplier = 1) {
        this.jump(multiplier);
    }

    land(isPerfect = false) {
        this.squash = 0.7;
        
        if (isPerfect) {
            this.perfectCombo++;
            this.state = 'proud';
            return 1.1;
        } else {
            this.perfectCombo = 0;
        }
        
        return 1;
    }

    wrap(screenWidth) {
        if (this.x < -this.radius) {
            this.x = screenWidth + this.radius;
        } else if (this.x > screenWidth + this.radius) {
            this.x = -this.radius;
        }
    }

    render(ctx, cameraY) {
        const screenY = this.y - cameraY;
        const scale = this.giantActive ? 1.3 : 1;
        const r = this.radius * scale;

        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.scale(this.stretch * scale, this.squash * scale);

        this.drawPuff(ctx, r);
        
        ctx.restore();
    }

    drawPuff(ctx, r) {
        const skinColors = {
            classic: { body: '#FFFFFF', outline: '#333' },
            blue: { body: '#87CEEB', outline: '#333' },
            pink: { body: '#FFB6C1', outline: '#333' },
            storm: { body: '#696969', outline: '#333' },
            golden: { body: '#FFD700', outline: '#333' },
            galaxy: { body: '#4B0082', outline: '#FFF' },
        };

        const colors = skinColors[this.skin] || skinColors.classic;

        // Body
        ctx.fillStyle = colors.body;
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.arc(0, -5, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Puff bumps
        ctx.beginPath();
        ctx.arc(-r * 0.5, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(r * 0.5, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Face
        const eyeY = -5;
        const eyeSize = r * 0.25;
        
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-r * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(r * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlights
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-r * 0.35 + 2, eyeY - 2, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(r * 0.35 + 2, eyeY - 2, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (this.state === 'excited' || this.state === 'super_excited' || this.state === 'proud') {
            ctx.arc(0, 5, r * 0.2, 0, Math.PI);
        } else if (this.state === 'worried' || this.state === 'terrified') {
            ctx.arc(0, 10, r * 0.15, Math.PI, Math.PI * 2);
        } else {
            ctx.arc(0, 8, r * 0.15, 0, Math.PI);
        }
        
        ctx.stroke();

        // Heart indicator
        if (this.hasHeart) {
            ctx.fillStyle = '#FF1493';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('❤️', 0, -r - 10);
        }
    }

    renderTrail(ctx, trail, cameraY) {
        for (let i = 0; i < trail.length; i++) {
            const particle = trail[i];
            const alpha = particle.life / particle.maxLife;
            const hue = (particle.hue + i * 2) % 360;
            
            ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y - cameraY, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
