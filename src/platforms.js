export class Platform {
    constructor(x, y, type = 'normal', width = 70) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = width;
        this.height = 16;
        
        this.vx = 0;
        this.vy = 0;
        this.moveRange = 0;
        this.moveSpeed = 0;
        this.moveOffset = 0;
        
        this.broken = false;
        this.breakTimer = 0;
        this.fadeTimer = 0;
        this.used = false;
        
        this.springActive = false;
        this.springAnim = 0;
        
        if (type === 'moving') {
            this.moveRange = 50 + Math.random() * 50;
            this.moveSpeed = 0.5 + Math.random() * 0.5;
        }
    }

    update(dt) {
        if (this.type === 'moving' && !this.broken) {
            this.moveOffset += this.moveSpeed * dt;
            this.x = this.baseX + Math.sin(this.moveOffset * 0.02) * this.moveRange;
        }
        
        if (this.type === 'breakable' && this.used) {
            this.breakTimer += dt;
            if (this.breakTimer > 30) {
                this.broken = true;
                this.vy = 5;
            }
        }
        
        if (this.type === 'cloud' && this.used) {
            this.fadeTimer += dt;
        }
        
        if (this.broken) {
            this.y += this.vy;
        }
        
        if (this.springAnim > 0) {
            this.springAnim -= dt * 0.1;
        }
    }

    setBaseX(x) {
        this.baseX = x;
        this.x = x;
    }

    checkCollision(player) {
        if (this.broken) return false;
        if (this.type === 'cloud' && this.fadeTimer > 60) return false;
        
        const playerBottom = player.y + player.radius;
        const playerTop = player.y - player.radius;
        const platformTop = this.y;
        const platformBottom = this.y + this.height;
        
        const horizontalOverlap = 
            player.x + player.radius > this.x - this.width / 2 &&
            player.x - player.radius < this.x + this.width / 2;
        
        if (!horizontalOverlap) return false;
        
        if (player.vy > 0 && 
            playerBottom >= platformTop && 
            playerTop < platformTop &&
            playerBottom <= platformTop + 10) {
            return true;
        }
        
        return false;
    }

    onLand(player) {
        if (this.type === 'spring') {
            this.springActive = true;
            this.springAnim = 1;
            return { multiplier: 1.8, effect: 'boost' };
        }
        
        if (this.type === 'breakable' && !this.used) {
            this.used = true;
            return { multiplier: 1, effect: 'break' };
        }
        
        if (this.type === 'ice') {
            player.onIce = true;
            return { multiplier: 1, effect: 'ice' };
        }
        
        if (this.type === 'cloud' && !this.used) {
            this.used = true;
            return { multiplier: 1, effect: 'cloud' };
        }
        
        if (this.type === 'golden') {
            return { multiplier: 1, effect: 'golden' };
        }
        
        if (this.type === 'spike') {
            return { multiplier: 0, effect: 'death' };
        }
        
        return { multiplier: 1, effect: 'normal' };
    }

    render(ctx, cameraY) {
        if (this.broken || (this.type === 'cloud' && this.fadeTimer > 60)) return;
        
        const screenY = this.y - cameraY;
        const halfWidth = this.width / 2;
        
        ctx.save();
        
        if (this.type === 'breakable' && this.used) {
            const shake = Math.sin(this.breakTimer * 0.5) * 2;
            ctx.translate(shake, 0);
        }
        
        if (this.type === 'cloud' && this.used) {
            const alpha = 1 - (this.fadeTimer / 60);
            ctx.globalAlpha = Math.max(0, alpha);
        }
        
        switch(this.type) {
            case 'normal':
                this.drawNormal(ctx, screenY, halfWidth);
                break;
            case 'moving':
                this.drawMoving(ctx, screenY, halfWidth);
                break;
            case 'breakable':
                this.drawBreakable(ctx, screenY, halfWidth);
                break;
            case 'ice':
                this.drawIce(ctx, screenY, halfWidth);
                break;
            case 'spring':
                this.drawSpring(ctx, screenY, halfWidth);
                break;
            case 'cloud':
                this.drawCloud(ctx, screenY, halfWidth);
                break;
            case 'spike':
                this.drawSpike(ctx, screenY, halfWidth);
                break;
            case 'golden':
                this.drawGolden(ctx, screenY, halfWidth);
                break;
        }
        
        ctx.restore();
    }

    drawNormal(ctx, y, hw) {
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#66BB6A';
        ctx.fillRect(this.x - hw, y, this.width, 4);
    }

    drawMoving(ctx, y, hw) {
        ctx.fillStyle = '#2196F3';
        ctx.strokeStyle = '#1565C0';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#64B5F6';
        ctx.fillRect(this.x - hw, y, this.width, 4);
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('◄ ►', this.x, y + this.height / 2 + 4);
    }

    drawBreakable(ctx, y, hw) {
        ctx.fillStyle = '#8D6E63';
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 10, y);
        ctx.lineTo(this.x + 5, y + this.height);
        ctx.stroke();
    }

    drawIce(ctx, y, hw) {
        ctx.fillStyle = '#B3E5FC';
        ctx.strokeStyle = '#81D4FA';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#E1F5FE';
        ctx.fillRect(this.x - hw, y, this.width, 4);
    }

    drawSpring(ctx, y, hw) {
        ctx.fillStyle = '#9C27B0';
        ctx.strokeStyle = '#6A1B9A';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        const springHeight = 12 - (this.springAnim * 8);
        ctx.fillStyle = '#E1BEE7';
        ctx.fillRect(this.x - 8, y - springHeight, 16, springHeight);
        
        ctx.strokeStyle = '#4A148C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 8, y - springHeight);
        ctx.lineTo(this.x - 4, y - springHeight + 4);
        ctx.lineTo(this.x, y - springHeight);
        ctx.lineTo(this.x + 4, y - springHeight + 4);
        ctx.lineTo(this.x + 8, y - springHeight);
        ctx.stroke();
    }

    drawCloud(ctx, y, hw) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = 'rgba(200,200,200,0.9)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(this.x - hw * 0.3, y + this.height / 2, this.height * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(this.x + hw * 0.3, y + this.height / 2, this.height * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(this.x, y + this.height / 2, this.height * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    drawSpike(ctx, y, hw) {
        ctx.fillStyle = '#F44336';
        ctx.strokeStyle = '#C62828';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#D32F2F';
        const spikeCount = 5;
        const spikeWidth = this.width / spikeCount;
        for (let i = 0; i < spikeCount; i++) {
            const spikeX = this.x - hw + i * spikeWidth + spikeWidth / 2;
            ctx.beginPath();
            ctx.moveTo(spikeX - 4, y);
            ctx.lineTo(spikeX, y - 10);
            ctx.lineTo(spikeX + 4, y);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawGolden(ctx, y, hw) {
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 3;
        this.roundRect(ctx, this.x - hw, y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#FFEB3B';
        ctx.fillRect(this.x - hw, y, this.width, 4);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', this.x, y + this.height / 2 + 7);
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

export class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.collected = false;
        this.animTimer = 0;
        this.rotation = Math.random() * Math.PI * 2;
        this.baseY = y;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(dt, player, magnetActive) {
        if (this.collected) return;
        
        this.rotation += 0.05;
        this.floatOffset += 0.03;
        this.y = this.baseY + Math.sin(this.floatOffset) * 5;
        
        if (magnetActive && player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 150) {
                const speed = 3;
                this.x += (dx / dist) * speed;
                this.baseY += (dy / dist) * speed;
            }
        }
    }

    checkCollision(player) {
        if (this.collected) return false;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < player.radius + this.radius;
    }

    collect() {
        this.collected = true;
        this.animTimer = 20;
    }

    render(ctx, cameraY) {
        if (this.collected && this.animTimer <= 0) return;
        
        const screenY = this.y - cameraY;
        
        ctx.save();
        ctx.translate(this.x, screenY);
        ctx.rotate(this.rotation);
        
        if (this.collected) {
            const scale = 1 + (20 - this.animTimer) * 0.1;
            const alpha = this.animTimer / 20;
            ctx.scale(scale, scale);
            ctx.globalAlpha = alpha;
        }
        
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * this.radius * 0.5;
            const innerY = Math.sin(innerAngle) * this.radius * 0.5;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}

export class Heart {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.baseY = y;
    }

    update(dt) {
        this.floatOffset += 0.03;
        this.y = this.baseY + Math.sin(this.floatOffset) * 8;
    }

    checkCollision(player) {
        if (this.collected || player.hasHeart) return false;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < player.radius + this.radius;
    }

    collect() {
        this.collected = true;
    }

    render(ctx, cameraY) {
        if (this.collected) return;
        
        const screenY = this.y - cameraY;
        
        ctx.save();
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', this.x, screenY);
        ctx.restore();
    }
}

export class MysteryCloud {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.baseY = y;
    }

    update(dt) {
        this.floatOffset += 0.02;
        this.y = this.baseY + Math.sin(this.floatOffset) * 10;
    }

    checkCollision(player) {
        if (this.collected) return false;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < player.radius + this.radius;
    }

    collect() {
        this.collected = true;
        const effects = ['starburst', 'superboost', 'magnet', 'giant', 'rainbow'];
        return effects[Math.floor(Math.random() * effects.length)];
    }

    render(ctx, cameraY) {
        if (this.collected) return;
        
        const screenY = this.y - cameraY;
        
        ctx.save();
        
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(this.x - 10, screenY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(this.x + 10, screenY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(this.x, screenY - 5, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#9C27B0';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', this.x, screenY);
        
        ctx.restore();
    }
}
