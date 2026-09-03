/**
 * Game Loop, Input Handlers & Global Entity Setup
 */

class ZeroBossAI {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.actor = new PlayerActor();
    this.actor.x = x;
    this.actor.y = y;
    this.actor.facing = -1;
    this.actor.hp = 24; 
    this.maxHp = 24;
    this.sm = new PlayerSm(this.actor);
    this.actor.sm = this.sm;
    this.sm.start();
    
    this.isDead = false;
    this.aiTimer = 0;
    this.aiState = 'IDLE';
    this.lastHitAttackId = null;
    this.myLastAttackId = null;
    this.chargeLevel = 0;
    
    this.actionQueue = [];
  }
  
  respawn(x) {
    if (x !== undefined) this.actor.x = x;
    else this.actor.x = this.startX;
    this.actor.y = this.startY;
    this.actor.hp = this.maxHp;
    this.isDead = false;
    this.actor.isDead = false;
    this.actor.facing = -1;
    this.aiTimer = 0;
    this.aiState = 'IDLE';
    this.sm.transitionTo('GROUNDED', 'IDLE');
    this.actionQueue = [];
    this.chargeLevel = 0;
    this.actor.chargeTime = 0;
  }
  
  takeDamage(amount) {
    if (this.isDead || this.actor.isInvincible) return;
    this.actor.hp -= amount;
    this.sm.dispatchEvent('HIT_RECEIVED');
    if (typeof logEvent === 'function') logEvent(`[BOSS] Omega Zero tomou dano (${amount})! HP Restante: ${this.actor.hp}`, 'event-fired');
    if (this.actor.hp <= 0) {
      this.isDead = true;
      this.actor.hp = 0;
      this.actor.isDead = true;
      if (typeof logEvent === 'function') logEvent(`[BOSS] OMEGA ZERO FOI DERROTADO!`, 'event-fired');
    }
  }
  
  update(dt, playerX, playerY, playerSm) {
    if (this.isDead) {
      this.actor.update(dt); 
      return;
    }
    
    const pActor = playerSm ? playerSm.actor : null;
    if (!pActor || pActor.isDead) {
      this.actor.inputX = 0;
      this.actor.sm.dispatchEvent('STOP_INPUT');
      this.actor.update(dt);
      return;
    }

    // Só reage se o player entrar na sala dele (Sala 4 começa depois do X: 2480)
    if (pActor.x < 2480) {
      this.actor.inputX = 0;
      this.actor.sm.dispatchEvent('STOP_INPUT');
      this.actor.update(dt);
      return;
    }

    const dx = pActor.x - this.actor.x;
    const dy = pActor.y - this.actor.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const dir = Math.sign(dx) || 1;
    
    // Process Action Queue
    if (this.actionQueue.length > 0) {
      this.actionQueue[0].delay -= dt;
      if (this.actionQueue[0].delay <= 0) {
        this.actor.sm.dispatchEvent(this.actionQueue[0].event);
        this.actionQueue.shift();
      }
    }
    
    // 1. AI Decision Making
    this.aiTimer -= dt;
    if (this.aiTimer <= 0 && this.actionQueue.length === 0) {
       this.decideNextAction(absDx, absDy, dir, pActor, playerSm);
    }
    
    this.executeCurrentAction(dir, absDx, dt);
    
    this.actor.update(dt);
    
    // 2. Check combat collisions
    this._checkCollisions(pActor, playerSm);
  }
  
  decideNextAction(absDx, absDy, dir, pActor, pSm) {
    const roll = Math.random();
    
    this.actor.sm.dispatchEvent('STOP_INPUT');
    this.actor.sm.dispatchEvent('JUMP_RELEASE');
    this.actor.sm.dispatchEvent('ATTACK_RELEASE');
    
    this.actor.facing = dir;
    
    if (absDx > 200) {
      if (roll < 0.4) {
        this.aiState = 'DASH_APPROACH';
        this.aiTimer = 0.5 + Math.random()*0.3;
        this.actor.sm.dispatchEvent('DASH_PRESS');
      } else if (roll < 0.8) {
        this.aiState = 'JUMP_APPROACH';
        this.aiTimer = 0.8;
        this.actor.sm.dispatchEvent('DASH_PRESS');
        this.actionQueue.push({ delay: 0.05, event: 'JUMP_PRESS' }); // dash jump
      } else {
        this.aiState = 'CHARGE_SABER';
        this.aiTimer = 1.0 + Math.random();
      }
    } 
    else if (absDx > 80) {
      if (roll < 0.3) {
        this.aiState = 'DASH_ATTACK';
        this.aiTimer = 0.6;
        this.actor.sm.dispatchEvent('DASH_PRESS');
        this.actionQueue.push({ delay: 0.25, event: 'ATTACK_PRESS' });
      } else if (roll < 0.6) {
        this.aiState = 'JUMP_ATTACK';
        this.aiTimer = 0.7;
        this.actor.sm.dispatchEvent('JUMP_PRESS');
        this.actionQueue.push({ delay: 0.2, event: 'ATTACK_PRESS' });
        this.actionQueue.push({ delay: 0.1, event: 'ATTACK_RELEASE' });
      } else if (roll < 0.8) {
        this.aiState = 'BACKDASH';
        this.aiTimer = 0.4;
        this.actor.facing = -dir;
        this.actor.sm.dispatchEvent('DASH_PRESS');
      } else {
        this.aiState = 'WALK_APPROACH';
        this.aiTimer = 0.5;
      }
    }
    else {
      if (roll < 0.4) {
        this.aiState = 'COMBO';
        this.aiTimer = 1.2;
        this.actor.sm.dispatchEvent('ATTACK_PRESS');
        this.actionQueue.push({ delay: 0.2, event: 'ATTACK_RELEASE' });
        this.actionQueue.push({ delay: 0.05, event: 'ATTACK_PRESS' });
        this.actionQueue.push({ delay: 0.35, event: 'ATTACK_RELEASE' });
        this.actionQueue.push({ delay: 0.05, event: 'ATTACK_PRESS' }); // 3rd hit
      } else if (roll < 0.8) {
        this.aiState = 'BACKDASH';
        this.aiTimer = 0.4;
        this.actor.facing = -dir;
        this.actor.sm.dispatchEvent('DASH_PRESS');
      } else {
        this.aiState = 'JUMP_ATTACK';
        this.aiTimer = 0.6;
        this.actor.sm.dispatchEvent('JUMP_PRESS');
        this.actionQueue.push({ delay: 0.1, event: 'ATTACK_PRESS' });
      }
    }
  }
  
  executeCurrentAction(dir, absDx, dt) {
    if (this.aiState === 'CHARGE_SABER') {
        this.chargeLevel += dt;
        this.actor.chargeTime = this.chargeLevel;
        this.actor.inputX = dir;
        this.actor.sm.dispatchEvent('MOVE_INPUT');
        
        if (this.aiTimer <= 0.1 && this.chargeLevel > 0.8) {
            this.actor.sm.dispatchEvent('CHARGE_RELEASE');
            this.actor.sm.dispatchEvent('ATTACK_PRESS');
            this.chargeLevel = 0;
            this.actor.chargeTime = 0;
        }
    } 
    else if (this.aiState === 'BACKDASH') {
        this.actor.inputX = -dir;
        this.actor.sm.dispatchEvent('MOVE_INPUT');
    }
    else if (this.aiState === 'DASH_APPROACH' || this.aiState === 'WALK_APPROACH' || this.aiState === 'JUMP_APPROACH' || this.aiState === 'DASH_ATTACK') {
        this.actor.inputX = dir;
        this.actor.sm.dispatchEvent('MOVE_INPUT');
    }
    else if (this.aiState === 'COMBO') {
        this.actor.inputX = 0; // Stand still for combo
        this.actor.sm.dispatchEvent('STOP_INPUT');
    }
    else {
        this.actor.inputX = 0;
        this.actor.sm.dispatchEvent('STOP_INPUT');
    }
  }

  _checkCollisions(pActor, pSm) {
    const myHitbox = this.actor.getAttackHitbox ? this.actor.getAttackHitbox() : null;
    if (myHitbox && !pActor.isInvincible && pSm.superState !== 'HURT') {
        const pBox = { x: pActor.x - 12, y: pActor.y - 40, w: 24, h: 40 };
        const overlapX = myHitbox.x < pBox.x + pBox.w && myHitbox.x + myHitbox.w > pBox.x;
        const overlapY = myHitbox.y < pBox.y + pBox.h && myHitbox.y + myHitbox.h > pBox.y;
        if (overlapX && overlapY) {
            if (this.myLastAttackId !== myHitbox.attackId) {
                this.myLastAttackId = myHitbox.attackId;
                if (myHitbox.isHeavy) {
                  pActor.hp -= 1; // Extra point of damage. HIT_RECEIVED deducts another 1 point. Total 2.
                }
                pSm.dispatchEvent('HIT_RECEIVED');
            }
        }
    }
    
    const dx = pActor.x - this.actor.x;
    const dy = pActor.y - this.actor.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 35) {
      if (!pActor.isInvincible && pSm.superState !== 'HURT' && this.actor.sm.state !== 'HURT' && !this.isDead) {
          pSm.dispatchEvent('HIT_RECEIVED');
      }
    }

    const pAttack = pActor.getAttackHitbox ? pActor.getAttackHitbox() : null;
    if (pAttack && !this.actor.isInvincible && this.actor.sm.superState !== 'HURT' && !this.isDead) {
        const myBox = { x: this.actor.x - 12, y: this.actor.y - 40, w: 24, h: 40 };
        const overlapX = pAttack.x < myBox.x + myBox.w && pAttack.x + pAttack.w > myBox.x;
        const overlapY = pAttack.y < myBox.y + myBox.h && pAttack.y + myBox.h > myBox.y;
        
        if (overlapX && overlapY) {
            if (this.lastHitAttackId !== pAttack.attackId) {
                this.lastHitAttackId = pAttack.attackId;
                this.takeDamage(pAttack.isHeavy ? 3 : 1);
            }
        }
    }
  }
  
  draw(ctx) {
    ctx.save();
    if (!this.isDead) {
        ctx.filter = 'hue-rotate(150deg) saturate(1.5) brightness(0.8)';
    }
    this.actor.draw(ctx);
    ctx.restore();
    
    if (this.isDead) return;

    ctx.fillStyle = '#ef4444';
    const hpPct = Math.max(0, this.actor.hp / this.maxHp);
    ctx.fillRect(this.actor.x - 20, this.actor.y - 60, 40 * hpPct, 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.actor.x - 20, this.actor.y - 60, 40, 4);
    
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText('OMEGA', this.actor.x - 12, this.actor.y - 65);
  }
}

