// game.js — main state machine, game loop, and system orchestration
import { loadSave, saveSave } from './storage.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { EffectsSystem } from './effects.js';
import { Renderer, SKINS } from './renderer.js';
import { Puff, PuffState, BOUNCE_VELOCITY, SPRING_BOUNCE_VELOCITY, MAX_H_SPEED, PERFECT_BOUNCE_MULT } from './player.js';
import { PLATFORM_TYPES, updatePlatform, testLanding, isPlatformSolid } from './platforms.js';
import { generateWorld, environmentForHeight, PIXELS_PER_METER, bandForHeight } from './world.js';

export const GameState = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  SKINS: 'SKINS',
});

const COMBO_LABELS = (n) => {
  if (n >= 10) return `SKY MASTER x${n}`;
  if (n >= 5) return `AMAZING x${n}`;
  if (n >= 2) return `PERFECT x${n}`;
  return 'PERFECT!';
};

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.save = loadSave();
    this.audio = new AudioManager({ sfxOn: this.save.sfxOn, musicOn: this.save.musicOn });
    this.input = new InputManager(this.canvas);
    this.effects = new EffectsSystem();

    this.state = GameState.MENU;
    this.player = null;
    this.world = null;
    this.camera = { y: 0 };
    this.startY = 0;
    this.timeScale = 1;
    this._slowMoTimer = 0;
    this.elapsed = 0;
    this._lastTs = 0;
    this._running = false;

    this.session = this._freshSession();
    this._menuPuff = new Puff(0, 0);
    this._menuBaseY = 0;

    this._bindDom();
    this._bindButtons();
    window.addEventListener('resize', () => this._onResize());
    this._onResize();
    this.input.attach();

    this._refreshMenuStats();
    this._loop = this._loop.bind(this);
    this._start();
  }

  _freshSession() {
    return {
      heightMeters: 0,
      stars: 0,
      perfects: 0,
      combo: 0,
      hasHeart: false,
      starRushTimer: 0,
      iceSlideTimer: 0,
      magnetActive: false,
      recordFlags: { r50: false, r20: false, close: false, newBest: false },
      firstLandingDone: false,
    };
  }

  // ---- DOM wiring -----------------------------------------------------
  _bindDom() {
    this.el = {
      hud: document.getElementById('hud'),
      hudHeight: document.getElementById('hud-height'),
      hudBest: document.getElementById('hud-best'),
      hudStars: document.getElementById('hud-stars'),
      menu: document.getElementById('menu-screen'),
      menuBest: document.getElementById('menu-best'),
      menuStars: document.getElementById('menu-stars'),
      pause: document.getElementById('pause-screen'),
      gameOver: document.getElementById('gameover-screen'),
      goHeight: document.getElementById('go-height'),
      goBest: document.getElementById('go-best'),
      goStars: document.getElementById('go-stars'),
      goPerfects: document.getElementById('go-perfects'),
      goHint: document.getElementById('go-hint'),
      skins: document.getElementById('skins-screen'),
      skinsList: document.getElementById('skins-list'),
      skinsStars: document.getElementById('skins-stars'),
      tutorial: document.getElementById('tutorial-overlay'),
      settings: document.getElementById('settings-screen'),
      sfxToggle: document.getElementById('sfx-toggle'),
      musicToggle: document.getElementById('music-toggle'),
    };
  }

  _bindButtons() {
    const on = (id, fn) => {
      const elm = document.getElementById(id);
      if (elm) elm.addEventListener('click', fn);
    };
    on('btn-play', () => { this.audio.resume(); this.audio.button(); this._startRun(); });
    on('btn-skins', () => { this.audio.button(); this._showSkins(); });
    on('btn-skins-back', () => { this.audio.button(); this._showMenu(); });
    on('btn-settings', () => { this.audio.button(); this._toggle(this.el.settings); });
    on('btn-settings-close', () => { this.audio.button(); this._toggle(this.el.settings, true); });
    on('btn-pause', () => { this.audio.button(); this._pause(); });
    on('btn-resume', () => { this.audio.button(); this._resume(); });
    on('btn-restart-from-pause', () => { this.audio.button(); this._startRun(); });
    on('btn-quit-to-menu', () => { this.audio.button(); this._showMenu(); });
    on('btn-play-again', () => { this.audio.button(); this._startRun(); });
    on('btn-share', () => { this.audio.button(); this._share(); });
    on('btn-gameover-skins', () => { this.audio.button(); this._showSkins(); });
    on('sfx-toggle', (e) => { this.save.sfxOn = e.target.checked; this.audio.setSfx(e.target.checked); saveSave(this.save); });
    on('music-toggle', (e) => {
      this.save.musicOn = e.target.checked;
      this.audio.setMusic(e.target.checked);
      saveSave(this.save);
      if (e.target.checked && this.state === GameState.PLAYING) this.audio.startMusic();
    });
    if (this.el.sfxToggle) this.el.sfxToggle.checked = this.save.sfxOn;
    if (this.el.musicToggle) this.el.musicToggle.checked = this.save.musicOn;
  }

  _toggle(el, forceHide) {
    if (!el) return;
    if (forceHide) el.classList.add('hidden');
    else el.classList.toggle('hidden');
  }

  _onResize() {
    this.renderer.resize();
    if (this.world) this.world.setWorldWidth(this.renderer.width);
  }

  // ---- Screen/state transitions ---------------------------------------
  _showMenu() {
    this.state = GameState.MENU;
    this._setScreens({ menu: true });
    this._refreshMenuStats();
    this.audio.stopMusic();
  }

  _showSkins() {
    this._renderSkinsList();
    this.state = GameState.SKINS;
    this._setScreens({ skins: true });
  }

  _setScreens({ menu = false, pause = false, gameover = false, skins = false } = {}) {
    this._toggle(this.el.menu, !menu);
    this._toggle(this.el.pause, !pause);
    this._toggle(this.el.gameOver, !gameover);
    this._toggle(this.el.skins, !skins);
    this._toggle(this.el.hud, !(this.state === GameState.PLAYING || this.state === GameState.PAUSED));
  }

  _refreshMenuStats() {
    if (this.el.menuBest) this.el.menuBest.textContent = `${Math.floor(this.save.bestHeight)}m`;
    if (this.el.menuStars) this.el.menuStars.textContent = `${this.save.totalStars}`;
  }

  _renderSkinsList() {
    if (!this.el.skinsList) return;
    if (this.el.skinsStars) this.el.skinsStars.textContent = `${this.save.totalStars}`;
    this.el.skinsList.innerHTML = '';
    for (const skin of SKINS) {
      const unlocked = this.save.unlockedSkins.includes(skin.id);
      const selected = this.save.selectedSkin === skin.id;
      const card = document.createElement('button');
      card.className = 'skin-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');
      card.innerHTML = `
        <span class="skin-swatch" style="background:${skin.body}"></span>
        <span class="skin-name">${skin.name}</span>
        <span class="skin-cost">${unlocked ? (selected ? 'EQUIPPED' : 'SELECT') : `\u2605 ${skin.cost}`}</span>`;
      card.addEventListener('click', () => {
        this.audio.button();
        if (unlocked) {
          this.save.selectedSkin = skin.id;
        } else if (this.save.totalStars >= skin.cost) {
          this.save.totalStars -= skin.cost;
          this.save.unlockedSkins.push(skin.id);
          this.save.selectedSkin = skin.id;
        } else {
          return;
        }
        saveSave(this.save);
        this._renderSkinsList();
      });
      this.el.skinsList.appendChild(card);
    }
  }

  _pause() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this._setScreens({ pause: true });
    this.audio.stopMusic();
  }

  _resume() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this._setScreens({});
    this.audio.startMusic();
  }

  _share() {
    const h = Math.floor(this.session.heightMeters);
    const beatBest = h >= this.save.bestHeight && h > 0;
    const text = beatBest
      ? `I just reached a new record of ${h}m in SkyPuff! \u2601\ufe0f\ud83c\udf08`
      : `I reached ${h}m in SkyPuff! \u2601\ufe0f\ud83c\udf08 Can you beat me?`;
    if (navigator.share) {
      navigator.share({ text, title: 'SkyPuff' }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this._flashHint('Copied to clipboard!');
      }).catch(() => this._flashHint(text));
    } else {
      this._flashHint(text);
    }
  }

  _flashHint(msg) {
    if (this.el.goHint) this.el.goHint.textContent = msg;
  }

  // ---- Run lifecycle ----------------------------------------------------
  _startRun() {
    this.session = this._freshSession();
    const width = this.renderer.width || window.innerWidth;
    const height = this.renderer.height || window.innerHeight;
    this.startY = 0;
    this.player = new Puff(width / 2, -height * 0.25);
    this.player.applyBounce(BOUNCE_VELOCITY);
    const seed = (Math.random() * 0xffffffff) >>> 0;
    this.world = generateWorld(seed, width, MAX_H_SPEED);
    this.world.seedStart(width / 2, this.player.y + this.player.radius + 4);
    this.camera.y = this.player.y - height * 0.75;
    this.world.generateUpTo(this.camera.y - height, this.startY);
    this.effects.reset();
    this.state = GameState.PLAYING;
    this._setScreens({});

    if (!this.save.tutorialSeen) {
      this._runTutorial();
    }

    this.audio.resume();
    this.audio.setIntensity(0);
    this.audio.startMusic();
  }

  _runTutorial() {
    if (!this.el.tutorial) return;
    this.el.tutorial.classList.remove('hidden');
    const line = this.el.tutorial.querySelector('.tutorial-text');
    if (line) line.textContent = '\u2190 DRAG TO MOVE \u2192';
    clearTimeout(this._tutTimer1);
    clearTimeout(this._tutTimer2);
    this._tutTimer1 = setTimeout(() => {
      if (line) line.textContent = 'LAND ON PLATFORMS!';
    }, 2200);
    this._tutTimer2 = setTimeout(() => {
      this.el.tutorial.classList.add('hidden');
      this.save.tutorialSeen = true;
      saveSave(this.save);
    }, 4400);
  }

  _endRun() {
    this.player.die();
    this.audio.death();
    this.audio.stopMusic();
    const finalHeight = Math.floor(this.session.heightMeters);
    const isNewBest = finalHeight > this.save.bestHeight;
    if (isNewBest) this.save.bestHeight = finalHeight;
    this.save.totalStars += this.session.stars;
    this.save.perfectsBest = Math.max(this.save.perfectsBest, this.session.perfects);
    saveSave(this.save);

    setTimeout(() => {
      this.state = GameState.GAME_OVER;
      this._setScreens({ gameover: true });
      if (this.el.goHeight) this.el.goHeight.textContent = `${finalHeight}m`;
      if (this.el.goBest) this.el.goBest.textContent = `${Math.floor(this.save.bestHeight)}m`;
      if (this.el.goStars) this.el.goStars.textContent = `${this.session.stars}`;
      if (this.el.goPerfects) this.el.goPerfects.textContent = `${this.session.perfects}`;
      const diff = this.save.bestHeight - finalHeight;
      if (isNewBest) this._flashHint('NEW BEST! Amazing climb!');
      else if (diff > 0 && diff <= 60) this._flashHint(`You were only ${Math.ceil(diff)}m from your Best!`);
      else this._flashHint('One more run — you can get higher!');
    }, 650);
  }

  // ---- Main loop ---------------------------------------------------------
  _start() {
    if (this._running) return; // guard against duplicate rAF loops
    this._running = true;
    this._lastTs = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(ts) {
    requestAnimationFrame(this._loop);
    let dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    dt = Math.min(dt, 1 / 30);
    this.elapsed += dt;

    if (this._slowMoTimer > 0) {
      this._slowMoTimer -= dt;
      this.timeScale = 0.35;
    } else {
      this.timeScale = 1;
    }
    const stepDt = dt * this.timeScale;

    if (this.state === GameState.PLAYING) {
      this._update(stepDt);
    } else if (this.state === GameState.MENU) {
      this._updateMenuIdle(dt);
    }
    this._render();
  }

  _updateMenuIdle(dt) {
    const width = this.renderer.width, height = this.renderer.height;
    this._menuBaseY = height * 0.55;
    const t = this.elapsed;
    this._menuPuff.x = width / 2;
    this._menuPuff.y = this._menuBaseY + Math.sin(t * 2.4) * 18;
    this._menuPuff.vx = Math.cos(t * 2.4) * 40;
    this._menuPuff.vy = Math.cos(t * 2.4) * -60;
    this._menuPuff.state = PuffState.NORMAL;
    this._menuPuff.squashX = 1;
    this._menuPuff.squashY = 1;
    if (Math.random() < 0.3) this.effects.addRainbowPoint(this._menuPuff.x, this._menuPuff.y + 14, 0.4);
    this.effects.update(dt);
  }

  _update(dt) {
    const width = this.renderer.width, height = this.renderer.height;
    const player = this.player, world = this.world, session = this.session;

    const axis = this.input.update();
    const prevFootY = player.y + player.radius;
    const wasFalling = player.vy > 0;
    player.update(dt, axis, session.iceSlideTimer > 0);
    if (session.iceSlideTimer > 0) session.iceSlideTimer -= dt;
    if (session.starRushTimer > 0) {
      session.starRushTimer -= dt;
      if (session.starRushTimer <= 0) this.audio.setIntensity(0);
    }

    // Screen wrap
    if (player.x + player.radius < 0) player.x = width + player.radius;
    else if (player.x - player.radius > width) player.x = -player.radius;

    // Rainbow trail while rising
    if (player.vy < -40) {
      const speed = Math.min(1, Math.abs(player.vy) / 1000);
      const intensity = player.state === PuffState.SUPER ? 1 : 0.4 + speed * 0.5;
      this.effects.addRainbowPoint(player.x, player.y + player.radius * 0.6, intensity);
    }

    // Platform updates + landing resolution
    let landed = false;
    for (const p of world.platforms) {
      updatePlatform(p, dt, width);
      if (p.type === PLATFORM_TYPES.SPIKE) {
        const dx = Math.abs(player.x - (p.x + p.width / 2));
        const dy = Math.abs((player.y) - p.y);
        if (dx < p.width / 2 + player.radius * 0.5 && dy < player.radius) {
          this._killPlayer();
          return;
        }
        continue;
      }
      if (landed || !wasFalling) continue;
      if (testLanding(player, p, prevFootY)) {
        landed = true;
        this._resolveLanding(player, p, width, height);
      }
    }

    // Standalone collectibles (heart / mystery cloud)
    for (const c of world.collectibles) {
      if (c.collected) continue;
      const dx = player.x - c.x, dy = player.y - c.y;
      const range = session.magnetActive ? 90 : 26;
      if (dx * dx + dy * dy < range * range) {
        c.collected = true;
        this._collectFloating(c);
      }
    }

    // Camera: only ever advances upward (never regresses), keeps Puff in upper-40% band
    const screenY = player.y - this.camera.y;
    const threshold = height * 0.4;
    if (screenY < threshold) {
      const target = player.y - threshold;
      if (target < this.camera.y) {
        this.camera.y += (target - this.camera.y) * Math.min(1, dt * 6);
      }
    }

    // Height score (monotonic — never decreases within a run)
    const climbed = Math.max(0, (this.startY - player.y) / PIXELS_PER_METER);
    if (climbed > session.heightMeters) session.heightMeters = climbed;
    this._updateRecordHints();

    // World streaming
    world.generateUpTo(this.camera.y - height * 0.6, this.startY);
    world.pruneBelow(this.camera.y + height * 1.6);

    // Death: falling below the visible screen
    const bottom = this.camera.y + height + player.radius * 2;
    if (player.y > bottom) {
      if (session.hasHeart) {
        this._triggerHeartSave(width, height);
      } else {
        this._killPlayer();
        return;
      }
    }

    this.effects.update(dt);
    this._updateHud();
  }

  _resolveLanding(player, p, width, height) {
    const session = this.session;
    const center = p.x + p.width / 2;
    const offset = Math.abs(player.x - center) / (p.width / 2);
    const isPerfect = offset < 0.32;

    let bounceVel = BOUNCE_VELOCITY;
    let landingSoundPlayed = false;

    if (p.type === PLATFORM_TYPES.SPRING) {
      bounceVel = SPRING_BOUNCE_VELOCITY;
      this.audio.spring();
      landingSoundPlayed = true;
      this.effects.addFloatingText(player.x, p.y - 10, 'BOOST!', { color: '#ffd166', size: 20 });
      this.effects.spawnBurst(player.x, p.y, null, 16, { speed: 160, upBias: 80 });
    } else if (p.type === PLATFORM_TYPES.ICE) {
      session.iceSlideTimer = 0.9;
    } else if (p.type === PLATFORM_TYPES.BREAKABLE) {
      p.state = 'cracking';
      p.stateTimer = 0.32;
      this.audio.breakPlatform();
    } else if (p.type === PLATFORM_TYPES.CLOUD) {
      p.state = 'fading';
      p.stateTimer = 0.6;
    }

    if (isPerfect) {
      bounceVel *= PERFECT_BOUNCE_MULT;
      session.combo += 1;
      session.perfects += 1;
      player.showPerfect();
      this.audio.perfect();
      this.effects.addFloatingText(player.x, p.y - 22, COMBO_LABELS(session.combo), { color: '#ff6fb0', size: 18 });
      this.effects.spawnBurst(player.x, p.y, '#ffd166', 10, { speed: 90 });
    } else {
      session.combo = 0;
    }

    if (!landingSoundPlayed) this.audio.bounce();
    p.squash = 1;
    this.effects.spawnImpactDust(player.x, p.y);

    // Close call: player was dangerously low right before this landing
    const screenYBefore = player.y - this.camera.y;
    if (screenYBefore > height * 0.86 && !session.recordFlags.close) {
      this._slowMoTimer = 0.28;
      session.stars += 2;
      this.audio.closeCall();
      this.effects.addFloatingText(player.x, p.y - 36, 'CLOSE CALL!', { color: '#7bd88f', size: 18 });
      session.recordFlags.close = true;
      setTimeout(() => { session.recordFlags.close = false; }, 3000);
    }

    if (p.hasStar && !p.starCollected) {
      p.starCollected = true;
      session.stars += 1;
      this.audio.star();
      this.effects.spawnBurst(center, p.y - 12, '#ffd93d', 8, { speed: 70 });
    }
    if (p.hasHeart && !p.heartCollected) {
      p.heartCollected = true;
      session.hasHeart = true;
      this.audio.heartSpawn();
      this.effects.addFloatingText(center, p.y - 26, '\u2764 SAVED', { color: '#ff5d7a', size: 16 });
    }
    if (p.isGolden && !p.goldenCollected) {
      p.goldenCollected = true;
      session.starRushTimer = 9;
      this.audio.starRush();
      this.audio.setIntensity(1);
      this.effects.addFloatingText(player.x, p.y - 44, 'STAR RUSH!', { color: '#ffe27a', size: 22 });
      this.effects.spawnBurst(player.x, p.y, '#ffe27a', 22, { speed: 150, upBias: 60 });
    }

    player.applyBounce(bounceVel);
  }

  _collectFloating(c) {
    const session = this.session;
    if (c.kind === 'heart') {
      if (!session.hasHeart) {
        session.hasHeart = true;
        this.audio.heartSpawn();
        this.effects.addFloatingText(c.x, c.y - 14, '\u2764 SAVED', { color: '#ff5d7a', size: 16 });
      }
    } else if (c.kind === 'mystery') {
      this.audio.mysteryCloud();
      this._applyMysteryEffect(c.x, c.y);
    }
  }

  _applyMysteryEffect(x, y) {
    const session = this.session;
    const effectsList = ['starBurst', 'superBoost', 'magnet', 'giant', 'rainbowRush'];
    const pick = effectsList[(Math.random() * effectsList.length) | 0];
    switch (pick) {
      case 'starBurst':
        session.stars += 5;
        this.effects.addFloatingText(x, y - 16, '+5 \u2b50', { color: '#ffd93d', size: 20 });
        this.effects.spawnBurst(x, y, '#ffd93d', 14, { speed: 110 });
        break;
      case 'superBoost':
        this.player.superBoostTimer = 0.6;
        this.player.applyBounce(SPRING_BOUNCE_VELOCITY * 1.05);
        this.effects.addFloatingText(x, y - 16, 'SUPER BOOST!', { color: '#7bd88f', size: 18 });
        break;
      case 'magnet':
        session.magnetActive = true;
        this.effects.addFloatingText(x, y - 16, 'MAGNET!', { color: '#b98cff', size: 18 });
        setTimeout(() => { session.magnetActive = false; }, 6000);
        break;
      case 'giant':
        this.player.giantTimer = 8;
        this.effects.addFloatingText(x, y - 16, 'GIANT PUFF!', { color: '#ffb347', size: 18 });
        break;
      case 'rainbowRush':
        session.stars += 3;
        this.effects.addFloatingText(x, y - 16, 'RAINBOW RUSH!', { color: '#7c83fd', size: 18 });
        this.effects.spawnBurst(x, y, null, 18, { speed: 140 });
        break;
      default:
        break;
    }
  }

  _triggerHeartSave(width, height) {
    const session = this.session;
    session.hasHeart = false;
    this.audio.heartSave();
    const player = this.player;
    // Find the nearest platform above the fall point to land on.
    let best = null, bestDist = Infinity;
    for (const p of this.world.platforms) {
      if (!isPlatformSolid(p)) continue;
      if (p.y > player.y) continue;
      const d = player.y - p.y;
      if (d < bestDist) { bestDist = d; best = p; }
    }
    const targetY = best ? best.y - player.radius - 2 : this.camera.y + height * 0.5;
    const targetX = best ? best.x + best.width / 2 : width / 2;
    player.x = Math.max(player.radius, Math.min(width - player.radius, targetX));
    player.y = targetY;
    player.applyBounce(BOUNCE_VELOCITY * 1.15);
    this.effects.spawnBurst(player.x, player.y, null, 30, { speed: 220, upBias: 100 });
    this.effects.addFloatingText(player.x, player.y - 40, 'PUFF SAVE!', { color: '#ff5d7a', size: 24 });
  }

  _killPlayer() {
    this.player.die();
    this.effects.spawnBurst(this.player.x, this.player.y, null, 20, { speed: 140 });
    this._endRun();
  }

  _updateRecordHints() {
    const session = this.session, best = this.save.bestHeight;
    if (best <= 0) return;
    const remaining = best - session.heightMeters;
    if (remaining <= 50 && remaining > 20 && !session.recordFlags.r50) {
      session.recordFlags.r50 = true;
      this.effects.addFloatingText(this.player.x, this.player.y - 40, '50m TO YOUR BEST!', { color: '#ffffff', size: 15 });
    } else if (remaining <= 20 && remaining > 5 && !session.recordFlags.r20) {
      session.recordFlags.r20 = true;
      this.effects.addFloatingText(this.player.x, this.player.y - 40, '20m TO YOUR BEST!', { color: '#ffffff', size: 15 });
    } else if (remaining <= 5 && remaining > 0 && !session.recordFlags.close) {
      this.effects.addFloatingText(this.player.x, this.player.y - 40, 'SO CLOSE!', { color: '#ffd166', size: 16 });
    } else if (remaining <= 0 && !session.recordFlags.newBest) {
      session.recordFlags.newBest = true;
      this.audio.newBest();
      this.effects.addFloatingText(this.player.x, this.player.y - 44, 'NEW BEST!', { color: '#ffe27a', size: 24 });
      this.effects.spawnBurst(this.player.x, this.player.y, null, 20, { speed: 130, upBias: 40 });
    }
  }

  _updateHud() {
    if (this.el.hudHeight) this.el.hudHeight.textContent = `${Math.floor(this.session.heightMeters)}m`;
    if (this.el.hudBest) this.el.hudBest.textContent = `${Math.floor(Math.max(this.save.bestHeight, this.session.heightMeters))}m`;
    if (this.el.hudStars) this.el.hudStars.textContent = `${this.session.stars}`;
  }

  // ---- Render -------------------------------------------------------------
  _render() {
    const r = this.renderer;
    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
      const meters = this.session.heightMeters;
      const env = environmentForHeight(meters);
      r.drawBackground(env, this.elapsed);
      for (const p of this.world.platforms) {
        r.drawPlatform(p, this.camera.y);
        if (p.hasStar) r.drawStar(p.x + p.width / 2, p.y - 12, this.camera.y, p.starCollected);
      }
      for (const c of this.world.collectibles) r.drawCollectible(c, this.camera.y);
      r.drawRainbowTrail(this.effects.rainbowTrail, this.camera.y);
      r.drawParticles(this.effects.particles, this.camera.y);
      r.drawPuff(this.player, this.camera.y, this.save.selectedSkin);
      r.drawFloatingTexts(this.effects.floatingTexts, this.camera.y);
    } else {
      r.drawBackground('sunny', this.elapsed);
      if (this.state === GameState.MENU) {
        r.drawRainbowTrail(this.effects.rainbowTrail, 0);
        r.drawPuff(this._menuPuff, 0, this.save.selectedSkin);
      }
    }
  }
}

export function bandLabelForHeight(meters) {
  return bandForHeight(meters).name;
}
