import { Platform, Star, Heart, MysteryCloud } from './platforms.js';

export class World {
    constructor(seed = null) {
        this.seed = seed !== null ? seed : Date.now();
        this.rng = this.createRNG(this.seed);
        
        this.platforms = [];
        this.stars = [];
        this.hearts = [];
        this.mysteryClouds = [];
        
        this.lastGeneratedY = 0;
        this.minGapY = 60;
        this.maxGapY = 90;
        
        this.starRushActive = false;
        this.starRushTimer = 0;
    }

    createRNG(seed) {
        let state = seed;
        return () => {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    reset() {
        this.platforms = [];
        this.stars = [];
        this.hearts = [];
        this.mysteryClouds = [];
        this.lastGeneratedY = 0;
        this.starRushActive = false;
        this.starRushTimer = 0;
    }

    getDifficulty(height) {
        if (height < 250) return 'beginner';
        if (height < 750) return 'easy';
        if (height < 1500) return 'medium';
        if (height < 2500) return 'hard';
        return 'master';
    }

    generateInitial(playerY, screenWidth) {
        this.lastGeneratedY = playerY - 100;
        
        const startPlatform = this.platforms.find(p => p.type === 'normal' && p.y === playerY);
        if (!startPlatform) {
            this.platforms.push(new Platform(screenWidth / 2, playerY, 'normal', 100));
        }
        
        this.generatePlatforms(playerY, screenWidth);
    }

    generatePlatforms(playerY, screenWidth) {
        const height = Math.max(0, -this.lastGeneratedY / 10);
        const difficulty = this.getDifficulty(height);
        
        while (this.lastGeneratedY > playerY - 800) {
            const gap = this.minGapY + this.rng() * (this.maxGapY - this.minGapY);
            this.lastGeneratedY -= gap;
            
            const platform = this.createPlatform(this.lastGeneratedY, screenWidth, difficulty);
            this.platforms.push(platform);
            
            if (this.rng() < 0.3) {
                this.createBonusPlatform(this.lastGeneratedY, screenWidth, difficulty);
            }
            
            if (this.rng() < 0.15) {
                this.stars.push(new Star(
                    this.rng() * screenWidth,
                    this.lastGeneratedY - 30
                ));
            }
            
            if (this.rng() < 0.02) {
                this.hearts.push(new Heart(
                    this.rng() * screenWidth,
                    this.lastGeneratedY - 40
                ));
            }
            
            if (this.rng() < 0.03) {
                this.mysteryClouds.push(new MysteryCloud(
                    this.rng() * screenWidth,
                    this.lastGeneratedY - 50
                ));
            }
        }
    }

    createPlatform(y, screenWidth, difficulty) {
        const x = 50 + this.rng() * (screenWidth - 100);
        
        let type = 'normal';
        let width = 70;
        
        const rand = this.rng();
        
        if (difficulty === 'beginner') {
            width = 80 + this.rng() * 20;
            if (rand < 0.05) type = 'spring';
        } else if (difficulty === 'easy') {
            width = 70 + this.rng() * 15;
            if (rand < 0.2) type = 'moving';
            else if (rand < 0.25) type = 'spring';
        } else if (difficulty === 'medium') {
            width = 60 + this.rng() * 15;
            if (rand < 0.15) type = 'moving';
            else if (rand < 0.3) type = 'breakable';
            else if (rand < 0.4) type = 'ice';
            else if (rand < 0.45) type = 'spring';
        } else if (difficulty === 'hard') {
            width = 55 + this.rng() * 10;
            if (rand < 0.2) type = 'moving';
            else if (rand < 0.35) type = 'breakable';
            else if (rand < 0.45) type = 'ice';
            else if (rand < 0.5) type = 'cloud';
            else if (rand < 0.55) type = 'spring';
            else if (rand < 0.57) type = 'spike';
        } else {
            width = 50 + this.rng() * 10;
            if (rand < 0.25) type = 'moving';
            else if (rand < 0.4) type = 'breakable';
            else if (rand < 0.5) type = 'ice';
            else if (rand < 0.55) type = 'cloud';
            else if (rand < 0.6) type = 'spring';
            else if (rand < 0.63) type = 'spike';
        }
        
        if (this.starRushActive && this.rng() < 0.3) {
            type = 'golden';
        }
        
        const platform = new Platform(x, y, type, width);
        platform.setBaseX(x);
        return platform;
    }

    createBonusPlatform(y, screenWidth, difficulty) {
        const x = 40 + this.rng() * (screenWidth - 80);
        const offsetY = (this.rng() - 0.5) * 40;
        
        const platform = new Platform(x, y + offsetY, 'normal', 50);
        platform.setBaseX(x);
        this.platforms.push(platform);
    }

    update(dt, player, cameraY, screenWidth, screenHeight) {
        this.generatePlatforms(player.y, screenWidth);
        
        this.platforms = this.platforms.filter(p => {
            p.update(dt);
            return p.y < cameraY + screenHeight + 200;
        });
        
        this.stars = this.stars.filter(s => {
            s.update(dt, player, player.magnetActive);
            return !s.collected && s.y < cameraY + screenHeight + 100;
        });
        
        this.hearts = this.hearts.filter(h => {
            h.update(dt);
            return !h.collected && h.y < cameraY + screenHeight + 100;
        });
        
        this.mysteryClouds = this.mysteryClouds.filter(m => {
            m.update(dt);
            return !m.collected && m.y < cameraY + screenHeight + 100;
        });
        
        if (this.starRushActive) {
            this.starRushTimer -= dt;
            if (this.starRushTimer <= 0) {
                this.starRushActive = false;
            }
        }
    }

    activateStarRush() {
        this.starRushActive = true;
        this.starRushTimer = 600;
    }

    render(ctx, cameraY) {
        this.platforms.forEach(p => p.render(ctx, cameraY));
        this.stars.forEach(s => s.render(ctx, cameraY));
        this.hearts.forEach(h => h.render(ctx, cameraY));
        this.mysteryClouds.forEach(m => m.render(ctx, cameraY));
    }
}
