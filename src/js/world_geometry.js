/**
 * World Geometry Colliders & Raycast Checks
 */

let _WORLD = typeof WORLD !== 'undefined' ? WORLD : null;
if (typeof require !== 'undefined') {
  try {
    const consts = require('./constants');
    if (!_WORLD) _WORLD = consts.WORLD;
  } catch (e) {}
}

const SOLIDS = [
  // Outer Left Wall (Sala 1)
  { id: 'left_wall', x: 0, y: 0, w: 60, h: 460, type: 'wall', label: 'PAREDE ESQUERDA' },

  // Global Ceiling
  { id: 'ceiling', x: 0, y: 0, w: 3360, h: 40, type: 'ceiling', label: 'TETO GLOBAL' },

  // Global Floor
  { id: 'floor', x: 0, y: 380, w: 3360, h: 80, type: 'floor', label: 'CHÃO DA ARENA' },

  // Divider Wall 1 (Sala 1 -> Sala 2):
  // Height 180 to 380 (200px height), leaves 140px open top for Wall-Kick climbing
  { id: 'div_wall_1', x: 790, y: 180, w: 24, h: 200, type: 'divider', label: 'DIVISÓRIA 1 (WALL-KICK)' },

  // Divider Wall 2 (Sala 2 -> Sala 3):
  // Height 190 to 380 (190px height), leaves 150px open top
  { id: 'div_wall_2', x: 1640, y: 190, w: 24, h: 190, type: 'divider', label: 'DIVISÓRIA 2 (ACESSO SALA 3)' },

  // Low Tunnel Ceiling Block in Sala 3:
  { id: 'low_tunnel_ceiling', x: 1850, y: 40, w: 370, h: 302, type: 'low_ceiling', label: 'DUTO BAIXO (APENAS DASH)' },

  // Divider Wall 3 (Sala 3 -> Sala 4 (BOSS)):
  // Height 200 to 380, leaves 160px open top
  { id: 'div_wall_3', x: 2480, y: 200, w: 24, h: 180, type: 'divider', label: 'PORTÃO DO BOSS' },

  // Outer Right Wall (Sala 4 Boss)
  { id: 'right_wall', x: 3300, y: 0, w: 60, h: 460, type: 'wall', label: 'PAREDE FINAL' }
];

function checkCanStandUp(px, py) {
  const headIfStanding = py - 50; // Zero standing head position
  for (const b of SOLIDS) {
    if (b.type === 'low_ceiling' || b.type === 'ceiling') {
      if (px + 10 > b.x && px - 10 < b.x + b.w) {
        if (headIfStanding < b.y + b.h && py > b.y) {
          return false;
        }
      }
    }
  }
  return true;
}

function getRoomName(x) {
  const W = _WORLD || (typeof WORLD !== 'undefined' ? WORLD : { ROOM_1_END: 800, ROOM_2_END: 1650 });
  if (x < W.ROOM_1_END) return 'Sala 1 (Treino/Wall-Kick)';
  if (x < W.ROOM_2_END) return 'Sala 2 (3 Pantheons)';
  return 'Sala 3 (Duto Dash / Goal)';
}

if (typeof module !== 'undefined') {
  module.exports = { SOLIDS, checkCanStandUp, getRoomName };
}
