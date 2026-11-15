// Aurora Salvage — the HUD and the menu screens.
//
// Everything the player reads: the score, the hull hearts, the wave, the
// combo, the dash and power-up timers, and the full-screen title, pause,
// game-over and victory panels. The panels are drawn on the canvas so
// they appear in screenshots exactly as the player sees them.

import { PALETTE, PLAYER, VIEW, WAVES } from './config.js';

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.55);
  ctx.bezierCurveTo(-size, -size * 0.25, -size * 0.45, -size * 0.95, 0, -size * 0.35);
  ctx.bezierCurveTo(size * 0.45, -size * 0.95, size, -size * 0.25, 0, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d7a' : 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.78)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(93, 242, 230, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function titleText(ctx, text, x, y, size, color) {
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bodyText(ctx, text, x, y, size, color) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawHud(ctx, world, muted) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Score, big and top-left.
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 24, 44);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(`WAVE ${world.wave} / ${WAVES.winWave}`, 24, 70);
  const rocksLeft = world.asteroids.length + (world.boss ? 1 : 0);
  if (world.phase === 'playing') ctx.fillText(`ROCKS LEFT ${rocksLeft}`, 24, 92);
  if (world.best > 0) ctx.fillText(`BEST ${world.best.toLocaleString('en-US')}`, 24, 114);

  // Hull hearts, top-right.
  for (let i = 0; i < PLAYER.maxHull; i += 1) {
    heart(ctx, VIEW.width - 36 - i * 34, 34, 13, i < p.hull);
  }
  ctx.font = '16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText('HULL', VIEW.width - 36 - PLAYER.maxHull * 34 - 8, 40);

  // Combo meter under the score.
  if (world.combo >= 2) {
    const mult = (1 + Math.min(world.combo, 8) * 0.5).toFixed(1);
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`COMBO x${mult}  (${world.combo})`, 24, 122);
    bar(ctx, 24, 130, 140, 6, world.comboTimer / 3, '#ffe066');
  }

  // Dash cooldown and active power-ups, bottom-left.
  ctx.textAlign = 'left';
  ctx.font = '15px system-ui, sans-serif';
  let line = 0;
  const dashFrac = p.dashCooldown <= 0 ? 1 : 1 - p.dashCooldown / 1.6;
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText('DASH [SPACE]', 24, VIEW.height - 66 - line * 22);
  bar(ctx, 150, VIEW.height - 78 - line * 22, 110, 7, dashFrac, dashFrac >= 1 ? '#5df2e6' : '#3a7d78');
  line += 1;
  if (p.shieldTime > 0) {
    ctx.fillStyle = PALETTE.shield;
    ctx.fillText(`SHIELD ${Math.ceil(p.shieldTime)}s`, 24, VIEW.height - 66 - line * 22);
    line += 1;
  }
  if (p.magnetTime > 0) {
    ctx.fillStyle = PALETTE.magnet;
    ctx.fillText(`MAGNET ${Math.ceil(p.magnetTime)}s`, 24, VIEW.height - 66 - line * 22);
    line += 1;
  }
  if (p.overchargeTime > 0) {
    ctx.fillStyle = PALETTE.overcharge;
    ctx.fillText(`OVERCHARGE ${Math.ceil(p.overchargeTime)}s`, 24, VIEW.height - 66 - line * 22);
    line += 1;
  }

  // Boss health bar, top-centre.
  if (world.boss) {
    const w = 420;
    const x = (VIEW.width - w) / 2;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ff8f8f';
    ctx.fillText('WRECK TITAN', VIEW.width / 2, 30);
    bar(ctx, x, 38, w, 10, world.boss.hp / world.boss.maxHp, '#ff5d5d');
  }

  // First-wave objective hint, fading out once the pilot has the idea.
  if (world.wave === 1 && world.time < 9 && world.phase === 'playing') {
    ctx.globalAlpha = Math.max(0, Math.min(1, (9 - world.time) / 2));
    ctx.textAlign = 'center';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('Smash every rock to clear the wave — amber pods are bonus score', VIEW.width / 2, VIEW.height - 44);
    ctx.globalAlpha = 1;
  }

  // Mute state, bottom-right.
  ctx.textAlign = 'right';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(muted ? 'SOUND OFF [M]' : 'SOUND ON [M]  ·  PAUSE [P]', VIEW.width - 24, VIEW.height - 18);
}

function controlsBlock(ctx, y) {
  bodyText(ctx, 'WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK — fire', VIEW.width / 2, y, 17, PALETTE.text);
  bodyText(ctx, 'SPACE — dash      P — pause      M — mute', VIEW.width / 2, y + 26, 17, PALETTE.text);
  bodyText(ctx, 'Collect amber salvage pods. Smash rocks. Survive 10 waves.', VIEW.width / 2, y + 52, 17, PALETTE.dimText);
}

export function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 360, 128, 720, 420);
  titleText(ctx, 'AURORA', VIEW.width / 2, 196, 64, PALETTE.player);
  titleText(ctx, 'SALVAGE', VIEW.width / 2, 258, 64, '#ffb347');
  bodyText(ctx, 'A salvage skiff, a debris field, ten waves of trouble.', VIEW.width / 2, 312, 18, PALETTE.dimText);
  controlsBlock(ctx, 356);
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) titleText(ctx, 'CLICK OR PRESS ENTER TO LAUNCH', VIEW.width / 2, 492, 20, '#ffe066');
  if (world.best > 0) bodyText(ctx, `BEST SCORE  ${world.best.toLocaleString('en-US')}`, VIEW.width / 2, 528, 15, PALETTE.dimText);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 260, 250, 520, 180);
  titleText(ctx, 'PAUSED', VIEW.width / 2, 300, 40, PALETTE.text);
  bodyText(ctx, 'Press P or click to keep flying', VIEW.width / 2, 352, 17, PALETTE.dimText);
}

function statsBlock(ctx, world, y) {
  bodyText(ctx, `SCORE  ${world.score.toLocaleString('en-US')}      WAVE  ${world.wave}      PODS  ${world.podsCollected}      ROCKS SMASHED  ${world.kills}`, VIEW.width / 2, y, 17, PALETTE.text);
}

export function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(20, 4, 8, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 360, 150, 720, 380);
  titleText(ctx, 'SKIFF LOST', VIEW.width / 2, 214, 56, '#ff5d5d');
  bodyText(ctx, 'The debris field claims another salvage crew.', VIEW.width / 2, 268, 18, PALETTE.dimText);
  statsBlock(ctx, world, 322);
  if (world.score >= world.best && world.score > 0) {
    titleText(ctx, 'NEW BEST SCORE!', VIEW.width / 2, 368, 22, '#ffe066');
  }
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) titleText(ctx, 'PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 448, 20, '#ffe066');
}

export function drawWin(ctx, world) {
  ctx.fillStyle = 'rgba(4, 16, 10, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 360, 150, 720, 380);
  titleText(ctx, 'CONTRACT', VIEW.width / 2, 200, 52, '#7dffb0');
  titleText(ctx, 'COMPLETE', VIEW.width / 2, 258, 52, '#7dffb0');
  bodyText(ctx, 'Ten waves cleared. The Aurora field is yours, pilot.', VIEW.width / 2, 308, 18, PALETTE.dimText);
  statsBlock(ctx, world, 352);
  titleText(ctx, `FINAL SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.width / 2, 400, 24, '#ffe066');
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) titleText(ctx, 'PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 472, 20, '#ffe066');
}
