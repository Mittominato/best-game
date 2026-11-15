// Aurora Salvage — the simulation.
//
// Everything that moves, collides and scores lives here, in plain data:
// the skiff, its bolts, the asteroids, the salvage pods, the pickups, the
// particles and the floating score text. Rendering never mutates this
// state; main.js steps it with a fixed dt and hands it to render.js.

import { ASTEROID, PICKUP, PLAYER, POD, SCORING, VIEW, WAVES } from './config.js';
import { clamp, int, pick, range } from './random.js';

export function createWorld(rng) {
  return {
    rng,
    phase: 'title',
    time: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    waveState: 'idle',
    waveTimer: 0,
    kills: 0,
    podsCollected: 0,
    shotsFired: 0,
    shake: 0,
    player: freshPlayer(),
    bullets: [],
    asteroids: [],
    pods: [],
    pickups: [],
    particles: [],
    texts: [],
    boss: null,
    stars: makeStars(rng),
    nebulas: makeNebulas(rng),
  };
}

function freshPlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hull: PLAYER.maxHull,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: -1,
    invuln: 0,
    shieldTime: 0,
    magnetTime: 0,
    overchargeTime: 0,
    thrust: 0,
  };
}

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 170; i += 1) {
    stars.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      size: 0.6 + rng() * 1.8,
      depth: 0.25 + rng() * 0.75,
      twinkle: rng() * Math.PI * 2,
    });
  }
  return stars;
}

function makeNebulas(rng) {
  const nebulas = [];
  for (let i = 0; i < 5; i += 1) {
    nebulas.push({
      x: rng() * VIEW.width,
      y: rng() * VIEW.height,
      radius: 180 + rng() * 260,
      hue: i % 3,
      drift: (rng() - 0.5) * 6,
    });
  }
  return nebulas;
}

export function startGame(world) {
  world.phase = 'playing';
  world.time = 0;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.wave = 0;
  world.kills = 0;
  world.podsCollected = 0;
  world.shotsFired = 0;
  world.player = freshPlayer();
  world.bullets = [];
  world.asteroids = [];
  world.pods = [];
  world.pickups = [];
  world.particles = [];
  world.texts = [];
  world.boss = null;
  startWave(world, 1);
}

export function startWave(world, n) {
  const { rng } = world;
  world.wave = n;
  world.waveState = 'spawning';
  world.waveTimer = 0;
  const asteroidCount = WAVES.baseAsteroids + (n - 1) * WAVES.asteroidsPerWave;
  const podCount = WAVES.basePods + (n - 1) * WAVES.podsPerWave;
  for (let i = 0; i < asteroidCount; i += 1) spawnAsteroid(world, rng, false);
  // Top the pods back up when the last wave left the field thin, so
  // every wave opens with something worth chasing.
  const podsToAdd = Math.max(podCount - world.pods.length, WAVES.podTopUp - world.pods.length, 0);
  for (let i = 0; i < podsToAdd; i += 1) spawnPod(world, rng);
  if (n % WAVES.bossEvery === 0) spawnBoss(world, rng);
  addText(world, VIEW.width / 2, 190, `WAVE ${n}`, '#eaf6ff', 34);
  if (n % WAVES.bossEvery === 0) {
    addText(world, VIEW.width / 2, 232, 'WRECK TITAN APPROACHES', '#ff8f8f', 18);
  }
}

function farFromPlayer(world, x, y, minDist) {
  const dx = x - world.player.x;
  const dy = y - world.player.y;
  return dx * dx + dy * dy > minDist * minDist;
}

function edgePoint(world, rng) {
  const side = Math.floor(rng() * 4);
  const m = 30;
  if (side === 0) return { x: range(rng, 0, VIEW.width), y: -m };
  if (side === 1) return { x: VIEW.width + m, y: range(rng, 0, VIEW.height) };
  if (side === 2) return { x: range(rng, 0, VIEW.width), y: VIEW.height + m };
  return { x: -m, y: range(rng, 0, VIEW.height) };
}

export function spawnAsteroid(world, rng, nearPlayer) {
  const p = nearPlayer ? { x: range(rng, 60, VIEW.width - 60), y: range(rng, 60, VIEW.height - 60) } : edgePoint(world, rng);
  const radius = range(rng, ASTEROID.minRadius, ASTEROID.maxRadius);
  const speed = range(rng, ASTEROID.minSpeed, ASTEROID.maxSpeed);
  const angle = rng() * Math.PI * 2;
  world.asteroids.push({
    x: p.x,
    y: p.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    rot: rng() * Math.PI * 2,
    rotSpeed: (rng() - 0.5) * 1.6,
    hp: radius > 34 ? 3 : radius > 22 ? 2 : 1,
    maxHp: radius > 34 ? 3 : radius > 22 ? 2 : 1,
    verts: makeRockVerts(rng),
    seed: rng(),
  });
}

