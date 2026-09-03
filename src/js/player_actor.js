/**
 * Zero Entity Player Actor (Physics, Animation, Dynamic Hurtboxes & Saber Hitbox)
 * Refactored into clean sub-methods for low cyclomatic complexity.
 */

let _PLAYER_WORLD = null;
let _PLAYER_PHYS = null;
let _PLAYER_SOLIDS = null;
let _checkCanStandUp = null;
let _getRoomName = null;
let _PlayerSmClass = null;

if (typeof require !== 'undefined') {
  try {
    const consts = require('./constants');
    _PLAYER_WORLD = consts.WORLD;
    _PLAYER_PHYS = consts.PHYS;
  } catch (e) {}
  try {
    const geo = require('./world_geometry');
    _PLAYER_SOLIDS = geo.SOLIDS;
    _checkCanStandUp = geo.checkCanStandUp;
    _getRoomName = geo.getRoomName;
  } catch (e) {}
  try {
    const smModule = require('./state_machine');
    _PlayerSmClass = smModule.PlayerSm;
  } catch (e) {}
}

if (typeof WORLD !== 'undefined' && !_PLAYER_WORLD) _PLAYER_WORLD = WORLD;
if (typeof PHYS !== 'undefined' && !_PLAYER_PHYS) _PLAYER_PHYS = PHYS;
if (typeof SOLIDS !== 'undefined' && !_PLAYER_SOLIDS) _PLAYER_SOLIDS = SOLIDS;
if (typeof checkCanStandUp !== 'undefined' && !_checkCanStandUp) _checkCanStandUp = checkCanStandUp;
if (typeof getRoomName !== 'undefined' && !_getRoomName) _getRoomName = getRoomName;
if (typeof PlayerSm !== 'undefined' && !_PlayerSmClass) _PlayerSmClass = PlayerSm;

class PlayerActor {
  constructor() {
    const W = _PLAYER_WORLD || (typeof WORLD !== 'undefined' ? WORLD : { GROUND_Y: 380 });
    const P = _PLAYER_PHYS || (typeof PHYS !== 'undefined' ? PHYS : { MAX_HP: 4 });

    this.x = 140;
    this.y = W.GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;
    this.wallSide = null;
    this.dashTimer = 0;
    this.chargeTime = 0;
    this.attackFinishedDispatched = false;
    this.canStandUp = true;
    this.isDashJumping = false;
    this.attackId = 1;
    this.attackStateTimer = 0;

    // HP & Invincibility
    this.hp = P.MAX_HP;
    this.invincibleTimer = 0;
    this.isInvincible = false;
    this.hurtTimer = 0;
    this.isDead = false;

    this.currentSeqId = 'seq_02_idle';
    this.animFrame = 0;
    this.animTimer = 0;
    this.busterTimer = 0;
    this.busterShotCount = 0;

    this.inputX = 0;
    this.particles = [];

    const SmConstructor = _PlayerSmClass || (typeof PlayerSm !== 'undefined' ? PlayerSm : null);
    if (SmConstructor) {
      this.sm = new SmConstructor(this);
      this.sm.start();
    }
  }

  reset(x = 140, y = 380) {
    const P = _PLAYER_PHYS || (typeof PHYS !== 'undefined' ? PHYS : { MAX_HP: 4 });
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;
    this.wallSide = null;
    this.dashTimer = 0;
    this.chargeTime = 0;
    this.canStandUp = true;
    this.attackFinishedDispatched = false;
    this.isDashJumping = false;
    this.attackId = 1;
    this.attackStateTimer = 0;

    this.hp = P.MAX_HP;
    this.invincibleTimer = 0;
    this.isInvincible = false;
    this.hurtTimer = 0;
    this.isDead = false;

    this.currentSeqId = 'seq_02_idle';
    this.animFrame = 0;
    this.animTimer = 0;
    this.particles = [];

    if (this.sm) {
      this.sm.superState = 'GROUNDED';
      this.sm.state = 'IDLE';
    }
    if (typeof updateHsmUi === 'function') updateHsmUi('GROUNDED', 'IDLE');
    if (typeof logEvent === 'function') logEvent(`[RESET] Zero reposicionado em x=${x} com HP ${P.MAX_HP}/${P.MAX_HP}!`, 'state-trans');
  }

  playSequence(seqId) {
    if (this.currentSeqId !== seqId) {
      this.currentSeqId = seqId;
      this.animFrame = 0;
      this.animTimer = 0;
      this.attackFinishedDispatched = false;
    }
  }

