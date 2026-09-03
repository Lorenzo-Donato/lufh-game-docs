/**
 * Pantheon Guardian Enemy Entity with 3 Difficulty Tiers & AI Kiting
 * Tier 1: Scout (Patrol / Basic)
 * Tier 2: Gunner (Patrol + Aimed Plasma Shots)
 * Tier 3: Elite Kiter (Tactical Spacing / Kites Player / Fast Recovery / Heavy Damage)
 * Uses state-locked animations, turn cooldowns, and accurate AABB combat registration.
 */

let _ENEMY_WORLD = null;
let _ENEMY_PHYS = null;
let _ENEMY_SOLIDS = null;

if (typeof require !== 'undefined') {
  try {
    const consts = require('./constants');
    _ENEMY_WORLD = consts.WORLD;
    _ENEMY_PHYS = consts.PHYS;
  } catch (e) {}
  try {
    const geo = require('./world_geometry');
    _ENEMY_SOLIDS = geo.SOLIDS;
  } catch (e) {}
}

if (typeof WORLD !== 'undefined' && !_ENEMY_WORLD) _ENEMY_WORLD = WORLD;
if (typeof PHYS !== 'undefined' && !_ENEMY_PHYS) _ENEMY_PHYS = PHYS;
if (typeof SOLIDS !== 'undefined' && !_ENEMY_SOLIDS) _ENEMY_SOLIDS = SOLIDS;

class EnemyActor {
  constructor(x, minX, maxX, tier = 1) {
    const W = _ENEMY_WORLD || (typeof WORLD !== 'undefined' ? WORLD : { GROUND_Y: 380 });
    this.startX = x;
    this.x = x;
    this.y = W.GROUND_Y;
    this.vx = 0;
    this.facing = -1;
    this.tier = tier;

    this.patrolLeft = minX || (x - 100);
    this.patrolRight = maxX || (x + 100);
    this.state = 'WALK';
    this.isDead = false;
    this.deathTimer = 0;
    this.hurtFlash = 0;
    this.turnCooldown = 0;
    this.lastHitAttackId = 0;

    this.currentSeqId = 'enemy_pantheon_seq_04_walk';
    this.animFrame = 0;
    this.animTimer = 0;
    this.stateTimer = 0;
    this.hasFiredInCurrentShoot = false;
    this.particles = [];
    this.bullets = [];

    this._applyTierAttributes();
  }

  _applyTierAttributes() {
    if (this.tier === 1) {
      this.title = 'Pantheon Scout (Fácil)';
      this.maxHp = 3;
      this.speed = 1.3;
      this.contactDamage = 1;
      this.canShoot = false;
      this.canKite = false;
      this.shootCooldown = 999;
      this.hurtDuration = 0.3;
      this.glowColor = '#00e5ff';
    } else if (this.tier === 2) {
      this.title = 'Pantheon Gunner (Médio)';
      this.maxHp = 5;
      this.speed = 2.0;
      this.contactDamage = 1;
      this.canShoot = true;
      this.canKite = false;
      this.shootCooldown = 2.0;
      this.hurtDuration = 0.25;
      this.glowColor = '#ffb703';
    } else {
      this.title = 'Pantheon Elite (Malandro)';
      this.maxHp = 8;
      this.speed = 3.3;
      this.contactDamage = 2;
      this.canShoot = true;
      this.canKite = true;
      this.shootCooldown = 1.3;
      this.hurtDuration = 0.18;
      this.glowColor = '#ff2a5f';
    }

    this.hp = this.maxHp;
    this.shootTimer = 0.6 + Math.random() * 0.5;
  }

