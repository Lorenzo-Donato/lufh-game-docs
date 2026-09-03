/**
 * Mega Man Zero - Hierarchical State Machine (HSM)
 * 1-to-1 JavaScript implementation of StateSmith PlayerSm.cs
 * Refactored into clean sub-state handlers for low cyclomatic complexity.
 */

let _PHYS = typeof PHYS !== 'undefined' ? PHYS : null;
let _STATE_ANIM_MAP = typeof STATE_ANIM_MAP !== 'undefined' ? STATE_ANIM_MAP : null;
if (typeof require !== 'undefined') {
  try {
    const consts = require('./constants');
    if (!_PHYS) _PHYS = consts.PHYS;
    if (!_STATE_ANIM_MAP) _STATE_ANIM_MAP = consts.STATE_ANIM_MAP;
  } catch (e) {}
}

class PlayerSm {
  constructor(actor) {
    this.actor = actor;
    this.state = 'IDLE';
    this.superState = 'GROUNDED';
  }

  start() {
    this.transitionTo('GROUNDED', 'IDLE');
  }

  transitionTo(superState, subState) {
    if (this.state === subState && this.superState === superState) return;

    const oldState = this.state;
    const oldSuper = this.superState;

    if ((oldState === 'DASH' || oldState === 'ATTACK_DASH') && subState === 'JUMP') {
      this.actor.isDashJumping = true;
    } else if (superState === 'GROUNDED' || superState === 'WALL_SLIDE') {
      this.actor.isDashJumping = false;
    }

    this.exitState(oldState, subState);
    this.superState = superState;
    this.state = subState;
    this.enterState(subState);

    if (typeof logEvent === 'function') {
      logEvent(`[HSM] [${oldSuper}::${oldState}] ➔ [${superState}::${subState}]`, 'state-trans');
    }
    if (typeof updateHsmUi === 'function') {
      updateHsmUi(superState, subState);
    }
  }

  enterState(state) {
    this.actor.animTimer = 0;
    this.actor.animFrame = 0;
    this.actor.attackFinishedDispatched = false;

    if (this.actor.isAttackState && this.actor.isAttackState()) {
      this.actor.attackId = (this.actor.attackId || 0) + 1;
    }

    const mappedSeqId = (_STATE_ANIM_MAP && _STATE_ANIM_MAP[state]) || (typeof STATE_ANIM_MAP !== 'undefined' && STATE_ANIM_MAP[state]) || 'seq_02_idle';
    this.actor.playSequence(mappedSeqId);

    const P = _PHYS || (typeof PHYS !== 'undefined' ? PHYS : { DASH_DURATION: 0.35, HURT_STUN_DURATION: 0.4, KNOCKBACK_VX: 4.5, KNOCKBACK_VY: -6.0, INVINCIBLE_DURATION: 1.5 });

    if (state === 'DASH') {
      this.actor.dashTimer = P.DASH_DURATION;
      this.actor.createDashDust();
    } else if (state === 'ATTACK_DASH') {
      if (this.actor.dashTimer <= 0) this.actor.dashTimer = P.DASH_DURATION;
      this.actor.createDashDust();
    } else if (state === 'GRAB_WALL' || state === 'ATTACK_GRAB_WALL' || state === 'CHARGE_WALL_SLASH') {
      this.actor.vy = 0;
    } else if (state === 'HURT_GROUND' || state === 'HURT_AIR') {
      this._enterHurt(state, P);
    } else if (state === 'DYING') {
      this._enterDying();
    }
  }

  _enterHurt(state, P) {
    this.actor.hurtTimer = P.HURT_STUN_DURATION;
    this.actor.vx = -this.actor.facing * P.KNOCKBACK_VX;
    this.actor.vy = (state === 'HURT_AIR') ? P.KNOCKBACK_VY : 0;
    this.actor.invincibleTimer = P.INVINCIBLE_DURATION;
    this.actor.isInvincible = true;
  }

  _enterDying() {
    this.actor.vx = 0;
    this.actor.vy = 0;
    this.actor.isDead = true;
    for (let i = 0; i < 24; i++) {
      this.actor.particles.push({
        x: this.actor.x + (Math.random() * 40 - 20),
        y: this.actor.y - 20 + (Math.random() * 40 - 20),
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -6 - 2,
        size: Math.random() * 6 + 2,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff2a5f' : '#ffb703'
      });
    }
  }

