import { Storage } from './storage.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { Effects } from './effects.js';
import { Platform, Star, Heart, MysteryCloud } from './platforms.js';

const SKINS = {
    classic: { name: 'Classic Puff', price: 0 },
    blue: { name: 'Blue Puff', price: 50 },
    pink: { name: 'Pink Puff', price: 100 },
    storm: { name: 'Storm Puff', price: 200 },
    golden: { name: 'Golden Puff', price: 500 },
    galaxy: { name: 'Galaxy Puff', price: 1000 },
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.storage = new Storage();
        this.audio = new AudioManager(this.storage);
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager(this.canvas);
        this.effects = new Effects();
        
        this.state = 'MENU';
        this.player = null;
        this.world = null;
        this.cameraY = 0;
        this.height = 0;
        this.starsCollected = 0;
        this.perfectCount = 0;
        this.trail = [];
        
        this.animationId = null;
        this.lastTime = 0;
        
        this.setupUI();
        this.setupMenuAnimation();
        this.showScreen('menu');
        this.updateMenuStats();
    }

    setupUI() {
        document.getElementById('play-btn').addEventListener('click', () => {
            this.audio.init();
            this.audio.playSound('button');
            this.startGame();
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.startGame();
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.resumeGame();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.startGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.goToMenu();
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.pauseGame();
        });

        document.getElementById('skins-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.showSkins();
        });

        document.getElementById('skins-btn-2').addEventListener('click', () => {
            this.audio.playSound('button');
            this.showSkins();
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.goToMenu();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            document.getElementById('settings-modal').classList.remove('hidden');
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            this.audio.playSound('button');
            document.getElementById('settings-modal').classList.add('hidden');
        });

        document.getElementById('sfx-toggle').addEventListener('change', (e) => {
            const enabled = this.audio.toggleSFX();
            e.target.checked = enabled;
        });

        document.getElementById('music-toggle').addEventListener('change', (e) => {
            const enabled = this.audio.toggleMusic();
            e.target.checked = enabled;
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.audio.playSound('button');
            this.share();
        });

        document.getElementById('sfx-toggle').checked = this.storage.get('sfxEnabled');
        document.getElementById('music-toggle').checked = this.storage.get('musicEnabled');
    }

    setupMenuAnimation() {
        const menuCanvas = document.getElementById('menu-puff-canvas');
        const menuCtx = menuCanvas.getContext('2d');
        let bounce = 0;
        let bounceDir = 1;
        
        const animate = () => {
            if (this.state !== 'MENU') return;
            
            menuCtx.clearRect(0, 0, 120, 120);
            bounce += bounceDir * 0.5;
            if (Math.abs(bounce) > 10) bounceDir *= -1;
            
            const puff = new Player(60, 60 + bounce, this.storage.get('selectedSkin'));
            puff.render(menuCtx, 0);
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    startGame() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.state = 'PLAYING';
        this.player = new Player(this.renderer.width / 2, this.renderer.height - 150, this.storage.get('selectedSkin'));
        this.world = new World();
        this.effects.clear();
        this.cameraY = this.player.y - this.renderer.height * 0.6;
        this.height = 0;
        this.starsCollected = 0;
        this.perfectCount = 0;
        this.trail = [];
        this.input.reset();
        this.input.enabled = true;

        this.world.platforms.push(new Platform(this.renderer.width / 2, this.player.y + 50, 'normal', 100));
        this.world.lastGeneratedY = this.player.y;

        if (!this.storage.get('tutorialCompleted')) {
            document.getElementById('tutorial-overlay').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('tutorial-overlay').classList.add('hidden');
                this.storage.set('tutorialCompleted', true);
            }, 4000);
        }

        this.showScreen('game');
        this.updateHUD();
        
        this.lastTime = performance.now();
        this.gameLoop();
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.input.enabled = false;
        this.showScreen('pause');
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this.input.enabled = true;
        this.showScreen('game');
        this.lastTime = performance.now();
    }

    gameOver() {
        this.state = 'GAME_OVER';
        this.input.enabled = false;
        this.audio.playSound('death');

        const heightM = Math.floor(this.height / 10);
        const isNewBest = heightM > this.storage.get('bestHeight');
        
        if (isNewBest) {
            this.storage.set('bestHeight', heightM);
        }
        
        this.storage.set('totalStars', this.storage.get('totalStars') + this.starsCollected);

        document.getElementById('final-height').textContent = heightM + 'm';
        document.getElementById('final-best').textContent = this.storage.get('bestHeight') + 'm';
        document.getElementById('final-stars').textContent = this.starsCollected;
        document.getElementById('final-perfects').textContent = this.perfectCount;

        const motivation = document.getElementById('motivation-text');
        if (isNewBest) {
            motivation.textContent = 'NEW BEST!';
        } else {
            const diff = this.storage.get('bestHeight') - heightM;
            if (diff < 50) {
                motivation.textContent = `You were only ${diff}m from your Best!`;
            } else {
                motivation.textContent = '';
            }
        }

        setTimeout(() => {
            this.showScreen('gameover');
        }, 1000);
    }

    goToMenu() {
        this.state = 'MENU';
        this.updateMenuStats();
        this.showScreen('menu');
        this.setupMenuAnimation();
    }

    showSkins() {
        this.state = 'SKINS';
        this.renderSkins();
        this.showScreen('skins');
    }

    renderSkins() {
        const grid = document.getElementById('skins-grid');
        grid.innerHTML = '';
        document.getElementById('skins-stars').textContent = this.storage.get('totalStars');

        const unlocked = this.storage.get('unlockedSkins');
        const selected = this.storage.get('selectedSkin');

        Object.entries(SKINS).forEach(([key, skin]) => {
            const card = document.createElement('div');
            card.className = 'skin-card';
            
            const isUnlocked = unlocked.includes(key);
            const isSelected = selected === key;
            
            if (isSelected) card.classList.add('selected');
            if (!isUnlocked) card.classList.add('locked');

            const canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            const puff = new Player(40, 40, key);
            puff.render(ctx, 0);

            card.appendChild(canvas);
            
            const name = document.createElement('div');
            name.className = 'skin-name';
            name.textContent = skin.name;
            card.appendChild(name);

            if (!isUnlocked) {
                const price = document.createElement('div');
                price.className = 'skin-price';
                price.textContent = `⭐ ${skin.price}`;
                card.appendChild(price);
            }

            card.addEventListener('click', () => {
                if (isUnlocked) {
                    this.storage.set('selectedSkin', key);
                    this.audio.playSound('button');
                    this.renderSkins();
                } else if (this.storage.get('totalStars') >= skin.price) {
                    this.storage.set('totalStars', this.storage.get('totalStars') - skin.price);
                    unlocked.push(key);
                    this.storage.set('unlockedSkins', unlocked);
                    this.storage.set('selectedSkin', key);
                    this.audio.playSound('star');
                    this.renderSkins();
                }
            });

            grid.appendChild(card);
        });
    }

    share() {
        const heightM = Math.floor(this.height / 10);
        const isBest = heightM === this.storage.get('bestHeight');
        const text = isBest
            ? `I just reached a new record of ${heightM}m in SkyPuff!`
            : `I reached ${heightM}m in SkyPuff! ☁️🌈 Can you beat me?`;

        if (navigator.share) {
            navigator.share({ text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert('Score copied to clipboard!');
            });
        }
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        if (screenName === 'menu') {
            document.getElementById('menu-screen').classList.add('active');
        } else if (screenName === 'game') {
            document.getElementById('game-hud').classList.add('active');
        } else if (screenName === 'pause') {
            document.getElementById('game-hud').classList.add('active');
            document.getElementById('pause-screen').classList.add('active');
        } else if (screenName === 'gameover') {
            document.getElementById('gameover-screen').classList.add('active');
        } else if (screenName === 'skins') {
            document.getElementById('skins-screen').classList.add('active');
        }
    }

    updateMenuStats() {
        document.getElementById('menu-best').textContent = this.storage.get('bestHeight') + 'm';
        document.getElementById('menu-stars').textContent = this.storage.get('totalStars');
    }

    updateHUD() {
        const heightM = Math.floor(this.height / 10);
        document.getElementById('height-display').textContent = heightM + 'm';
        document.getElementById('best-display').textContent = 'BEST ' + this.storage.get('bestHeight') + 'm';
        document.getElementById('stars-display').textContent = '⭐ ' + this.starsCollected;

        const best = this.storage.get('bestHeight');
        const diff = best - heightM;
        
        if (best > 0 && diff > 0 && diff <= 50) {
            const msgArea = document.getElementById('message-area');
            if (diff === 50 && !this.lastMsg50) {
                this.showMessage('50m TO YOUR BEST!');
                this.lastMsg50 = true;
            } else if (diff === 20 && !this.lastMsg20) {
                this.showMessage('20m TO YOUR BEST!');
                this.lastMsg20 = true;
            } else if (diff <= 5 && !this.lastMsgClose) {
                this.showMessage('SO CLOSE!');
                this.lastMsgClose = true;
            }
        } else if (heightM > best && best > 0 && !this.newBestShown) {
            this.showMessage('NEW BEST!');
            this.audio.playSound('newbest');
            this.newBestShown = true;
        }
    }

    showMessage(text) {
        const msgArea = document.getElementById('message-area');
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = text;
        msgArea.appendChild(msg);
        
        setTimeout(() => msg.remove(), 2000);
    }

    gameLoop() {
        if (this.state !== 'PLAYING' && this.state !== 'PAUSED') {
            this.animationId = null;
            return;
        }

        const currentTime = performance.now();
        let dt = (currentTime - this.lastTime) / 16.667;
        this.lastTime = currentTime;

        if (dt > 5) dt = 5;

        if (this.state === 'PLAYING') {
            const timeScale = this.effects.getTimeScale();
            dt *= timeScale;
            this.update(dt);
        }

        this.render();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        const direction = this.input.getDirection();
        this.player.update(dt, direction);
        this.player.wrap(this.renderer.width);

        const prevCameraY = this.cameraY;
        const targetCameraY = this.player.y - this.renderer.height * 0.4;
        
        if (targetCameraY < this.cameraY) {
            this.cameraY += (targetCameraY - this.cameraY) * 0.1;
        }

        this.height = Math.max(this.height, -this.cameraY);

        this.world.update(dt, this.player, this.cameraY, this.renderer.width, this.renderer.height);

        this.checkCollisions();

        if (this.player.vy < 0) {
            const hue = (this.height * 0.5) % 360;
            this.trail.push({
                x: this.player.x,
                y: this.player.y + this.player.radius,
                hue,
                size: 3 + Math.abs(this.player.vy) * 0.3,
                life: 20,
                maxLife: 20
            });
        }

        this.trail = this.trail.filter(p => {
            p.life -= dt;
            return p.life > 0;
        });

        this.effects.update(dt, this.cameraY);

        if (this.player.y > this.cameraY + this.renderer.height + 100) {
            if (this.player.hasHeart) {
                this.activateHeartSave();
            } else {
                this.gameOver();
            }
        }

        this.updateHUD();
    }

    checkCollisions() {
        for (const platform of this.world.platforms) {
            if (platform.checkCollision(this.player)) {
                const isPerfect = Math.abs(this.player.x - platform.x) < platform.width * 0.15;
                const bounceMultiplier = this.player.land(isPerfect);
                const platformEffect = platform.onLand(this.player);
                
                if (platformEffect.effect === 'death') {
                    this.gameOver();
                    return;
                }
                
                this.player.jump(platformEffect.multiplier * bounceMultiplier);
                this.audio.playSound('bounce');
                
                if (isPerfect) {
                    this.perfectCount++;
                    this.showPerfectMessage();
                    this.audio.playSound('perfect');
                    this.effects.addBurst(platform.x, platform.y, 8);
                }
                
                if (platformEffect.effect === 'boost') {
                    this.audio.playSound('spring');
                    this.effects.addFloatingText(platform.x, platform.y - 20, 'BOOST!', '#9C27B0');
                    for (let i = 0; i < 15; i++) {
                        this.trail.push({
                            x: this.player.x + (Math.random() - 0.5) * 20,
                            y: this.player.y + this.player.radius,
                            hue: Math.random() * 360,
                            size: 5,
                            life: 30,
                            maxLife: 30
                        });
                    }
                } else if (platformEffect.effect === 'golden') {
                    this.world.activateStarRush();
                    this.audio.playSound('starrush');
                    this.showMessage('STAR RUSH!');
                    this.effects.addBurst(platform.x, platform.y, 20, '255,215,0');
                }
                
                this.effects.addParticle(this.player.x, platform.y, '255,255,255');
                break;
            }
        }

        for (const star of this.world.stars) {
            if (star.checkCollision(this.player)) {
                star.collect();
                this.starsCollected++;
                this.audio.playSound('star');
                this.effects.addBurst(star.x, star.y, 8);
                this.effects.addFloatingText(star.x, star.y, '+1 ⭐');
            }
        }

        for (const heart of this.world.hearts) {
            if (heart.checkCollision(this.player)) {
                heart.collect();
                this.player.hasHeart = true;
                this.audio.playSound('heart');
                this.effects.addFloatingText(heart.x, heart.y, '❤️ +1');
            }
        }

        for (const cloud of this.world.mysteryClouds) {
            if (cloud.checkCollision(this.player)) {
                const effect = cloud.collect();
                this.audio.playSound('mystery');
                this.activateMysteryEffect(effect, cloud.x, cloud.y);
            }
        }

        if (this.player.vy > 5 && this.player.y > this.cameraY + this.renderer.height * 0.7) {
            if (!this.closeCallTriggered) {
                this.closeCallTriggered = true;
            }
        } else if (this.closeCallTriggered && this.player.vy < 0) {
            this.effects.activateSlowMotion(20);
            this.audio.playSound('closecall');
            this.effects.addFloatingText(this.player.x, this.player.y - 30, 'CLOSE CALL!');
            this.starsCollected += 3;
            this.closeCallTriggered = false;
        }
    }

    showPerfectMessage() {
        const combo = this.player.perfectCombo;
        let text = 'PERFECT!';
        
        if (combo === 2) text = 'PERFECT x2!';
        else if (combo === 3) text = 'PERFECT x3!';
        else if (combo === 5) text = 'AMAZING x5!';
        else if (combo === 10) text = 'SKY MASTER x10!';
        else if (combo > 3) text = `PERFECT x${combo}!`;
        
        this.effects.addFloatingText(this.player.x, this.player.y - 40, text, '#4CAF50');
    }

    activateMysteryEffect(effect, x, y) {
        switch(effect) {
            case 'starburst':
                this.effects.addFloatingText(x, y, 'STAR BURST!');
                for (let i = 0; i < 5; i++) {
                    this.world.stars.push(new Star(
                        x + (Math.random() - 0.5) * 100,
                        y + (Math.random() - 0.5) * 100
                    ));
                }
                break;
            case 'superboost':
                this.effects.addFloatingText(x, y, 'SUPER BOOST!');
                this.player.jump(1.5);
                break;
            case 'magnet':
                this.effects.addFloatingText(x, y, 'MAGNET!');
                this.player.magnetActive = true;
                setTimeout(() => { this.player.magnetActive = false; }, 10000);
                break;
            case 'giant':
                this.effects.addFloatingText(x, y, 'GIANT PUFF!');
                this.player.giantActive = true;
                setTimeout(() => { this.player.giantActive = false; }, 8000);
                break;
            case 'rainbow':
                this.effects.addFloatingText(x, y, 'RAINBOW RUSH!');
                this.player.rainbowRush = true;
                setTimeout(() => { this.player.rainbowRush = false; }, 10000);
                break;
        }
    }

    activateHeartSave() {
        this.player.hasHeart = false;
        this.audio.playSound('heart');
        this.effects.addFloatingText(this.player.x, this.player.y, 'PUFF SAVE!', '#FF1493');
        
        for (let i = 0; i < 20; i++) {
            this.effects.addBurst(this.player.x, this.player.y, 5, `hsl(${Math.random() * 360},80%,60%)`);
        }
        
        const safePlatform = this.world.platforms
            .filter(p => p.y < this.player.y && !p.broken && p.type !== 'spike')
            .sort((a, b) => b.y - a.y)[0];
        
        if (safePlatform) {
            this.player.y = safePlatform.y - 50;
            this.player.x = safePlatform.x;
            this.player.vy = -15;
            this.player.vx = 0;
        }
    }

    render() {
        this.renderer.clear();
        
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            const heightM = Math.floor(this.height / 10);
            this.renderer.drawBackground(heightM);
            
            this.world.render(this.renderer.ctx, this.cameraY);
            
            this.player.renderTrail(this.renderer.ctx, this.trail, this.cameraY);
            this.player.render(this.renderer.ctx, this.cameraY);
            
            this.effects.render(this.renderer.ctx, this.cameraY);
        }
    }
}

new Game();