function makeRockVerts(rng) {
  const verts = [];
  const count = 9;
  for (let i = 0; i < count; i += 1) verts.push(0.72 + rng() * 0.4);
  return verts;
}

function spawnBoss(world, rng) {
  const hp = 28 + int(rng, 0, 5);
  world.boss = {
    x: VIEW.width / 2,
    y: -110,
    vx: 0,
    vy: 26,
    radius: 92,
    rot: 0,
    rotSpeed: 0.25,
    hp,
    maxHp: hp,
    verts: makeRockVerts(rng),
    spawnTimer: 4,
    announced: false,
    seed: rng(),
  };
}

export function spawnPod(world, rng) {
  let x;
  let y;
  let tries = 0;
  do {
    x = range(rng, 50, VIEW.width - 50);
    y = range(rng, 50, VIEW.height - 50);
    tries += 1;
  } while (!farFromPlayer(world, x, y, 140) && tries < 12);
  world.pods.push({
    x,
    y,
    vx: range(rng, -POD.driftSpeed, POD.driftSpeed),
    vy: range(rng, -POD.driftSpeed, POD.driftSpeed),
    radius: POD.radius,
    bob: rng() * Math.PI * 2,
    value: POD.score,
  });
}

function spawnPickup(world, x, y, kind) {
  world.pickups.push({
    x,
    y,
    vx: (world.rng() - 0.5) * 40,
    vy: (world.rng() - 0.5) * 40,
    radius: PICKUP.radius,
    kind,
    life: PICKUP.lifetime,
    bob: 0,
  });
}

export function addText(world, x, y, text, color, size = 16) {
  world.texts.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
}

export function burst(world, x, y, color, count, speed, size = 3) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(world.rng, 0.4, 0.9),
      maxLife: 0.9,
      size: range(world.rng, size * 0.5, size * 1.4),
      color,
    });
  }
}

function addScore(world, base, x, y) {
  const mult = 1 + Math.min(world.combo, 8) * SCORING.comboStep;
  const gained = Math.round(base * mult);
  world.score += gained;
  addText(world, x, y, `+${gained}`, '#ffe066', 15);
  return gained;
}

function breakAsteroid(world, asteroid, audio) {
  const { rng } = world;
  world.kills += 1;
  burst(world, asteroid.x, asteroid.y, '#b09a86', 14, 260, 3);
  burst(world, asteroid.x, asteroid.y, '#ff9a5d', 8, 180, 2.5);
  audio.explosion(asteroid.radius > 34);
  world.shake = Math.min(14, world.shake + (asteroid.radius > 34 ? 8 : 4));
  const score = asteroid.radius > 34 ? ASTEROID.scoreLarge : asteroid.radius > 22 ? ASTEROID.scoreMedium : ASTEROID.scoreSmall;
  addScore(world, score, asteroid.x, asteroid.y);
  world.combo = Math.min(8, world.combo + 1);
  world.comboTimer = SCORING.comboWindow;
  // Big rocks split into two smaller ones; small ones may drop a pickup.
  if (asteroid.radius > 24) {
    for (let i = 0; i < ASTEROID.splitInto; i += 1) {
      const a = rng() * Math.PI * 2;
      world.asteroids.push({
        x: asteroid.x,
        y: asteroid.y,
        vx: Math.cos(a) * range(rng, 90, 170),
        vy: Math.sin(a) * range(rng, 90, 170),
        radius: asteroid.radius * 0.55,
        rot: rng() * Math.PI * 2,
        rotSpeed: (rng() - 0.5) * 2.4,
        hp: 1,
        maxHp: 1,
        verts: makeRockVerts(rng),
        seed: rng(),
      });
    }
  } else if (rng() < 0.16) {
    spawnPickup(world, asteroid.x, asteroid.y, pick(rng, ['shield', 'magnet', 'overcharge']));
  }
}