const canvas = typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null;
const ctx = canvas ? canvas.getContext('2d') : null;
const player = new PlayerActor();

// 3 Progressive Pantheon Guardians in Room 2 (x: 810 to 1650)
const enemies = [
  new EnemyActor(980, 860, 1100, 1),   // Tier 1: Scout (Fácil)
  new EnemyActor(1240, 1120, 1380, 2), // Tier 2: Gunner (Médio - Disparos de Plasma)
  new EnemyActor(1480, 1380, 1600, 3),  // Tier 3: Elite Kiter (Difícil - Spacing, Kiting, 7 HP)
  new ZeroBossAI(3100, WORLD.GROUND_Y) // OMEGA ZERO BOSS
];

let cameraX = 0;

function resetGame() {
  player.reset(140, WORLD.GROUND_Y);
  respawnAllEnemies();
}

function respawnAllEnemies() {
  enemies[0].respawn(980);
  enemies[1].respawn(1240);
  enemies[2].respawn(1480);
  enemies[3].respawn(3100);
  if (typeof logEvent === 'function') logEvent('[RESPAWN] Todos os inimigos e o BOSS foram recriados!', 'event-fired');
}

function warpPlayer(x) {
  player.x = x;
  player.y = WORLD.GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.isGrounded = true;
  logEvent(`[WARP] Zero teleportado para x=${x} (${player.getCurrentRoom()})!`, 'state-trans');
}

