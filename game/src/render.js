// Aurora Salvage — all canvas drawing.
//
// Rendering reads the world and paints it. It never mutates the world,
// so a frame can be redrawn or a screenshot retaken without changing the
// game. Every shape is drawn with canvas paths: the art is original and
// needs no image files.

import { PALETTE, VIEW } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function background(renderer, world) {
  const { ctx } = renderer;
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, PALETTE.spaceTop);
  g.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const nebulaColors = [PALETTE.nebulaA, PALETTE.nebulaB, PALETTE.nebulaC];
  for (const n of world.nebulas) {
    const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
    rg.addColorStop(0, nebulaColors[n.hue]);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
  }

  for (const s of world.stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(s.twinkle));
    ctx.globalAlpha = tw * s.depth;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function rockPath(ctx, x, y, radius, rot, verts) {
  ctx.beginPath();
  for (let i = 0; i < verts.length; i += 1) {
    const a = rot + (i / verts.length) * Math.PI * 2;
    const r = radius * verts[i];
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawAsteroid(ctx, a, boss) {
  ctx.save();
  // The Titan reads as a threat before its health bar does: a hot aura.
  if (boss) {
    const aura = ctx.createRadialGradient(a.x, a.y, a.radius * 0.6, a.x, a.y, a.radius * 1.9);
    aura.addColorStop(0, 'rgba(255, 93, 93, 0.22)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(a.x - a.radius * 1.9, a.y - a.radius * 1.9, a.radius * 3.8, a.radius * 3.8);
  }
  ctx.translate(a.x, a.y);
  rockPath(ctx, 0, 0, a.radius, a.rot, a.verts);
  ctx.fillStyle = boss ? '#7a4a3a' : PALETTE.asteroid;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = boss ? '#ff8f6a' : PALETTE.asteroidEdge;
  ctx.stroke();
  // Craters give the rock its face.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const craters = boss ? 5 : 3;
  for (let i = 0; i < craters; i += 1) {
    const ca = a.seed * 7 + i * 2.1;
    const cx = Math.cos(ca) * a.radius * 0.4;
    const cy = Math.sin(ca * 1.3) * a.radius * 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, a.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (a.maxHp > 1 && a.hp < a.maxHp) {
    const w = a.radius * 1.6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(a.x - w / 2, a.y - a.radius - 14, w, 5);
    ctx.fillStyle = '#ff8f6a';
    ctx.fillRect(a.x - w / 2, a.y - a.radius - 14, w * (a.hp / a.maxHp), 5);
  }
}

function drawPod(ctx, pod) {
  const pulse = 1 + 0.12 * Math.sin(pod.bob);
  ctx.save();
  ctx.translate(pod.x, pod.y);
  ctx.scale(pulse, pulse);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, pod.radius * 2.4);
  glow.addColorStop(0, PALETTE.podGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-pod.radius * 2.4, -pod.radius * 2.4, pod.radius * 4.8, pod.radius * 4.8);
  // A hexagonal cargo pod with a glowing core.
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * pod.radius;
    const py = Math.sin(a) * pod.radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#3a2a10';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.pod;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, pod.radius * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.pod;
  ctx.fill();
  ctx.restore();
}

const PICKUP_STYLE = {
  shield: { color: PALETTE.shield, label: 'S' },
  magnet: { color: PALETTE.magnet, label: 'M' },
  overcharge: { color: PALETTE.overcharge, label: 'O' },
};

function drawPickup(ctx, pk) {
  const style = PICKUP_STYLE[pk.kind];
  const bob = Math.sin(pk.bob) * 3;
  const blink = pk.life < 3 ? (Math.sin(pk.bob * 4) > 0 ? 1 : 0.35) : 1;
  ctx.save();
  ctx.globalAlpha = blink;
  ctx.translate(pk.x, pk.y + bob);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, pk.radius * 2.2);
  glow.addColorStop(0, style.color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = blink * 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(-pk.radius * 2.2, -pk.radius * 2.2, pk.radius * 4.4, pk.radius * 4.4);
  ctx.globalAlpha = blink;
  ctx.beginPath();
  ctx.arc(0, 0, pk.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1030';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = style.color;
  ctx.stroke();
  ctx.fillStyle = style.color;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.label, 0, 1);
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.phase === 'over') return;
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  // Speed lines while dashing: the dash should look fast, not just move fast.
  if (p.dashTimer > 0) {
    ctx.strokeStyle = 'rgba(93, 242, 230, 0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const off = (i - 2) * 9;
      const bx = -Math.cos(p.angle) * 26;
      const by = -Math.sin(p.angle) * 26;
      const px = -Math.sin(p.angle) * off;
      const py = Math.cos(p.angle) * off;
      ctx.beginPath();
      ctx.moveTo(bx + px, by + py);
      ctx.lineTo(bx - Math.cos(p.angle) * 26 + px, by - Math.sin(p.angle) * 26 + py);
      ctx.stroke();
    }
  }
  // Engine glow behind the skiff.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
  glow.addColorStop(0, PALETTE.playerGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-46, -46, 92, 92);
  ctx.rotate(p.angle);
  // The skiff: a dart with swept wings and a cockpit.
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-12, -13);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 13);
  ctx.closePath();
  ctx.fillStyle = '#0e2a33';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.player;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.player;
  ctx.fill();
  // Twin wing lights.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-11, -12, 3, 3);
  ctx.fillRect(-11, 9, 3, 3);
  ctx.restore();
  // Shield ring while a shield is up.
  if (p.shieldTime > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 + Math.sin(world.time * 5) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(126, 200, 255, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
  // Aim reticle at the pointer.
  ctx.save();
  ctx.strokeStyle = 'rgba(234, 246, 255, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(world.aimX, world.aimY, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(world.aimX - 15, world.aimY);
  ctx.lineTo(world.aimX - 6, world.aimY);
  ctx.moveTo(world.aimX + 6, world.aimY);
  ctx.lineTo(world.aimX + 15, world.aimY);
  ctx.moveTo(world.aimX, world.aimY - 15);
  ctx.lineTo(world.aimX, world.aimY - 6);
  ctx.moveTo(world.aimX, world.aimY + 6);
  ctx.lineTo(world.aimX, world.aimY + 15);
  ctx.stroke();
  ctx.restore();
}

function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    const g = ctx.createLinearGradient(-14, 0, 8, 0);
    g.addColorStop(0, 'rgba(255, 224, 102, 0)');
    g.addColorStop(1, PALETTE.bullet);
    ctx.fillStyle = g;
    ctx.fillRect(-14, -2.5, 22, 5);
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life / (t.maxLife * 0.6)));
    ctx.font = `bold ${t.size}px system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

export function render(renderer, world) {
  const { ctx } = renderer;
  ctx.save();
  if (world.shake > 0.3) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  background(renderer, world);
  for (const pod of world.pods) drawPod(ctx, pod);
  for (const pk of world.pickups) drawPickup(ctx, pk);
  for (const a of world.asteroids) drawAsteroid(ctx, a, false);
  if (world.boss) drawAsteroid(ctx, world.boss, true);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawTexts(ctx, world);
  ctx.restore();
}