  playSequence(seqId) {
    if (this.currentSeqId !== seqId) {
      this.currentSeqId = seqId;
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }

  respawn(x) {
    const W = _ENEMY_WORLD || (typeof WORLD !== 'undefined' ? WORLD : { GROUND_Y: 380 });
    if (x !== undefined) this.startX = x;
    this.x = this.startX;
    this.y = W.GROUND_Y;
    this.vx = 0;
    this.facing = -1;
    this.hp = this.maxHp;
    this.isDead = false;
    this.deathTimer = 0;
    this.hurtFlash = 0;
    this.turnCooldown = 0;
    this.lastHitAttackId = 0;
    this.state = 'WALK';
    this.playSequence('enemy_pantheon_seq_04_walk');
    this.stateTimer = 0;
    this.shootTimer = 0.6 + Math.random() * 0.5;
    this.particles = [];
    this.bullets = [];
  }

  takeDamage(amount = 1) {
    this.hp -= amount;
    this.hurtFlash = 0.2;
    if (this.hp <= 0) {
      this._onDeath(amount);
    } else {
      this.state = 'HURT';
      this.playSequence('enemy_pantheon_seq_02_hurt');
      this.stateTimer = this.hurtDuration;
      if (typeof logEvent === 'function') {
        logEvent(`[COMBATE] ${this.title} levou dano (-${amount})! HP: ${this.hp}/${this.maxHp}`, 'event-fired');
      }
    }
  }

  _onDeath(amount) {
    this.hp = 0;
    this.state = 'DEATH';
    this.playSequence('enemy_pantheon_seq_05_death');
    this.deathTimer = 0.6;
    if (typeof logEvent === 'function') {
      logEvent(`[COMBATE] ${this.title} destruído! (Dano: -${amount})`, 'state-trans');
    }
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.x + (Math.random() * 34 - 17),
        y: this.y - 20 + (Math.random() * 34 - 17),
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -6 - 1.5,
        size: Math.random() * 6 + 2,
        alpha: 1,
        color: Math.random() > 0.5 ? this.glowColor : '#ffb703'
      });
    }
  }

  update(dt, playerX, playerY, playerSm) {
    this._updateParticles(dt);
    this._updateBullets(dt, playerX, playerY, playerSm);

    if (this.isDead) return;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.turnCooldown > 0) this.turnCooldown -= dt;

    this._updateStateLogic(dt, playerX, playerSm);
    this._resolveSolidWallCollisions();
    this._advanceAnimation(dt);
    this._checkCombatCollisions(playerSm ? playerSm.actor : null);
  }

  _updateStateLogic(dt, playerX, playerSm) {
    const distToPlayer = playerX - this.x;
    const absDist = Math.abs(distToPlayer);
    const isPlayerInRoom2 = playerX >= 810 && playerX <= 1650;

    if (this.state === 'WALK') {
      this._updateWalkBehavior(dt, playerX, distToPlayer, absDist, isPlayerInRoom2, playerSm);
    } else if (this.state === 'SHOOT') {
      this._updateShootBehavior(dt, distToPlayer);
    } else if (this.state === 'MELEE') {
      this._updateMeleeBehavior(dt, distToPlayer, playerSm);
    } else if (this.state === 'HURT') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'WALK';
        this.playSequence('enemy_pantheon_seq_04_walk');
      }
    } else if (this.state === 'DEATH') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.isDead = true;
    }
  }

  _updateWalkBehavior(dt, playerX, distToPlayer, absDist, isPlayerInRoom2, playerSm) {
    this.playSequence('enemy_pantheon_seq_04_walk');

    if (this.canKite && isPlayerInRoom2) {
      this._updateEliteCombatStep(dt, distToPlayer, absDist, playerSm);
    } else {
      this._updatePatrolStep(distToPlayer, absDist, isPlayerInRoom2);
    }

    if (this.canShoot && isPlayerInRoom2) {
      this._checkShootingTrigger(dt, distToPlayer, absDist, playerSm);
    }
  }

  _updateEliteCombatStep(dt, distToPlayer, absDist, playerSm) {
    const pActor = playerSm ? playerSm.actor : null;
    const pVx = pActor ? pActor.vx : 0;
    const pIsAirborne = playerSm ? playerSm.superState === 'AIRBORNE' : false;
    const dirToPlayer = distToPlayer > 0 ? 1 : -1;

    // 1. Se tá colado E pronto pra atacar, encara e não foge! O MELEE vai engatilhar.
    if (absDist < 48 && this.shootTimer <= 0) {
      if (this.turnCooldown <= 0 && this.facing !== dirToPlayer) {
        this.facing = dirToPlayer;
        this.turnCooldown = 0.15;
      }
      return; // Fica parado pra bater
    }

    // 2. Kiting Tático e Preditivo (Sem moonwalk!)
    let sweetSpotMin = 100;
    let sweetSpotMax = 160;

    const isPlayerRushing = (distToPlayer > 0 && pVx > 2.5) || (distToPlayer < 0 && pVx < -2.5);
    if (isPlayerRushing) {
      sweetSpotMin = 160; 
    }

    // Se o player está no ar e perto, dar backdash rápido defensivo
    if (pIsAirborne && absDist < 120) {
      // Moonwalk aqui é válido (backdash)
      if (this.turnCooldown <= 0 && this.facing !== dirToPlayer) {
        this.facing = dirToPlayer;
      }
      this.x -= this.facing * (this.speed * 1.6);
    }
    else if (absDist < sweetSpotMin) {
      // Player muito perto: recuar andando de costas para ele (CORRENDO PRA LONGE, não moonwalk)
      if (this.turnCooldown <= 0 && this.facing === dirToPlayer) {
        this.facing = -dirToPlayer; // Vira as costas pra fugir!
        this.turnCooldown = 0.15;
      }
      this.x += this.facing * (this.speed * 1.3);
    }
    else if (absDist > sweetSpotMax) {
      // Player longe: Vira pro player e AVANÇA DE FRENTE
      if (this.turnCooldown <= 0 && this.facing !== dirToPlayer) {
        this.facing = dirToPlayer;
        this.turnCooldown = 0.15;
      }
      const isPlayerFleeing = (distToPlayer > 0 && pVx < -1) || (distToPlayer < 0 && pVx > 1);
      const chaseMult = isPlayerFleeing ? 1.5 : 1.1; 
      this.x += this.facing * (this.speed * chaseMult);
    }
    else {
      // Zona ideal: Vira pro player e continua avançando devagarinho
      if (this.turnCooldown <= 0 && this.facing !== dirToPlayer) {
        this.facing = dirToPlayer;
        this.turnCooldown = 0.15;
      }
      // Anda pra frente devagar pra não ficar 100% estático
      this.x += this.facing * (this.speed * 0.2);

      // Metralhar
      if (pActor && !pActor.isInvincible) {
        this.shootTimer -= dt * 1.1; 
      }
    }
  }

  _updatePatrolStep(distToPlayer, absDist, isPlayerInRoom2) {
    this.x += this.facing * this.speed;

    if (this.x <= this.patrolLeft && this.facing === -1) {
      this.facing = 1;
      this.turnCooldown = 0.3;
    } else if (this.x >= this.patrolRight && this.facing === 1) {
      this.facing = -1;
      this.turnCooldown = 0.3;
    }

    if (isPlayerInRoom2 && absDist > 35 && absDist < 260 && this.turnCooldown <= 0) {
      const desiredFacing = distToPlayer > 0 ? 1 : -1;
      if (this.facing !== desiredFacing) {
        this.facing = desiredFacing;
        this.turnCooldown = 0.28;
      }
    }
  }

  _checkShootingTrigger(dt, distToPlayer, absDist, playerSm) {
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && absDist < 320) {
      const isFacingPlayer = (distToPlayer > 0 && this.facing === 1) || (distToPlayer < 0 && this.facing === -1);
      
      const pInvincible = playerSm && playerSm.actor && playerSm.actor.isInvincible;
      if (this.tier === 3 && pInvincible) {
        this.shootTimer = 0.25; 
        return;
      }

      if (isFacingPlayer) {
        // Se estiver colado, GOLPE FÍSICO em vez de atirar! (Tiers 2 e 3)
        if (absDist < 48) {
          this.state = 'MELEE';
          this.playSequence('enemy_pantheon_seq_03_shoot');
          this.stateTimer = 0.45;
          this.hasFiredInCurrentShoot = false;
          this.shootTimer = this.shootCooldown * 0.8; // Volta a atacar um pouco mais rápido depois do melee
          return;
        }

        // Senão, SHOOT normal
        this.state = 'SHOOT';
        this.playSequence('enemy_pantheon_seq_03_shoot');
        this.stateTimer = 0.55;
        this.hasFiredInCurrentShoot = false;
        
        // Burst Fire (apenas Tier 3): 55% chance de soltar tiro duplo
        this.isBursting = (this.tier === 3 && Math.random() > 0.45);
        this.burstTimer = 0;

        this.shootTimer = this.shootCooldown;
      }
    }
  }

  _resolveSolidWallCollisions() {
    const solids = _ENEMY_SOLIDS || (typeof SOLIDS !== 'undefined' ? SOLIDS : []);
    const eWidth = 14;
    const eHeight = 44;

    for (const b of solids) {
      if (b.type === 'floor' || b.type === 'ceiling') continue;
      if (this.y > b.y && this.y - eHeight < b.y + b.h) {
        if (this.x + eWidth >= b.x && this.x - eWidth <= b.x + b.w) {
          if (this.facing === 1 && this.x < b.x) {
            this.x = b.x - eWidth;
            if (!this.canKite) { this.facing = -1; this.turnCooldown = 0.3; }
          } else if (this.facing === -1 && this.x > b.x + b.w) {
            this.x = b.x + b.w + eWidth;
            if (!this.canKite) { this.facing = 1; this.turnCooldown = 0.3; }
          }
        }
      }
    }

    // Hard room boundaries (Room 2: x between 825 and 1630)
    const minX = Math.max(825, this.patrolLeft);
    const maxX = Math.min(1630, this.patrolRight);
    if (this.x <= minX) {
      this.x = minX;
      if (!this.canKite) { this.facing = 1; this.turnCooldown = 0.3; }
    } else if (this.x >= maxX) {
      this.x = maxX;
      if (!this.canKite) { this.facing = -1; this.turnCooldown = 0.3; }
    }
  }

  _updateShootBehavior(dt, distToPlayer) {
    this.stateTimer -= dt;

    if (this.animFrame >= 2 && !this.hasFiredInCurrentShoot) {
      this.hasFiredInCurrentShoot = true;
      this._spawnPlasmaBullet(false);

      if (this.isBursting) {
        this.burstTimer = 0.12; // Atraso para o segundo tiro da rajada
      }
    }

    // Gerencia o segundo tiro se estiver no modo burst
    if (this.isBursting && this.hasFiredInCurrentShoot && this.burstTimer !== undefined) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this._spawnPlasmaBullet(true);
        this.isBursting = false;
      }
    }

    if (this.stateTimer <= 0) {
      this.state = 'WALK';
      this.playSequence('enemy_pantheon_seq_04_walk');
    }
  }

  _spawnPlasmaBullet(isBurst = false) {
    // Tiro surpresa do burst sai um pouco mais rápido e numa altura levemente diferente
    const bulletSpeed = this.tier === 3 ? (isBurst ? 8.6 : 7.2) : 5.8;
    const yOffset = isBurst ? -18 : -28; 

    this.bullets.push({
      x: this.x + this.facing * 22,
      y: this.y + yOffset,
      vx: this.facing * bulletSpeed,
      vy: 0,
      radius: this.tier === 3 ? 6 : 4.5,
      color: this.tier === 3 ? '#ff2a5f' : '#ffb703',
      damage: 1,
      life: 2.8
    });

    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.x + this.facing * 22,
        y: this.y + yOffset,
        vx: this.facing * (Math.random() * 3 + 2),
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 4 + 2,
        alpha: 1,
        color: this.tier === 3 ? '#ff2a5f' : '#ffff00'
      });
    }
  }

  _updateMeleeBehavior(dt, distToPlayer, playerSm) {
    this.stateTimer -= dt;

    if (this.animFrame >= 2 && !this.hasFiredInCurrentShoot) {
      this.hasFiredInCurrentShoot = true;
      
      const reach = 42; 
      const dx = (playerSm && playerSm.actor) ? (playerSm.actor.x - this.x) : 999;
      const dy = (playerSm && playerSm.actor) ? (playerSm.actor.y - this.y) : 999;
      
      // Efeito visual do soco/bastão
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: this.x + this.facing * 20 + (Math.random()*12 - 6),
          y: this.y - 24 + (Math.random()*12 - 6),
          vx: this.facing * 5 + (Math.random() - 0.5)*2,
          vy: (Math.random() - 0.5) * 4,
          size: Math.random() * 5 + 2,
          alpha: 1,
          color: '#ffffff'
        });
      }

      // Check hit
      if (Math.abs(dx) < reach && Math.sign(dx) === this.facing && Math.abs(dy) < 45) {
        if (playerSm && playerSm.actor && !playerSm.actor.isInvincible && playerSm.superState !== 'HURT') {
          playerSm.dispatchEvent('HIT_RECEIVED');
          if (typeof logEvent === 'function') logEvent('[COMBATE] ' + this.title + ' acertou um GOLPE FÍSICO no Zero!', 'event-fired');
        }
      }
    }

    if (this.stateTimer <= 0) {
      this.state = 'WALK';
      this.playSequence('enemy_pantheon_seq_04_walk');
    }
  }

  _updateBullets(dt, playerX, playerY, playerSm) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= dt;

      if (b.life <= 0 || b.x < 60 || b.x > 2460) {
        this.bullets.splice(i, 1);
        continue;
      }

      const dx = playerX - b.x;
      const dy = (playerY - 24) - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 26) {
        const isPlayerSlashing = playerSm && playerSm.actor && playerSm.actor.isAttackState && playerSm.actor.isAttackState();
        
        if (isPlayerSlashing) {
          for (let p = 0; p < 8; p++) {
            this.particles.push({
              x: b.x, y: b.y,
              vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
              size: 3, alpha: 1, color: '#00e5ff'
            });
          }
          if (typeof logEvent === 'function') logEvent('[DEFLECT] Sabre do Zero cortou e destruiu o projétil inimigo!', 'event-fired');
          this.bullets.splice(i, 1);
          continue;
        }

        if (playerSm && playerSm.actor && !playerSm.actor.isInvincible && !playerSm.actor.isDead && playerSm.superState !== 'HURT') {
          playerSm.dispatchEvent('HIT_RECEIVED');
          this.bullets.splice(i, 1);
        }
      }
    }
  }

  _advanceAnimation(dt) {
    const seq = typeof ENEMY_CATALOG !== 'undefined' ? ENEMY_CATALOG.find(s => s.id === this.currentSeqId) : null;
    if (!seq) return;
    this.animTimer += dt;
    const frameDuration = 1 / seq.fps;
    if (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      if (this.animFrame < seq.frames.length - 1) {
        this.animFrame++;
      } else if (seq.loop) {
        this.animFrame = 0;
      }
    }
  }

  _checkCombatCollisions(player) {
    if (this.state === 'DEATH' || this.state === 'HURT') return;
    if (!player) return;

    // 1. Contact damage to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (Math.abs(dx) < 28 && Math.abs(dy) < 35) {
      if (player.sm && !player.isInvincible && !player.isDead && player.sm.superState !== 'HURT') {
        player.sm.dispatchEvent('HIT_RECEIVED');
      }
    }

    // 2. Player attack hitting enemy
    const attackHitbox = player.getAttackHitbox ? player.getAttackHitbox() : null;
    if (attackHitbox) {
      const enemyBox = { x: this.x - 16, y: this.y - 48, w: 32, h: 48 };
      
      const overlapX = attackHitbox.x < enemyBox.x + enemyBox.w && attackHitbox.x + attackHitbox.w > enemyBox.x;
      const overlapY = attackHitbox.y < enemyBox.y + enemyBox.h && attackHitbox.y + attackHitbox.h > enemyBox.y;

      if (overlapX && overlapY) {
        if (this.lastHitAttackId !== attackHitbox.attackId) {
          this.lastHitAttackId = attackHitbox.attackId;
          this.takeDamage(attackHitbox.isHeavy ? 2 : 1);
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
    this._drawBullets(ctx);
    if (this.isDead && this.particles.length === 0) return;
    const P = _ENEMY_PHYS || (typeof PHYS !== 'undefined' ? PHYS : { SPRITE_SCALE: 2.2 });

    if (!this.isDead) {
      this._drawGroundShadow(ctx);
      this._drawSprite(ctx, P);
      this._drawHpBar(ctx);
    }
    this._drawParticles(ctx);
  }

  _drawGroundShadow(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 1, 16, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.restore();
  }

  _drawSprite(ctx, P) {
    const seq = typeof ENEMY_CATALOG !== 'undefined' ? ENEMY_CATALOG.find(s => s.id === this.currentSeqId) : null;
    if (!seq) return;
    const frameIndex = Math.min(this.animFrame, seq.frames.length - 1);
    const framePath = seq.frames[frameIndex];
    const imgObj = typeof loadedImages !== 'undefined' ? loadedImages[framePath] : null;

    if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
      if (this.hurtFlash <= 0 || Math.floor(Date.now() / 80) % 2 !== 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing * P.SPRITE_SCALE, P.SPRITE_SCALE);
        ctx.drawImage(imgObj, -imgObj.naturalWidth / 2, -imgObj.naturalHeight, imgObj.naturalWidth, imgObj.naturalHeight);

        // Eye visor glow
        ctx.fillStyle = this.glowColor;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.facing * 4, -imgObj.naturalHeight + 14, 3, 2);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = this.glowColor;
      ctx.fillRect(this.x - 12, this.y - 40, 24, 44);
    }
  }

  _drawHpBar(ctx) {
    if (this.hp <= 0) return;
    const barW = this.tier === 3 ? 46 : (this.tier === 2 ? 38 : 32);
    const barH = 5;
    const barX = this.x - barW / 2;
    const barY = this.y - 94;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = this.glowColor;
    ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);

    ctx.fillStyle = this.glowColor;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.tier === 3 ? '⚡ ELITE KITER' : (this.tier === 2 ? '🔫 GUNNER' : 'SCOUT'), this.x, barY - 4);
    ctx.textAlign = 'left';
  }

  _drawBullets(ctx) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
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
  module.exports = { EnemyActor };
}