  exitState(oldState, newState) {
    if ((oldState === 'DASH' || oldState === 'ATTACK_DASH') && (newState !== 'DASH' && newState !== 'ATTACK_DASH')) {
      this.actor.dashTimer = 0;
    }
  }

  dispatchEvent(event) {
    if (event === 'HIT_RECEIVED') {
      if (this.actor.isInvincible || this.superState === 'HURT' || this.superState === 'DEATH' || this.actor.isDead) {
        return;
      }
      if (typeof logEvent === 'function') logEvent(`Event Fired: ${event}`, 'event-fired');
      this.actor.hp -= 1;
      const hurtSub = this.actor.isGrounded ? 'HURT_GROUND' : 'HURT_AIR';
      this.transitionTo('HURT', hurtSub);
      return;
    }

    if (typeof logEvent === 'function') logEvent(`Event Fired: ${event}`, 'event-fired');

    switch (this.superState) {
      case 'GROUNDED': this._handleGroundedEvent(event); break;
      case 'AIRBORNE': this._handleAirborneEvent(event); break;
      case 'WALL_SLIDE': this._handleWallSlideEvent(event); break;
      case 'HURT': this._handleHurtEvent(event); break;
      case 'DEATH': break;
    }
  }

  _handleGroundedEvent(event) {
    const P = _PHYS || (typeof PHYS !== 'undefined' ? PHYS : { JUMP_VY: -13.0, DASH_SPEED: 10.0 });

    if (event === 'FALL') {
      this.transitionTo('AIRBORNE', 'FALL');
      return;
    }
    if (event === 'JUMP_PRESS') {
      this._handleGroundedJump(P);
      return;
    }
    if (event === 'CHARGE_RELEASE') {
      this.transitionTo('GROUNDED', 'CHARGE_SLASH');
      return;
    }

    if (this.state === 'IDLE') this._handleIdleSub(event);
    else if (this.state === 'RUN') this._handleRunSub(event);
    else if (this.state === 'DASH') this._handleDashSub(event);
    else if (this.state.startsWith('ATTACK_') || this.state === 'CHARGE_SLASH') this._handleAttackSub(event);
  }

