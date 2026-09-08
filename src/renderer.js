export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.scale(dpr, dpr);
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawBackground(height) {
        const zones = [
            { limit: 500, top: [135, 206, 235], bottom: [176, 222, 245] },
            { limit: 1000, top: [255, 140, 66], bottom: [255, 183, 77] },
            { limit: 1750, top: [25, 25, 112], bottom: [72, 61, 139] },
            { limit: 2500, top: [75, 0, 130], bottom: [123, 31, 162] },
            { limit: Infinity, top: [0, 0, 50], bottom: [25, 25, 112] },
        ];
        
        let zone = zones[zones.length - 1];
        let prevZone = zones[zones.length - 1];
        
        for (let i = 0; i < zones.length; i++) {
            if (height < zones[i].limit) {
                zone = zones[i];
                prevZone = i > 0 ? zones[i - 1] : zones[0];
                break;
            }
        }
        
        const blend = height < 100 ? height / 100 : 1;
        const top = this.blendColors(prevZone.top, zone.top, blend);
        const bottom = this.blendColors(prevZone.bottom, zone.bottom, blend);
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, `rgb(${top[0]},${top[1]},${top[2]})`);
        gradient.addColorStop(1, `rgb(${bottom[0]},${bottom[1]},${bottom[2]})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.drawBackgroundElements(height);
    }

    blendColors(c1, c2, t) {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t),
        ];
    }

    drawBackgroundElements(height) {
        if (height < 500) {
            this.drawClouds();
            if (height < 100) this.drawHills();
        } else if (height >= 1000) {
            this.drawStars();
        }
        
        if (height >= 2500) {
            this.drawPlanets();
        }
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 5; i++) {
            const x = (i * 150) % this.width;
            const y = 100 + i * 80;
            this.drawCloud(x, y, 30);
        }
    }

    drawCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x - size * 0.5, y, size * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.5, y, size * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawHills() {
        this.ctx.fillStyle = 'rgba(76,175,80,0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x <= this.width; x += 50) {
            const y = this.height - 100 - Math.sin(x * 0.01) * 30;
            this.ctx.lineTo(x, y);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawStars() {
        this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 73) % this.width;
            const y = (i * 137) % this.height;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }

    drawPlanets() {
        this.ctx.fillStyle = 'rgba(156,39,176,0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.width * 0.8, this.height * 0.2, 40, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(156,39,176,0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.ellipse(this.width * 0.8, this.height * 0.2, 60, 15, 0.3, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawParticles(particles) {
        particles.forEach(p => {
            this.ctx.fillStyle = `rgba(${p.color},${p.life / p.maxLife})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}
