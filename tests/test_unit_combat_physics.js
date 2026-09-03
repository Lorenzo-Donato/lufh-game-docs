/**
 * Unit Test Suite: Combat & World Physics (3-Tier Enemy System & Saber Hitboxes)
 */

const assert = require('assert');
const { WORLD, PHYS } = require('../src/js/constants');
const { SOLIDS, checkCanStandUp, getRoomName } = require('../src/js/world_geometry');
const { PlayerActor } = require('../src/js/player_actor');
const { EnemyActor } = require('../src/js/enemy_actor');

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

console.log('\n--- Running Unit Tests: Combat & Physics Geometry (Hitboxes & Anti-Jitter) ---');

// 1. World Geometry & Room Queries
it('should correctly identify rooms based on X coordinates', () => {
  assert.strictEqual(getRoomName(100), 'Sala 1 (Treino/Wall-Kick)');
  assert.strictEqual(getRoomName(790), 'Sala 1 (Treino/Wall-Kick)');
  assert.strictEqual(getRoomName(900), 'Sala 2 (3 Pantheons)');
  assert.strictEqual(getRoomName(1600), 'Sala 2 (3 Pantheons)');
  assert.strictEqual(getRoomName(1750), 'Sala 3 (Duto Dash / Goal)');
  assert.strictEqual(getRoomName(2300), 'Sala 3 (Duto Dash / Goal)');
});

// 2. Low Tunnel Clearance & canStandUp Check (Calibrated 38px clearance)
it('should evaluate canStandUp correctly: false under low tunnel (height 38px) and true in open areas', () => {
  assert.strictEqual(checkCanStandUp(140, WORLD.GROUND_Y), true);
  assert.strictEqual(checkCanStandUp(1000, WORLD.GROUND_Y), true);
  assert.strictEqual(checkCanStandUp(1900, WORLD.GROUND_Y), false);
  assert.strictEqual(checkCanStandUp(2050, WORLD.GROUND_Y), false);
  assert.strictEqual(checkCanStandUp(2200, WORLD.GROUND_Y), false);
  assert.strictEqual(checkCanStandUp(2300, WORLD.GROUND_Y), true);
});

// 3. Player Z-Saber Hitbox Geometry
it('PlayerActor should calculate forward-oriented Z-Saber hitboxes with generous reach', () => {
  const player = new PlayerActor();
  player.x = 1000;
  player.y = 380;
  player.facing = 1;

  // Not attacking -> hitbox is null
  assert.strictEqual(player.getAttackHitbox(), null);

  // Attack 1 -> Forward reach of 82px + 24px backward
  player.sm.transitionTo('GROUNDED', 'ATTACK_1');
  const box1 = player.getAttackHitbox();
  assert(box1 !== null);
  assert.strictEqual(box1.isHeavy, false);
  assert.strictEqual(box1.w >= 100, true);
  assert(box1.x <= 1000 && box1.x + box1.w >= 1070);

  // Charge Slash -> Massive reach of 115px + 24px backward
  player.sm.transitionTo('GROUNDED', 'CHARGE_SLASH');
  const boxHeavy = player.getAttackHitbox();
  assert.strictEqual(boxHeavy.isHeavy, true);
  assert.strictEqual(boxHeavy.w >= 135, true);
});

// 4. Tier 2 (Gunner): Shooting & Deflection Mechanics
it('Tier 2 (Gunner): should fire plasma bullets and allow player to slice/deflect bullets', () => {
  const gunner = new EnemyActor(1200, 1100, 1300, 2);
  const player = new PlayerActor();
  player.x = 1100;
  player.y = 380;

  assert.strictEqual(gunner.tier, 2);
  assert.strictEqual(gunner.maxHp, 5);
  assert.strictEqual(gunner.canShoot, true);

  // Trigger shoot state
  gunner.shootTimer = 0;
  gunner.update(0.016, player.x, player.y, player.sm);
  assert.strictEqual(gunner.state, 'SHOOT');

  // Spawn bullet and test deflection by player saber
  gunner.animFrame = 2;
  gunner._updateShootBehavior(0.016, -100);
  assert.strictEqual(gunner.bullets.length, 1);

  // Player attacks -> saber deflects bullet
  player.sm.transitionTo('GROUNDED', 'ATTACK_1');
  const bullet = gunner.bullets[0];
  bullet.x = 1100;
  gunner.update(0.016, player.x, player.y, player.sm);
  assert.strictEqual(gunner.bullets.length, 0); // Deflected!
});

// 5. Tier 3 (Elite Kiter): Anti-Jitter Facing & Kiting
it('Tier 3 (Elite Kiter): should hold facing deadzone and kite smoothly without vibrating', () => {
  const elite = new EnemyActor(1500, 1350, 1600, 3);
  const player = new PlayerActor();
  player.x = 1460;
  player.y = 380;

  assert.strictEqual(elite.tier, 3);
  assert.strictEqual(elite.maxHp, 7);
  assert.strictEqual(elite.canKite, true);

  const initialX = elite.x;
  elite.update(0.016, player.x, player.y, player.sm);
  
  // Elite faces left towards player and moves right (x increases)
  assert.strictEqual(elite.facing, -1);
  assert.strictEqual(elite.x > initialX, true);

  // When player jumps right above enemy (within 30px deadzone), enemy DOES NOT flick facing!
  player.x = elite.x + 5;
  elite.update(0.016, player.x, player.y, player.sm);
  assert.strictEqual(elite.facing, -1); // Held firmly due to deadzone!
});

console.log(`\nCombat & Physics Unit Tests Summary: ${passed}/${total} passed.\n`);
if (passed !== total) process.exit(1);