function damagePlayer(world, audio) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTimer > 0 || world.phase !== 'playing') return;
  if (p.shieldTime > 0) {
    p.shieldTime = 0;
    p.invuln = 1.2;
    burst(world, p.x, p.y, '#7ec8ff', 18, 300, 3);
    addText(world, p.x, p.y - 30, 'SHIELD DOWN', '#7ec8ff', 16);
    audio.shieldDown();
    return;
  }
  p.hull -= 1;
  p.invuln = PLAYER.invulnerableTime;
  world.combo = 0;
  world.comboTimer = 0;
  world.shake = 16;
  burst(world, p.x, p.y, '#ff5d5d', 22, 320, 3.5);
  audio.hit();
  if (p.hull <= 0) {
    world.phase = 'over';
    burst(world, p.x, p.y, '#5df2e6', 40, 420, 4);
    burst(world, p.x, p.y, '#ffb347', 24, 300, 3);
    audio.explosion(true);
    audio.gameOver();
    if (world.score > world.best) world.best = world.score;
  }
}

function collectPod(world, pod, audio) {
  world.podsCollected += 1;
  addScore(world, pod.value, pod.x, pod.y);
  world.combo = Math.min(8, world.combo + 1);
  world.comboTimer = SCORING.comboWindow;
  burst(world, pod.x, pod.y, '#ffb347', 10, 160, 2.5);
  audio.pickup(world.combo);
}

function applyPickup(world, pickup, audio) {
  const p = world.player;
  if (pickup.kind === 'shield') {
    p.shieldTime = PICKUP.shieldTime;
    addText(world, p.x, p.y - 30, 'SHIELD UP', '#7ec8ff', 16);
  } else if (pickup.kind === 'magnet') {
    p.magnetTime = PICKUP.magnetTime;
    addText(world, p.x, p.y - 30, 'MAGNET 12s', '#ff8fd1', 16);
  } else {
    p.overchargeTime = PICKUP.overchargeTime;
    addText(world, p.x, p.y - 30, 'OVERCHARGE!', '#c9a6ff', 16);
  }
  burst(world, pickup.x, pickup.y, '#ffffff', 12, 200, 2.5);
  audio.powerup();
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function updateWorld(world, input, dt, audio) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 30);
  for (const s of world.stars) s.twinkle += dt * 2;
  for (const n of world.nebulas) {
    n.x += n.drift * dt;
    if (n.x < -n.radius) n.x = VIEW.width + n.radius;
    if (n.x > VIEW.width + n.radius) n.x = -n.radius;
  }
  updateParticles(world, dt);
  updateTexts(world, dt);
  if (world.phase !== 'playing') return;
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  updatePlayer(world, input, dt, audio);
  updateBullets(world, dt);
  updateAsteroids(world, dt, audio);
  updatePods(world, dt);
  updatePickups(world, dt);
  updateBoss(world, dt, audio);
  tricklePods(world, dt);
  checkCollisions(world, audio);
  checkWaveEnd(world, audio);
}

function tricklePods(world, dt) {
  world.podTimer = (world.podTimer ?? 0) - dt;
  if (world.podTimer > 0) return;
  if (world.pods.length < POD.trickleMin) {
    spawnPod(world, world.rng);
    world.podTimer = POD.trickleInterval;
  }
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 1 - 2.2 * dt;
    pt.vy *= 1 - 2.2 * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
}

function updateTexts(world, dt) {
  for (let i = world.texts.length - 1; i >= 0; i -= 1) {
    const t = world.texts[i];
    t.y -= 34 * dt;
    t.life -= dt;
    if (t.life <= 0) world.texts.splice(i, 1);
  }
}

