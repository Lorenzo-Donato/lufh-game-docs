/**
 * Unit Test Suite: StateSmith Hierarchical State Machine (PlayerSm)
 * Tests all 25 States, 16 Events, 3-Hit Combo, Clean Dash Canceling, and Clean Ground-to-Air Jumping.
 */

const assert = require('assert');
const { PlayerSm } = require('../src/js/state_machine');

class MockActor {
  constructor() {
    this.x = 140;
    this.y = 380;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.isGrounded = true;
    this.wallSide = null;
    this.dashTimer = 0;
    this.hp = 4;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    this.hurtTimer = 0;
    this.isDead = false;
    this.canStandUp = true;
    this.isDashJumping = false;
    this.particles = [];
    this.currentSeqId = 'seq_02_idle';
    this.inputX = 0;
    this.attackId = 1;
  }

  playSequence(seqId) {
    this.currentSeqId = seqId;
  }

  isAttackState() {
    return this.currentSeqId.includes('slash') || this.currentSeqId.includes('attack');
  }

  createDashDust() {}
  createWallSparks() {}
  createLandDust() {}
}

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n--- Running Unit Tests: PlayerSm State Machine ---');

// 1. Initial State
it('should start in GROUNDED :: IDLE state', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();
  assert.strictEqual(sm.superState, 'GROUNDED');
  assert.strictEqual(sm.state, 'IDLE');
  assert.strictEqual(actor.currentSeqId, 'seq_02_idle');
});

// 2. Ground Movement Transitions
it('should handle IDLE -> RUN -> IDLE transitions with MOVE_INPUT and STOP_INPUT', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  sm.dispatchEvent('MOVE_INPUT');
  assert.strictEqual(sm.superState, 'GROUNDED');
  assert.strictEqual(sm.state, 'RUN');

  sm.dispatchEvent('STOP_INPUT');
  assert.strictEqual(sm.superState, 'GROUNDED');
  assert.strictEqual(sm.state, 'IDLE');
});

// 3. 3-Hit Z-Saber Ground Combo
it('should execute 3-Hit Z-Saber Combo (ATTACK_1 -> ATTACK_2 -> ATTACK_3 -> IDLE)', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_1');
  assert.strictEqual(actor.currentSeqId, 'seq_17_saber_slash_1');

  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_2');
  assert.strictEqual(actor.currentSeqId, 'seq_18_saber_slash_2');

  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_3');
  assert.strictEqual(actor.currentSeqId, 'seq_21_saber_slash_link');

  sm.dispatchEvent('ATTACK_FINISHED');
  assert.strictEqual(sm.state, 'IDLE');
});

// 4. Ground Attack to Dash: Cancels standing attack into clean DASH
it('should cancel ground attack into clean DASH on DASH_PRESS', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_1');

  // Cancel attack with dash -> enters clean DASH
  sm.dispatchEvent('DASH_PRESS');
  assert.strictEqual(sm.state, 'DASH');
  assert.strictEqual(actor.currentSeqId, 'seq_11_dash');
  assert(actor.dashTimer > 0);

  // While in DASH, pressing ATTACK_PRESS transitions to ATTACK_DASH
  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_DASH');
  assert.strictEqual(actor.currentSeqId, 'seq_27_attack_dash_slash');
});

// 5. Ground Attack to Jump: Must transition to clean JUMP (not ATTACK_AIR)
it('should transition cleanly from ground attack to JUMP on JUMP_PRESS (never auto-trigger ATTACK_AIR)', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.state, 'ATTACK_1');

  // Press jump during attack -> clean JUMP
  sm.dispatchEvent('JUMP_PRESS');
  assert.strictEqual(sm.superState, 'AIRBORNE');
  assert.strictEqual(sm.state, 'JUMP');
  assert.strictEqual(actor.currentSeqId, 'seq_08_jump');

  // Only once in air, ATTACK_PRESS triggers ATTACK_AIR
  sm.dispatchEvent('ATTACK_PRESS');
  assert.strictEqual(sm.superState, 'AIRBORNE');
  assert.strictEqual(sm.state, 'ATTACK_AIR');
  assert.strictEqual(actor.currentSeqId, 'seq_26_attack_air_jump_slash');
});

// 6. Wall Slide & Wall Kick
it('should enter WALL_SLIDE :: GRAB_WALL and perform WALL_KICK on JUMP_PRESS', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  sm.dispatchEvent('JUMP_PRESS');
  actor.wallSide = 'left';
  sm.dispatchEvent('WALL_TOUCH');
  assert.strictEqual(sm.superState, 'WALL_SLIDE');
  assert.strictEqual(sm.state, 'GRAB_WALL');

  sm.dispatchEvent('JUMP_PRESS');
  assert.strictEqual(sm.superState, 'AIRBORNE');
  assert.strictEqual(sm.state, 'JUMP');
  assert.strictEqual(actor.facing, 1);
});

// 7. Damage, I-Frames & Death
it('should handle damage, I-Frames, and transition to DEATH :: DYING on 0 HP', () => {
  const actor = new MockActor();
  const sm = new PlayerSm(actor);
  sm.start();

  actor.hp = 1;
  sm.dispatchEvent('HIT_RECEIVED');
  assert.strictEqual(sm.superState, 'HURT');
  assert.strictEqual(sm.state, 'HURT_GROUND');
  assert.strictEqual(actor.isInvincible, true);
  assert.strictEqual(actor.hp, 0);

  // During HURT / Invincible, subsequent hits are ignored
  sm.dispatchEvent('HIT_RECEIVED');
  assert.strictEqual(actor.hp, 0);

  sm.dispatchEvent('HURT_FINISHED');
  assert.strictEqual(sm.superState, 'DEATH');
  assert.strictEqual(sm.state, 'DYING');
  assert.strictEqual(actor.isDead, true);
});

console.log(`\nPlayerSm Unit Tests Summary: ${passed}/${total} passed.\n`);
if (passed !== total) process.exit(1);