function testHitPlayer() {
  if (!player.isInvincible && !player.isDead && player.sm.superState !== 'HURT') {
    player.sm.dispatchEvent('HIT_RECEIVED');
  } else {
    logEvent('[HIT] Ignorado: Zero está com I-Frames (Invencível) ou destruído!', 'event-fired');
  }
}

function testChargePlayer() {
  player.chargeTime = 1.5;
  logEvent('[CHARGE] Carga máxima instantânea no Z-Saber! Solte J/X para disparar.', 'event-fired');
}

function healPlayer() {
  player.hp = PHYS.MAX_HP;
  player.isDead = false;
  logEvent(`[HEAL] HP do Zero restaurado para ${PHYS.MAX_HP}/${PHYS.MAX_HP}!`, 'state-trans');
}

const keys = {};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    if (keys[e.code]) return;
    keys[e.code] = true;

    if (e.code === 'KeyR') { resetGame(); return; }
    if (e.code === 'KeyT') { respawnAllEnemies(); return; }
    if (e.code === 'KeyH') { testHitPlayer(); return; }
    if (e.code === 'KeyG') { testChargePlayer(); return; }

    if (e.code === 'Digit1') { warpPlayer(120); return; }
    if (e.code === 'Digit2') { warpPlayer(900); return; }
    if (e.code === 'Digit3') { warpPlayer(1750); return; }
    if (e.code === 'Digit4') { warpPlayer(2600); return; }

    if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'KeyZ') {
      player.sm.dispatchEvent('JUMP_PRESS');
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyL' || e.code === 'KeyC') {
      player.sm.dispatchEvent('DASH_PRESS');
    }
    if (e.code === 'KeyJ' || e.code === 'KeyX') {
      player.sm.dispatchEvent('ATTACK_PRESS');
    }
    if (e.code === 'KeyF' || e.code === 'KeyV') {
      player.busterTimer = 0.4;
      player.particles.push({
        x: player.x + player.facing * 25,
        y: player.y - 25,
        vx: player.facing * 15,
        vy: 0,
        alpha: 1,
        size: 6,
        color: '#ffff00'
      });
    }
  });

  window.addEventListener('keyup', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    keys[e.code] = false;

    if (e.code === 'KeyJ' || e.code === 'KeyX') {
      if (player.chargeTime >= 1.2) {
        player.sm.dispatchEvent('CHARGE_RELEASE');
      }
      player.chargeTime = 0;
    }
  });
}