function updatePlayer(world, input, dt, audio) {
  const p = world.player;
  const mx = input.moveX();
  const my = input.moveY();
  const len = Math.hypot(mx, my) || 1;
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);

  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.shieldTime > 0) p.shieldTime -= dt;
  if (p.magnetTime > 0) p.magnetTime -= dt;
  if (p.overchargeTime > 0) p.overchargeTime -= dt;

  if (input.wasPressed('Space') && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    const dx = mx !== 0 || my !== 0 ? mx / len : Math.cos(p.angle);
    const dy = mx !== 0 || my !== 0 ? my / len : Math.sin(p.angle);
    p.dashDirX = dx;
    p.dashDirY = dy;
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    burst(world, p.x, p.y, '#5df2e6', 10, 200, 2.5);
    audio.dash();
  }

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
  } else {
    p.vx += (mx / len) * PLAYER.accel * dt * (mx !== 0 || my !== 0 ? 1 : 0);
    p.vy += (my / len) * PLAYER.accel * dt * (mx !== 0 || my !== 0 ? 1 : 0);
    const drag = Math.max(0, 1 - PLAYER.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
  }

  p.x = clamp(p.x + p.vx * dt, PLAYER.radius, VIEW.width - PLAYER.radius);
  p.y = clamp(p.y + p.vy * dt, PLAYER.radius, VIEW.height - PLAYER.radius);
  p.thrust = mx !== 0 || my !== 0 ? 1 : Math.max(0, p.thrust - dt * 4);
  if (p.thrust > 0.5 && world.rng() < 0.5) {
    world.particles.push({
      x: p.x - Math.cos(p.angle) * 18,
      y: p.y - Math.sin(p.angle) * 18,
      vx: -Math.cos(p.angle) * 120 + (world.rng() - 0.5) * 60,
      vy: -Math.sin(p.angle) * 120 + (world.rng() - 0.5) * 60,
      life: 0.35,
      maxLife: 0.35,
      size: 2.5,
      color: '#5df2e6',
    });
  }

  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    const interval = p.overchargeTime > 0 ? PLAYER.fireInterval * 0.5 : PLAYER.fireInterval;
    p.fireTimer = interval;
    const spread = p.overchargeTime > 0 ? 0.05 : 0.02;
    const a = p.angle + (world.rng() - 0.5) * spread;
    world.bullets.push({
      x: p.x + Math.cos(p.angle) * 22,
      y: p.y + Math.sin(p.angle) * 22,
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      radius: PLAYER.bulletRadius,
      life: 1.1,
    });
    world.shotsFired += 1;
    audio.shoot();
  }
}

function updateBullets(world, dt) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
      world.bullets.splice(i, 1);
    }
  }
}

function updateAsteroids(world, dt) {
  for (const a of world.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotSpeed * dt;
    if (a.x < -a.radius - 20) a.x = VIEW.width + a.radius + 20;
    if (a.x > VIEW.width + a.radius + 20) a.x = -a.radius - 20;
    if (a.y < -a.radius - 20) a.y = VIEW.height + a.radius + 20;
    if (a.y > VIEW.height + a.radius + 20) a.y = -a.radius - 20;
  }
}

function updatePods(world, dt) {
  const p = world.player;
  for (let i = world.pods.length - 1; i >= 0; i -= 1) {
    const pod = world.pods[i];
    pod.bob += dt * 3;
    if (p.magnetTime > 0 && world.phase === 'playing') {
      const d = Math.hypot(p.x - pod.x, p.y - pod.y);
      if (d < 260 && d > 1) {
        const pull = 420 * (1 - d / 260);
        pod.vx += ((p.x - pod.x) / d) * pull * dt;
        pod.vy += ((p.y - pod.y) / d) * pull * dt;
      }
    }
    pod.x += pod.vx * dt;
    pod.y += pod.vy * dt;
    if (pod.x < pod.radius) { pod.x = pod.radius; pod.vx = Math.abs(pod.vx); }
    if (pod.x > VIEW.width - pod.radius) { pod.x = VIEW.width - pod.radius; pod.vx = -Math.abs(pod.vx); }
    if (pod.y < pod.radius) { pod.y = pod.radius; pod.vy = Math.abs(pod.vy); }
    if (pod.y > VIEW.height - pod.radius) { pod.y = VIEW.height - pod.radius; pod.vy = -Math.abs(pod.vy); }
  }
}

function updatePickups(world, dt) {
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.bob += dt * 3;
    pk.life -= dt;
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    if (pk.life <= 0) world.pickups.splice(i, 1);
  }
}

function updateBoss(world, dt, audio) {
  const boss = world.boss;
  if (!boss) return;
  boss.rot += boss.rotSpeed * dt;
  if (boss.y < 130) {
    boss.y += boss.vy * dt;
    if (boss.y >= 130 && !boss.announced) {
      boss.announced = true;
      audio.bossRoar();
    }
  } else {
    const p = world.player;
    const d = Math.max(1, Math.hypot(p.x - boss.x, p.y - boss.y));
    boss.vx += ((p.x - boss.x) / d) * 26 * dt;
    boss.vy += ((p.y - boss.y) / d) * 26 * dt;
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.spawnTimer -= dt;
    if (boss.spawnTimer <= 0) {
      boss.spawnTimer = 5;
      spawnAsteroid(world, world.rng, true);
      addText(world, boss.x, boss.y - boss.radius - 10, 'TITAN SHEDS DEBRIS', '#ff8f8f', 14);
    }
  }
  if (boss.x < boss.radius) { boss.x = boss.radius; boss.vx = Math.abs(boss.vx); }
  if (boss.x > VIEW.width - boss.radius) { boss.x = VIEW.width - boss.radius; boss.vx = -Math.abs(boss.vx); }
  if (boss.y < boss.radius) { boss.y = boss.radius; boss.vy = Math.abs(boss.vy); }
  if (boss.y > VIEW.height - boss.radius) { boss.y = VIEW.height - boss.radius; boss.vy = -Math.abs(boss.vy); }
}

