// player.js — Puff physics, states and expressive reactions
export const GRAVITY = 1450;
export const BOUNCE_VELOCITY = -640;
export const SPRING_BOUNCE_VELOCITY = -1020;
export const MAX_H_SPEED = 280;
export const H_ACCEL = 1700;
export const H_DECEL = 2000;
export const ICE_DECEL_MULT = 0.28;
export const PERFECT_BOUNCE_MULT = 1.1;
export const PLAYER_RADIUS = 20;

export const PuffState = Object.freeze({
  NORMAL: 'normal',
  RISING: 'rising',
  FALLING: 'falling',
  FAST_FALL: 'fast_fall',
  PERFECT: 'perfect',
  SUPER: 'super',
  DEATH: 'death',
});

export class Puff {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = BOUNCE_VELOCITY;
    this.radius = PLAYER_RADIUS;
    this.state = PuffState.RISING;
    this.squashX = 1;
    this.squashY = 1;
    this.faceTimer = 0;
    this.alive = true;
    this.sizeMult = 1; // for Giant Puff mystery effect
    this.giantTimer = 0;
    this.superBoostTimer = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = BOUNCE_VELOCITY;
    this.state = PuffState.RISING;
    this.squashX = 1;
    this.squashY = 1;
    this.alive = true;
    this.sizeMult = 1;
    this.giantTimer = 0;
    this.superBoostTimer = 0;
  }

  applyBounce(velocity) {
    this.vy = velocity;
    this.squashX = 1.35;
    this.squashY = 0.65;
  }

  update(dt, axis, iceSliding) {
    if (!this.alive) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      return;
    }

    // Horizontal acceleration/deceleration — floaty arcade feel with strong air control.
    const targetVx = axis * MAX_H_SPEED;
    const accel = H_ACCEL;
    if (Math.abs(targetVx) > Math.abs(this.vx) || Math.sign(targetVx) !== Math.sign(this.vx)) {
      this.vx += (targetVx - this.vx) * Math.min(1, accel * dt / MAX_H_SPEED);
    } else {
      const decel = iceSliding ? H_DECEL * ICE_DECEL_MULT : H_DECEL;
      this.vx += (targetVx - this.vx) * Math.min(1, decel * dt / MAX_H_SPEED);
    }

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Squash/stretch recovery toward neutral
    this.squashX += (1 - this.squashX) * Math.min(1, dt * 8);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 8);

    // Expressive state machine
    if (this.superBoostTimer > 0) {
      this.state = PuffState.SUPER;
      this.superBoostTimer -= dt;
    } else if (this.vy < -700) {
      this.state = PuffState.SUPER;
    } else if (this.vy < 0) {
      this.state = PuffState.RISING;
    } else if (this.vy > 900) {
      this.state = PuffState.FAST_FALL;
    } else if (this.vy > 60) {
      this.state = PuffState.FALLING;
    } else {
      this.state = PuffState.NORMAL;
    }

    if (this.faceTimer > 0) this.faceTimer -= dt;
    if (this.giantTimer > 0) {
      this.giantTimer -= dt;
      this.sizeMult = 1.5;
      if (this.giantTimer <= 0) this.sizeMult = 1;
    }
  }

  showPerfect() {
    this.state = PuffState.PERFECT;
    this.faceTimer = 0.4;
  }

  die() {
    this.alive = false;
    this.state = PuffState.DEATH;
    this.vx *= 0.3;
  }
}