  _handleGroundedJump(P) {
    if (!this.actor.canStandUp) return;
    const isDashHeld = (typeof keys !== 'undefined') && (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] || keys['KeyL']);
    if (isDashHeld || this.state === 'DASH' || this.state === 'ATTACK_DASH') {
      this.actor.isDashJumping = true;
    }
    this.actor.vy = P.JUMP_VY;
    this.actor.isGrounded = false;
    if (this.actor.isDashJumping) {
      this.actor.vx = this.actor.facing * P.DASH_SPEED;
    }
    // Ground jump always transitions cleanly to JUMP
    this.transitionTo('AIRBORNE', 'JUMP');
  }

  _isDashHeld() {
    return (typeof keys !== 'undefined') && Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] || keys['KeyL']);
  }

  _handleIdleSub(event) {
    if (event === 'MOVE_INPUT') {
      this.transitionTo('GROUNDED', 'RUN');
    } else if (event === 'DASH_PRESS') {
      this.transitionTo('GROUNDED', 'DASH');
    } else if (event === 'ATTACK_PRESS') {
      this.transitionTo('GROUNDED', this._isDashHeld() ? 'ATTACK_DASH' : 'ATTACK_1');
    }
  }

  _handleRunSub(event) {
    if (event === 'STOP_INPUT') {
      this.transitionTo('GROUNDED', 'IDLE');
    } else if (event === 'DASH_PRESS') {
      this.transitionTo('GROUNDED', 'DASH');
    } else if (event === 'ATTACK_PRESS') {
      this.transitionTo('GROUNDED', this._isDashHeld() ? 'ATTACK_DASH' : 'ATTACK_RUN');
    }
  }

  _handleDashSub(event) {
    if (event === 'DASH_FINISHED') {
      if (!this.actor.canStandUp) {
        this.actor.dashTimer = 0.15;
      } else {
        this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
      }
    } else if (event === 'ATTACK_PRESS') {
      this.transitionTo('GROUNDED', 'ATTACK_DASH');
    }
  }

  _handleAttackSub(event) {
    if (event === 'DASH_PRESS') {
      if ((this.actor.attackStateTimer && this.actor.attackStateTimer < 0.18) || this._isDashHeld()) {
        this.transitionTo('GROUNDED', 'ATTACK_DASH');
      } else {
        this.transitionTo('GROUNDED', 'DASH');
      }
      return;
    }

    if (this.state === 'ATTACK_1') {
      if (event === 'ATTACK_PRESS') this.transitionTo('GROUNDED', 'ATTACK_2');
      else if (event === 'ATTACK_FINISHED') this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
    } else if (this.state === 'ATTACK_2') {
      if (event === 'ATTACK_PRESS') this.transitionTo('GROUNDED', 'ATTACK_3');
      else if (event === 'ATTACK_FINISHED') this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
    } else if (this.state === 'ATTACK_DASH') {
      if (event === 'ATTACK_FINISHED') {
        this.transitionTo('GROUNDED', !this.actor.canStandUp ? 'DASH' : (Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE'));
      }
    } else if (event === 'ATTACK_FINISHED') {
      this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
    }
  }

  _handleAirborneEvent(event) {
    const P = _PHYS || (typeof PHYS !== 'undefined' ? PHYS : { JUMP_VY: -13.0, DASH_SPEED: 10.0 });

    if (event === 'LANDED') {
      this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
      return;
    }
    if (event === 'WALL_TOUCH') {
      this.transitionTo('WALL_SLIDE', 'GRAB_WALL');
      return;
    }
    if (event === 'CHARGE_RELEASE') {
      this.transitionTo('AIRBORNE', 'CHARGE_AIR_SLASH');
      return;
    }

    if (this.state === 'JUMP') {
      if (event === 'ATTACK_PRESS') this.transitionTo('AIRBORNE', 'ATTACK_AIR');
      else if (event === 'APEX_REACHED') this.transitionTo('AIRBORNE', 'FALL');
      else if (event === 'DASH_PRESS') {
        if (this.actor.vy < P.JUMP_VY + 3.0 && !this.actor.isDashJumping) {
          this.actor.isDashJumping = true;
          this.actor.vx = this.actor.facing * P.DASH_SPEED;
          this.actor.createDashDust();
        }
      }
    } else if (this.state === 'FALL') {
      if (event === 'ATTACK_PRESS') this.transitionTo('AIRBORNE', 'ATTACK_AIR');
    } else if (this.state === 'ATTACK_AIR' || this.state === 'CHARGE_AIR_SLASH') {
      if (event === 'ATTACK_FINISHED') {
        this.transitionTo('AIRBORNE', this.actor.vy < 0 ? 'JUMP' : 'FALL');
      }
    }
  }

  _handleWallSlideEvent(event) {
    const P = _PHYS || (typeof PHYS !== 'undefined' ? PHYS : { WALL_KICK_VX: 7.0, WALL_KICK_VY: -13.0, DASH_SPEED: 10.0 });

    if (event === 'LANDED') {
      this.transitionTo('GROUNDED', 'IDLE');
      return;
    }
    if (event === 'WALL_DETACH') {
      this.transitionTo('AIRBORNE', 'FALL');
      return;
    }
    if (event === 'JUMP_PRESS') {
      const isDashHeld = (typeof keys !== 'undefined') && (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyC'] || keys['KeyL']);
      if (isDashHeld) this.actor.isDashJumping = true;
      const jumpVx = this.actor.isDashJumping ? P.DASH_SPEED : P.WALL_KICK_VX;
      this.actor.vx = (this.actor.wallSide === 'left') ? jumpVx : -jumpVx;
      this.actor.vy = P.WALL_KICK_VY;
      this.actor.facing = (this.actor.wallSide === 'left') ? 1 : -1;
      this.transitionTo('AIRBORNE', 'JUMP');
      return;
    }
    if (event === 'CHARGE_RELEASE') {
      this.transitionTo('WALL_SLIDE', 'CHARGE_WALL_SLASH');
      return;
    }

    if (this.state === 'GRAB_WALL') {
      if (event === 'ATTACK_PRESS') this.transitionTo('WALL_SLIDE', 'ATTACK_GRAB_WALL');
    } else if (this.state === 'ATTACK_GRAB_WALL' || this.state === 'CHARGE_WALL_SLASH') {
      if (event === 'ATTACK_FINISHED') this.transitionTo('WALL_SLIDE', 'GRAB_WALL');
    }
  }

  _handleHurtEvent(event) {
    if (event === 'HURT_FINISHED') {
      if (this.actor.hp <= 0) {
        this.transitionTo('DEATH', 'DYING');
      } else if (this.state === 'HURT_GROUND' || this.actor.isGrounded) {
        this.transitionTo('GROUNDED', Math.abs(this.actor.inputX) > 0.1 ? 'RUN' : 'IDLE');
      } else {
        this.transitionTo('AIRBORNE', 'FALL');
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { PlayerSm };
}