function checkCollisions(world, audio) {
  const p = world.player;
  // Bullets vs asteroids and boss.
  for (let bi = world.bullets.length - 1; bi >= 0; bi -= 1) {
    const b = world.bullets[bi];
    let consumed = false;
    for (let ai = world.asteroids.length - 1; ai >= 0; ai -= 1) {
      const a = world.asteroids[ai];
      const rr = a.radius + b.radius;
      if (dist2(b.x, b.y, a.x, a.y) < rr * rr) {
        world.bullets.splice(bi, 1);
        consumed = true;
        a.hp -= 1;
        burst(world, b.x, b.y, '#ffe066', 5, 160, 2);
        if (a.hp <= 0) {
          world.asteroids.splice(ai, 1);
          breakAsteroid(world, a, audio);
        }
        break;
      }
    }
    if (consumed) continue;
    const boss = world.boss;
    if (boss) {
      const rr = boss.radius + b.radius;
      if (dist2(b.x, b.y, boss.x, boss.y) < rr * rr) {
        world.bullets.splice(bi, 1);
        boss.hp -= 1;
        burst(world, b.x, b.y, '#ffe066', 6, 200, 2.5);
        if (boss.hp <= 0) {
          burst(world, boss.x, boss.y, '#ff9a5d', 46, 420, 4);
          burst(world, boss.x, boss.y, '#ffffff', 20, 300, 3);
          audio.explosion(true);
          world.shake = 18;
          addScore(world, 500, boss.x, boss.y);
          addText(world, boss.x, boss.y - 110, 'TITAN DESTROYED  +500', '#ffe066', 20);
          world.boss = null;
          spawnPickup(world, boss.x - 40, boss.y, 'shield');
          spawnPickup(world, boss.x + 40, boss.y, 'overcharge');
        }
      }
    }
  }
  // Player vs asteroids and boss.
  for (let ai = world.asteroids.length - 1; ai >= 0; ai -= 1) {
    const a = world.asteroids[ai];
    const rr = a.radius + PLAYER.radius * 0.8;
    if (dist2(p.x, p.y, a.x, a.y) < rr * rr) {
      world.asteroids.splice(ai, 1);
      breakAsteroid(world, a, audio);
      damagePlayer(world, audio);
      if (world.phase !== 'playing') return;
    }
  }
  if (world.boss) {
    const rr = world.boss.radius + PLAYER.radius * 0.8;
    if (dist2(p.x, p.y, world.boss.x, world.boss.y) < rr * rr) {
      damagePlayer(world, audio);
      if (world.phase !== 'playing') return;
    }
  }
  // Player vs pods.
  for (let i = world.pods.length - 1; i >= 0; i -= 1) {
    const pod = world.pods[i];
    const rr = pod.radius + PLAYER.radius;
    if (dist2(p.x, p.y, pod.x, pod.y) < rr * rr) {
      world.pods.splice(i, 1);
      collectPod(world, pod, audio);
    }
  }
  // Player vs pickups.
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    const rr = pk.radius + PLAYER.radius;
    if (dist2(p.x, p.y, pk.x, pk.y) < rr * rr) {
      world.pickups.splice(i, 1);
      applyPickup(world, pk, audio);
    }
  }
}

function checkWaveEnd(world, audio) {
  if (world.phase !== 'playing') return;
  if (world.asteroids.length === 0 && !world.boss) {
    world.score += WAVES.clearBonus;
    addText(world, VIEW.width / 2, 260, `WAVE CLEAR  +${WAVES.clearBonus}`, '#7dffb0', 22);
    audio.waveClear();
    if (world.wave >= WAVES.winWave) {
      world.phase = 'win';
      if (world.score > world.best) world.best = world.score;
      audio.victory();
      return;
    }
    startWave(world, world.wave + 1);
  }
}
