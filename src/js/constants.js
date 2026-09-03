/**
 * Mega Man Zero - StateSmith HSM Architecture
 * Game World, Physics & Animation Mapping Constants
 */

const WORLD = {
  W: 3360,             // Total world width (4 interconnected rooms of 840px each)
  H: 460,              // Total world height
  GROUND_Y: 380,       // Floor Y level
  CEILING_Y: 40,       // Global ceiling Y level
  CANVAS_W: 840,
  CANVAS_H: 460,

  // Room horizontal boundaries
  ROOM_1_START: 0,
  ROOM_1_END: 800,
  ROOM_2_START: 810,
  ROOM_2_END: 1650,
  ROOM_3_START: 1660,
  ROOM_3_END: 2500,
  ROOM_4_START: 2510,
  ROOM_4_END: 3360,

  // Room 3 Low Duct / Tunnel
  TUNNEL_START: 1850,
  TUNNEL_END: 2220,
  TUNNEL_CEILING_Y: 342, // 38px clearance from GROUND_Y(380) -> Perfectly fitted for Zero's Dash!
};

const PHYS = {
  // Movement
  RUN_SPEED: 5.2,
  DASH_SPEED: 10.0,
  DASH_DURATION: 0.35,

  // Jump & Gravity
  JUMP_VY: -13.0,
  GRAVITY: 28.0,
  MAX_FALL_SPEED: 14.0,
  WALL_KICK_VX: 7.0,
  WALL_KICK_VY: -13.0,

  // Air control
  AIR_ACCEL: 0.45,
  AIR_MAX_SPEED: 5.2,
  AIR_DRAG: 0.94,

  // Wall slide
  WALL_SLIDE_GRAVITY: 7.0,
  WALL_SLIDE_MAX_SPEED: 2.8,

  // Attack movement
  ATTACK_RUN_SPEED: 3.5,

  // Sprite rendering
  SPRITE_SCALE: 2.2,

  // Collision Box Dimensions (Accurately calibrated to sprite frames)
  STAND_HEIGHT: 50,    // Head at y=330 in standing/running/jumping (hits tunnel ceiling at 342)
  STAND_WIDTH: 22,     // Half-width 11px
  DASH_HEIGHT: 28,     // Head at y=352 in dash slide (comfortably under tunnel ceiling at 342)
  DASH_WIDTH: 30,      // Half-width 15px

  // Collision / Hurt
  KNOCKBACK_VX: 4.5,
  KNOCKBACK_VY: -6.0,
  INVINCIBLE_DURATION: 1.5,  // 1.5s de I-Frames
  HURT_STUN_DURATION: 0.4,   // 0.4s de stun de dano

  // Player HP
  MAX_HP: 4,
};

// 1-to-1 Mapping between StateMachine States and Sprite Sequence IDs
const STATE_ANIM_MAP = {
  'IDLE': 'seq_02_idle',
  'RUN': 'seq_07_run',
  'DASH': 'seq_11_dash',
  'ATTACK_1': 'seq_17_saber_slash_1',
  'ATTACK_2': 'seq_18_saber_slash_2',
  'ATTACK_3': 'seq_21_saber_slash_link',
  'ATTACK_RUN': 'seq_25_attack_walk_slash',
  'ATTACK_DASH': 'seq_27_attack_dash_slash',
  'CHARGE_SLASH': 'seq_20_saber_slash_heavy',
  'JUMP': 'seq_08_jump',
  'FALL': 'seq_10_jump_somersault',
  'ATTACK_AIR': 'seq_26_attack_air_jump_slash',
  'CHARGE_AIR_SLASH': 'seq_20_saber_slash_heavy',
  'GRAB_WALL': 'seq_12_wall_grab_slide',
  'ATTACK_GRAB_WALL': 'seq_18_saber_slash_2',
  'CHARGE_WALL_SLASH': 'seq_28_hang_charge_slash',
  'HURT_GROUND': 'seq_05_hurt_damage',
  'HURT_AIR': 'seq_05_hurt_damage',
  'DYING': 'seq_05_hurt_damage'
};

if (typeof module !== 'undefined') {
  module.exports = { WORLD, PHYS, STATE_ANIM_MAP };
}
