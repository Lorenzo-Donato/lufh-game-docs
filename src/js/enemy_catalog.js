/**
 * Pantheon Guardian Sprite Catalog (Optimized FPS for silky smooth animation)
 */
const ENEMY_CATALOG = [
  {"id": "enemy_pantheon_seq_01_idle", "cat": "Enemy", "label": "IDLE", "fps": 6, "loop": true, "frames": ["sprites_extracted/enemy_pantheon_seq_01_idle/frame_00.png", "sprites_extracted/enemy_pantheon_seq_01_idle/frame_01.png", "sprites_extracted/enemy_pantheon_seq_01_idle/frame_02.png"]},
  {"id": "enemy_pantheon_seq_02_hurt", "cat": "Enemy", "label": "HURT", "fps": 8, "loop": false, "frames": ["sprites_extracted/enemy_pantheon_seq_02_hurt/frame_00.png"]},
  {"id": "enemy_pantheon_seq_03_shoot", "cat": "Enemy", "label": "SHOOT", "fps": 10, "loop": false, "frames": ["sprites_extracted/enemy_pantheon_seq_03_shoot/frame_00.png", "sprites_extracted/enemy_pantheon_seq_03_shoot/frame_01.png", "sprites_extracted/enemy_pantheon_seq_03_shoot/frame_02.png", "sprites_extracted/enemy_pantheon_seq_03_shoot/frame_03.png", "sprites_extracted/enemy_pantheon_seq_03_shoot/frame_04.png"]},
  {"id": "enemy_pantheon_seq_04_walk", "cat": "Enemy", "label": "WALK", "fps": 9, "loop": true, "frames": ["sprites_extracted/enemy_pantheon_seq_04_walk/frame_00.png", "sprites_extracted/enemy_pantheon_seq_04_walk/frame_01.png", "sprites_extracted/enemy_pantheon_seq_04_walk/frame_02.png", "sprites_extracted/enemy_pantheon_seq_04_walk/frame_03.png", "sprites_extracted/enemy_pantheon_seq_04_walk/frame_04.png", "sprites_extracted/enemy_pantheon_seq_04_walk/frame_05.png"]},
  {"id": "enemy_pantheon_seq_05_death", "cat": "Enemy", "label": "DEATH", "fps": 10, "loop": false, "frames": ["sprites_extracted/enemy_pantheon_seq_05_death/frame_00.png", "sprites_extracted/enemy_pantheon_seq_05_death/frame_01.png"]}
];

function preloadEnemyImages() {
  if (typeof Image === 'undefined') return;
  ENEMY_CATALOG.forEach(seq => {
    seq.frames.forEach(path => {
      if (typeof loadedImages !== 'undefined' && !loadedImages[path]) {
        const imgObj = new Image();
        imgObj.src = path;
        loadedImages[path] = imgObj;
      }
    });
  });
}
preloadEnemyImages();

if (typeof module !== 'undefined') {
  module.exports = { 'ENEMY_CATALOG': ENEMY_CATALOG };
}