  isAttackState() {
    if (!this.sm) return false;
    return this.sm.state.startsWith('ATTACK_') || 
           this.sm.state === 'CHARGE_SLASH' || 
           this.sm.state === 'CHARGE_AIR_SLASH' || 
           this.sm.state === 'CHARGE_WALL_SLASH';
  }

  getAttackHitbox() {
    if (!this.isAttackState()) return null;
    const state = this.sm ? this.sm.state : '';
    const isHeavy = state.includes('CHARGE');
    const isAir = state === 'ATTACK_AIR' || state === 'CHARGE_AIR_SLASH';
    const isDash = state === 'ATTACK_DASH';

    const forwardReach = isHeavy ? 115 : (isDash ? 95 : 82);
    const backwardReach = 24;
    const totalW = forwardReach + backwardReach;
    const height = isAir ? 68 : (isHeavy ? 72 : 58);

    const minX = this.facing === 1 ? this.x - backwardReach : this.x - forwardReach;
    const minY = isAir ? this.y - 58 : this.y - height + 10;

    return {
      x: minX,
      y: minY,
      w: totalW,
      h: height,
      isHeavy: isHeavy,
      attackId: this.attackId
    };
  }

  getCurrentRoom() {
    const fn = _getRoomName || (typeof getRoomName !== 'undefined' ? getRoomName : null);
    return fn ? fn(this.x) : 'Arena';
  }

