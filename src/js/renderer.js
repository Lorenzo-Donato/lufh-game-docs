/**
 * Canvas Rendering Pipeline: World, Dividers, Low Tunnel, HUD, Modals
 */

function drawWorld(ctx, camX) {
  // 1. Background Grid Pattern
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD.W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.H);
    ctx.stroke();
  }
  for (let y = 0; y < WORLD.H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.W, y);
    ctx.stroke();
  }

  // 2. Global Ceiling
  const gradCeil = ctx.createLinearGradient(0, 0, 0, WORLD.CEILING_Y);
  gradCeil.addColorStop(0, '#07090e');
  gradCeil.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradCeil;
  ctx.fillRect(0, 0, WORLD.W, WORLD.CEILING_Y);
  ctx.strokeStyle = '#ff2a5f';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, WORLD.W, WORLD.CEILING_Y);

  // 3. Global Floor
  const gradFloor = ctx.createLinearGradient(0, WORLD.GROUND_Y, 0, WORLD.H);
  gradFloor.addColorStop(0, '#1e293b');
  gradFloor.addColorStop(1, '#090d16');
  ctx.fillStyle = gradFloor;
  ctx.fillRect(0, WORLD.GROUND_Y, WORLD.W, WORLD.H - WORLD.GROUND_Y);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.GROUND_Y);
  ctx.lineTo(WORLD.W, WORLD.GROUND_Y);
  ctx.stroke();

  // Floor neon highlight line
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.GROUND_Y + 1);
  ctx.lineTo(WORLD.W, WORLD.GROUND_Y + 1);
  ctx.stroke();

  // 4. Outer Left Wall (Sala 1)
  ctx.fillStyle = '#1b253c';
  ctx.fillRect(0, 0, 60, WORLD.H);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 60, WORLD.H);

  // 5. Divider Wall 1 (Sala 1 ➔ Sala 2)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(790, 180, 24, 200);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(790, 180, 24, 200);

  ctx.fillStyle = '#ffb703';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('▲ WALL-KICK', 740, 170);
  ctx.fillText('➔ SALA 2', 820, 290);

  // 6. Divider Wall 2 (Sala 2 ➔ Sala 3)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(1640, 190, 24, 190);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(1640, 190, 24, 190);

  ctx.fillStyle = '#ffb703';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('▲ PULAR', 1648, 180);
  ctx.fillText('➔ SALA 3', 1670, 290);

  // 7. Low Duct / Tunnel in Sala 3 (x: 1850 to 2220, from y=40 to y=342)
  // Height 302px leaves 38px clearance from GROUND_Y(380)
  const gradTunnel = ctx.createLinearGradient(1850, 40, 1850, 342);
  gradTunnel.addColorStop(0, '#111827');
  gradTunnel.addColorStop(1, '#374151');
  ctx.fillStyle = gradTunnel;
  ctx.fillRect(1850, 40, 370, 302);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1850, 40, 370, 302);

  // Warning hazard stripes along bottom edge of low ceiling
  ctx.fillStyle = '#ff2a5f';
  for (let tx = 1850; tx < 2220; tx += 20) {
    ctx.fillRect(tx, 338, 10, 4);
  }

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('DUTO BAIXO — DASH [SHIFT/C]', 1880, 325);

  // 8. Divider Wall 3 (Sala 3 -> Sala 4 Boss)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(2480, 200, 24, 180);
  ctx.strokeStyle = '#ef4444'; // Red outline for boss door!
  ctx.lineWidth = 2;
  ctx.strokeRect(2480, 200, 24, 180);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('➔ BOSS', 2490, 180);

  // 9. Outer Right Wall (Goal Sala 4)
  ctx.fillStyle = '#1b253c';
  ctx.fillRect(3300, 0, 60, WORLD.H);
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 2;
  ctx.strokeRect(3300, 0, 60, WORLD.H);

  // Boss Area Warning neon (Sala 4)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'; // faint red tint
  ctx.fillRect(2510, 40, 790, 340);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('AVISO: ANOMALIA DETECTADA', 2800, 150);

  // Background room banners
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SALA 1', 350, 150);
  ctx.font = 'bold 12px monospace';
  ctx.fillText('Treino', 360, 175);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SALA 2', 1200, 150);
  ctx.font = 'bold 12px monospace';
  ctx.fillText('Combate', 1210, 175);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SALA 3', 1720, 150);
  ctx.font = 'bold 12px monospace';
  ctx.fillText('Dash', 1735, 175);

  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('SALA 4', 2900, 120);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('Confronto Final', 2875, 145);
}

function drawHUD(ctx, player) {
  // Room Location Badge (Top Center)
  ctx.save();
  const currentRoom = player.getCurrentRoom();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(WORLD.CANVAS_W / 2 - 130, 8, 260, 24);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(WORLD.CANVAS_W / 2 - 130, 8, 260, 24);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`📍 ${currentRoom}`, WORLD.CANVAS_W / 2, 24);
  ctx.restore();

  // Zero HP Bar (Top Left)
  const zBarX = 20;
  const zBarY = 28;
  const zBarW = 140;
  const zBarH = 14;

  ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
  ctx.fillRect(zBarX - 6, zBarY - 18, zBarW + 70, 42);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(zBarX - 6, zBarY - 18, zBarW + 70, 42);

  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('ZERO', zBarX, zBarY - 6);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(zBarX, zBarY, zBarW, zBarH);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(zBarX, zBarY, zBarW, zBarH);

  const segW = (zBarW - 6) / PHYS.MAX_HP;
  for (let i = 0; i < PHYS.MAX_HP; i++) {
    const segX = zBarX + 3 + i * segW;
    ctx.fillStyle = (i < player.hp) ? (player.hp > 1 ? '#00ffaa' : '#ff2a5f') : '#1e293b';
    ctx.fillRect(segX + 1, zBarY + 2, segW - 2, zBarH - 4);
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${Math.max(0, player.hp)}/${PHYS.MAX_HP}`, zBarX + zBarW + 8, zBarY + 11);

  if (player.isInvincible && !player.isDead) {
    ctx.fillStyle = Math.floor(Date.now() / 150) % 2 === 0 ? '#ffb703' : '#ff2a5f';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⚡ I-FRAMES', zBarX + 45, zBarY - 6);
  }

  if (!player.canStandUp) {
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.fillRect(zBarX + 220, 10, 180, 22);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('⚠️ TETO BAIXO (SLIDING)', zBarX + 230, 25);
    ctx.restore();
  }

  // Game Over Modal
  if (player.isDead) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 5, 8, 0.82)';
    ctx.fillRect(0, 0, WORLD.CANVAS_W, WORLD.CANVAS_H);

    const cx = WORLD.CANVAS_W / 2;
    const cy = WORLD.CANVAS_H / 2;

    ctx.fillStyle = '#111726';
    ctx.fillRect(cx - 180, cy - 60, 360, 120);
    ctx.strokeStyle = '#ff2a5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 180, cy - 60, 360, 120);

    ctx.fillStyle = '#ff2a5f';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ZERO DESTRUÍDO ⚠️', cx, cy - 20);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '13px monospace';
    ctx.fillText('Super Estado atual: DEATH :: DYING', cx, cy + 8);

    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Pressione [R] para Reiniciar na Sala 1', cx, cy + 34);
    ctx.restore();
  }
}

if (typeof module !== 'undefined') {
  module.exports = { drawWorld, drawHUD };
}