function handleContinuousInput() {
  let move = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) move -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) move += 1;

  if (move !== player.inputX) {
    player.inputX = move;
    if (move !== 0) {
      player.sm.dispatchEvent('MOVE_INPUT');
    } else {
      player.sm.dispatchEvent('STOP_INPUT');
    }
  }
}

let lastTime = typeof performance !== 'undefined' ? performance.now() : 0;
let frameCount = 0;
let fpsTime = 0;

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1.0) {
    const fpsEl = document.getElementById('fpsDisplay');
    if (fpsEl) fpsEl.innerText = `${frameCount} FPS`;
    frameCount = 0;
    fpsTime = 0;
  }

  handleContinuousInput();
  player.update(dt);
  for (const enemy of enemies) {
    enemy.update(dt, player.x, player.y, player.sm);
  }

  // Smooth camera follow
  const targetCamX = player.x - WORLD.CANVAS_W / 2;
  cameraX += (targetCamX - cameraX) * 0.14;
  cameraX = Math.max(0, Math.min(WORLD.W - WORLD.CANVAS_W, cameraX));

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    drawWorld(ctx, cameraX);
    for (const enemy of enemies) {
      enemy.draw(ctx);
    }
    player.draw(ctx);
    ctx.restore();

    drawHUD(ctx, player);
    updateStatsUi(player);
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(gameLoop);
  }
}

if (typeof renderSequenceStudio === 'function') {
  renderSequenceStudio();
}

if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(gameLoop);
}

if (typeof module !== 'undefined') {
  module.exports = { player, enemies, resetGame, respawnAllEnemies, warpPlayer, testHitPlayer, testChargePlayer, healPlayer, gameLoop };
}