  createDashDust() {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.x - this.facing * 18,
        y: this.y - 4 + (Math.random() * 6 - 3),
        vx: -this.facing * (Math.random() * 3 + 1),
        vy: Math.random() * -1.5,
        size: Math.random() * 4 + 2,
        alpha: 1,
        color: '#00e5ff'
      });
    }
  }

  createWallSparks() {
    if (Math.random() < 0.4) {
      this.particles.push({
        x: (this.wallSide === 'left') ? this.x - 14 : this.x + 14,
        y: this.y - 18,
        vx: (this.wallSide === 'left' ? 1 : -1) * (Math.random() * 2 + 1),
        vy: Math.random() * -2 - 1,
        size: 3,
        alpha: 1,
        color: '#ffb703'
      });
    }
  }

  createLandDust() {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.x + (Math.random() * 20 - 10),
        y: this.y - 2,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * -2,
        size: Math.random() * 3 + 1,
        alpha: 0.8,
        color: '#94a3b8'
      });
    }
  }

  update(dt) {
    if (this.isDead) {
      this._updateParticles(dt);
      return;
    }

    this._updateTimers(dt);

    if (this.isAttackState()) {
      this.attackStateTimer += dt;
    } else {
      this.attackStateTimer = 0;
    }

    const checkFn = _checkCanStandUp || (typeof checkCanStandUp !== 'undefined' ? checkCanStandUp : () => true);
    this.canStandUp = checkFn(this.x, this.y);

    const isDashing = this.sm && (this.sm.state === 'DASH' || this.sm.state === 'ATTACK_DASH');
    if (!this.canStandUp && !isDashing && this.sm && this.sm.superState === 'GROUNDED') {
      this.sm.transitionTo('GROUNDED', 'DASH');
    }

    this._updateVelocities(dt, isDashing);
    this._resolveWorldCollisions(dt, isDashing);
    this._advanceAnimation(dt);
    this._updateParticles(dt);
  }

  _updateTimers(dt) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincibleTimer = 0;
        this.isInvincible = false;
      }
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        if (this.sm) this.sm.dispatchEvent('HURT_FINISHED');
      }
    }

    if (this.busterTimer > 0) {
      this.busterTimer -= dt;
    }

    if (typeof keys !== 'undefined' && (keys['KeyJ'] || keys['KeyX'])) {
      this.chargeTime += dt;
    } else {
      this.chargeTime = 0;
    }
  }

  _updateVelocities(dt, isDashing) {
    const P = _PLAYER_PHYS || (typeof PHYS !== 'undefined' ? PHYS : { DASH_SPEED: 10.0, RUN_SPEED: 5.2, ATTACK_RUN_SPEED: 3.5, AIR_ACCEL: 0.45, AIR_MAX_SPEED: 5.2, AIR_DRAG: 0.94, GRAVITY: 28.0, MAX_FALL_SPEED: 14.0, WALL_SLIDE_GRAVITY: 7.0, WALL_SLIDE_MAX_SPEED: 2.8, JUMP_VY: -13.0 });
    
    if (isDashing) {
      this._updateDashVelocity(dt, P);
    } else if (this.sm && this.sm.superState === 'GROUNDED') {
      this._updateGroundedVelocity(P);
    } else if (this.sm && this.sm.superState === 'AIRBORNE') {
      this._updateAirborneVelocity(dt, P);
    } else if (this.sm && this.sm.superState === 'WALL_SLIDE') {
      this._updateWallSlideVelocity(dt, P);
    } else if (this.sm && this.sm.superState === 'HURT') {
      this.vx *= 0.92;
      if (!this.isGrounded) {
        this.vy += P.GRAVITY * dt;
        if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;
      }
    }
  }

  _updateDashVelocity(dt, P) {
    this.dashTimer -= dt;
    this.vx = this.facing * P.DASH_SPEED;
    if (Math.random() < 0.5) this.createDashDust();
    if (this.dashTimer <= 0 && this.sm) {
      this.sm.dispatchEvent('DASH_FINISHED');
    }
  }

  _updateGroundedVelocity(P) {
    if (this.sm.state === 'ATTACK_RUN') {
      this.vx = this.inputX * P.ATTACK_RUN_SPEED;
    } else if (this.sm.state === 'ATTACK_1' || this.sm.state === 'ATTACK_2' || this.sm.state === 'ATTACK_3' || this.sm.state === 'CHARGE_SLASH') {
      this.vx = 0;
    } else {
      this.vx = (Math.abs(this.inputX) > 0.1) ? this.inputX * P.RUN_SPEED : 0;
      if (Math.abs(this.inputX) > 0.1) this.facing = this.inputX > 0 ? 1 : -1;
    }
  }

  _updateAirborneVelocity(dt, P) {
    const maxAirSpeed = this.isDashJumping ? P.DASH_SPEED : P.AIR_MAX_SPEED;
    if (Math.abs(this.inputX) > 0.1) {
      this.vx += this.inputX * P.AIR_ACCEL;
      this.vx = Math.max(-maxAirSpeed, Math.min(maxAirSpeed, this.vx));
      this.facing = this.inputX > 0 ? 1 : -1;
    } else {
      this.vx *= P.AIR_DRAG;
    }
    this.vy += P.GRAVITY * dt;
    if (this.vy > P.MAX_FALL_SPEED) this.vy = P.MAX_FALL_SPEED;

    if (this.sm && this.sm.state === 'JUMP' && this.vy >= 0) {
      this.sm.dispatchEvent('APEX_REACHED');
    }
  }

  _updateWallSlideVelocity(dt, P) {
    this.vy += P.WALL_SLIDE_GRAVITY * dt;
    if (this.vy > P.WALL_SLIDE_MAX_SPEED) this.vy = P.WALL_SLIDE_MAX_SPEED;
    this.createWallSparks();
    this.facing = (this.wallSide === 'left') ? 1 : -1;

    if ((this.wallSide === 'left' && this.inputX > 0.1) || (this.wallSide === 'right' && this.inputX < -0.1)) {
      this.wallSide = null;
      if (this.sm) this.sm.dispatchEvent('WALL_DETACH');
    }
  }

  _resolveWorldCollisions(dt, isDashing) {
    const solidsList = _PLAYER_SOLIDS || (typeof SOLIDS !== 'undefined' ? SOLIDS : []);
    const dtScale = dt * 60;
    const pH = isDashing ? 28 : 50;
    const pW = isDashing ? 15 : 11;

    this._resolveHorizontalWalls(solidsList, dtScale, pH, pW);
    this._resolveVerticalSurfaces(solidsList, dtScale, pH, pW);
  }

  _resolveHorizontalWalls(solidsList, dtScale, pH, pW) {
    let nextX = this.x + this.vx * dtScale;
    let hitWallBlock = null;

    for (const block of solidsList) {
      if (block.type === 'floor') continue;

      const pTop = this.y - pH + 4;
      const pBottom = this.y - 2;

      if (pBottom > block.y && pTop < block.y + block.h) {
        if (this.vx > 0 && nextX + pW >= block.x && this.x + pW <= block.x + 12) {
          nextX = block.x - pW;
          this.vx = 0;
          hitWallBlock = { block, side: 'right' };
        } else if (this.vx < 0 && nextX - pW <= block.x + block.w && this.x - pW >= block.x + block.w - 12) {
          nextX = block.x + block.w + pW;
          this.vx = 0;
          hitWallBlock = { block, side: 'left' };
        }
      }
    }
    this.x = nextX;

    if (hitWallBlock && !this.isGrounded && this.sm && this.sm.superState === 'AIRBORNE' && this.vy > 0) {
      if ((hitWallBlock.side === 'right' && this.inputX > 0.1) || (hitWallBlock.side === 'left' && this.inputX < -0.1)) {
        this.wallSide = hitWallBlock.side;
        this.vx = 0;
        this.sm.dispatchEvent('WALL_TOUCH');
      }
    }
  }

  _resolveVerticalSurfaces(solidsList, dtScale, pH, pW) {
    let nextY = this.y + this.vy * dtScale;
    let landedOnFloor = false;

    if (this.vy < 0) {
      for (const block of solidsList) {
        if (block.type === 'floor') continue;
        if (this.x + pW > block.x + 2 && this.x - pW < block.x + block.w - 2) {
          if (nextY - pH <= block.y + block.h && this.y - pH >= block.y + block.h - 14) {
            nextY = block.y + block.h + pH;
            this.vy = 0;
          }
        }
      }
    }

    for (const block of solidsList) {
      if (this.x + pW > block.x + 2 && this.x - pW < block.x + block.w - 2) {
        if (nextY >= block.y && this.y <= block.y + 16) {
          nextY = block.y;
          if (this.vy > 2) this.createLandDust();
          this.vy = 0;
          landedOnFloor = true;
          break;
        }
      }
    }

    this.y = nextY;

    if (landedOnFloor) {
      if (!this.isGrounded) {
        this.isGrounded = true;
        this.wallSide = null;
        if (this.sm) this.sm.dispatchEvent('LANDED');
      }
    } else {
      if (this.isGrounded && this.sm && this.sm.superState === 'GROUNDED') {
        this.isGrounded = false;
        this.sm.dispatchEvent('FALL');
      }
      this.isGrounded = false;
    }
  }

  _advanceAnimation(dt) {
    const seq = (typeof SPRITE_CATALOG !== 'undefined' && SPRITE_CATALOG.find(s => s.id === this.currentSeqId)) || (typeof SPRITE_CATALOG !== 'undefined' ? SPRITE_CATALOG[1] : null);
    if (!seq) return;

    this.animTimer += dt;
    const frameDuration = 1 / seq.fps;

    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      if (this.animFrame < seq.frames.length - 1) {
        this.animFrame++;
      } else {
        if (seq.loop) {
          this.animFrame = 0;
        } else {
          if (this.isAttackState() && !this.attackFinishedDispatched && this.sm) {
            this.attackFinishedDispatched = true;
            this.sm.dispatchEvent('ATTACK_FINISHED');
          }
        }
      }
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 2.5;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    const P = _PLAYER_PHYS || (typeof PHYS !== 'undefined' ? PHYS : { SPRITE_SCALE: 2.2 });

    if (this.chargeTime > 0.3) {
      this._drawChargeAura(ctx);
    }

    this._drawSprite(ctx, P);
    this._drawParticles(ctx);
  }

  _drawChargeAura(ctx) {
    ctx.save();
    ctx.beginPath();
    const chargeLevel = Math.min(1.0, (this.chargeTime - 0.3) / 1.2);
    ctx.arc(this.x, this.y - 20, 26 + Math.sin(Date.now() * 0.02) * 5, 0, Math.PI * 2);
    ctx.fillStyle = chargeLevel > 0.8 ? 'rgba(255, 42, 95, 0.35)' : 'rgba(0, 229, 255, 0.3)';
    ctx.shadowColor = chargeLevel > 0.8 ? '#ff2a5f' : '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
  }

  _drawSprite(ctx, P) {
    let renderSeqId = this.currentSeqId;
    const seq = (typeof SPRITE_CATALOG !== 'undefined' && SPRITE_CATALOG.find(s => s.id === renderSeqId)) || (typeof SPRITE_CATALOG !== 'undefined' ? SPRITE_CATALOG[1] : null);
    
    if (seq) {
      const frameIndex = Math.min(this.animFrame, seq.frames.length - 1);
      const framePath = seq.frames[frameIndex];
      const imgObj = typeof loadedImages !== 'undefined' ? loadedImages[framePath] : null;

      if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
        if (!this.isInvincible || Math.floor(Date.now() / 100) % 2 !== 0) {
          ctx.save();
          ctx.translate(this.x, this.y);
          const sw = imgObj.naturalWidth;
          const sh = imgObj.naturalHeight;
          ctx.scale(this.facing * P.SPRITE_SCALE, P.SPRITE_SCALE);
          ctx.drawImage(imgObj, -sw / 2, -sh + 10, sw, sh);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#ff2a5f';
        ctx.fillRect(this.x - 16, this.y - 48, 32, 48);
      }
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.restore();
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { PlayerActor };
}
