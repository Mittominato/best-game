// Aurora Salvage — bootstrap, game loop and screenshot scenes.
//
// The loop steps the simulation at a fixed 1/60 s and renders every
// animation frame, so the game plays the same on any monitor. The same
// file also stages the screenshot scenes the entry ships: opening the
// game with ?shot=start shows the title, ?shot=play drops the pilot into
// a seeded mid-wave firefight, ?shot=end shows the game-over panel and
// ?shot=win the victory panel, each with &seed=<n> to fix the layout.

import { VIEW } from './config.js';
import { createAudio } from './audio.js';
import { drawGameOver, drawHud, drawPause, drawTitle, drawWin } from './hud.js';
import { createInput } from './input.js';
import { makeRng, hashSeed } from './random.js';
import { createRenderer, render } from './render.js';
import { createWorld, startGame, startWave, updateWorld } from './world.js';

const STEP = 1 / 60;

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedRaw = params.get('seed') ?? '7';
const seed = /^\d+$/.test(seedRaw) ? Number.parseInt(seedRaw, 10) : hashSeed(seedRaw);

const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const world = createWorld(makeRng(seed));
// The best score survives a reload: a pilot's record is theirs to beat.
try {
  const saved = Number.parseInt(window.localStorage.getItem('aurora-salvage-best') ?? '0', 10);
  if (Number.isFinite(saved) && saved > 0) world.best = saved;
} catch {
  // Private browsing or a blocked store: the game plays on without it.
}

function saveBest() {
  if (world.score <= world.best) return;
  world.best = world.score;
  try {
    window.localStorage.setItem('aurora-salvage-best', String(world.best));
  } catch {
    // The record lives in memory for this visit, then.
  }
}

function announce(text) {
  const status = document.getElementById('status');
  if (status) status.textContent = text;
}

// A scripted pilot for the play screenshot: flies, aims at the nearest
// rock and holds fire, so the shot shows bolts, bursts and a real score.
function scriptedInput(frame) {
  const fake = {
    mouseX: VIEW.width * 0.72,
    mouseY: VIEW.height * 0.34,
    mouseDown: true,
    pressed: new Set(),
    wasPressed: () => false,
    firing: () => true,
    moveX: () => (frame % 240 < 120 ? 1 : -1),
    moveY: () => (frame % 300 < 150 ? -1 : 1),
    endFrame: () => {},
  };
  return fake;
}

function stageShot() {
  if (shot === 'start') {
    world.phase = 'title';
    world.time = 3.2;
    // A lively title backdrop: a field already in motion behind the panel.
    startGame(world);
    world.phase = 'title';
    world.time = 3.2;
    // The wave banner is a gameplay cue, not a title one: keep the panel clean.
    world.texts = [];
    return;
  }
  if (shot === 'play') {
    startGame(world);
    // A busier mid-game moment: extra pods and a half-broken field.
    for (let i = 0; i < 4; i += 1) {
      world.pods.push({
        x: 300 + i * 170,
        y: 200 + (i % 2) * 220,
        vx: 10,
        vy: -8,
        radius: 11,
        bob: i,
        value: 50,
      });
    }
    world.score = 1240;
    world.combo = 4;
    world.comboTimer = 2.4;
    for (let frame = 0; frame < 260; frame += 1) {
      world.aimX = VIEW.width * 0.72;
      world.aimY = VIEW.height * 0.34;
      updateWorld(world, scriptedInput(frame), STEP, audio);
    }
    return;
  }
  if (shot === 'end') {
    startGame(world);
    world.score = 2380;
    world.wave = 4;
    world.kills = 31;
    world.podsCollected = 18;
    world.best = 2380;
    world.player.hull = 0;
    world.phase = 'over';
    world.time = 2.0;
    world.texts = [];
    return;
  }
  if (shot === 'win') {
    startGame(world);
    world.score = 12480;
    world.wave = 10;
    world.kills = 96;
    world.podsCollected = 54;
    world.best = 12480;
    world.phase = 'win';
    world.time = 2.0;
    world.texts = [];
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || STEP);
  last = now;
  world.aimX = input.mouseX;
  world.aimY = input.mouseY;

  if (!shot) {
    if (input.wasPressed('KeyM')) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off' : 'Sound on');
    }
    if (world.phase === 'title' && (input.wasPressed('Enter') || input.wasPressed('MouseClick'))) {
      audio.unlock();
      startGame(world);
      announce('Wave 1. Collect the amber salvage pods.');
    } else if (world.phase === 'playing' && input.wasPressed('KeyP')) {
      world.phase = 'paused';
      announce('Paused');
    } else if (world.phase === 'paused' && (input.wasPressed('KeyP') || input.wasPressed('MouseClick'))) {
      world.phase = 'playing';
      announce('Resumed');
    } else if ((world.phase === 'over' || world.phase === 'win') && (input.wasPressed('KeyR') || input.wasPressed('MouseClick'))) {
      audio.unlock();
      startGame(world);
      announce('Wave 1. Collect the amber salvage pods.');
    }
  }

  if (world.phase === 'playing') {
    let acc = dt + carry;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      updateWorld(world, input, STEP, audio);
      acc -= STEP;
      steps += 1;
    }
    carry = acc;
    if (world.phase === 'over' || world.phase === 'win') saveBest();
  } else {
    // Menus still animate: stars twinkle, nebulas drift, particles settle
    // and banner texts fade, even though nothing is playing.
    updateWorld(world, input, dt, audio);
    world.time += dt;
  }

  render(renderer, world);
  const ctx = renderer.ctx;
  if (world.phase === 'playing' || world.phase === 'paused') drawHud(ctx, world, audio.isMuted());
  if (world.phase === 'title') drawTitle(ctx, world);
  if (world.phase === 'paused') drawPause(ctx);
  if (world.phase === 'over') drawGameOver(ctx, world);
  if (world.phase === 'win') drawWin(ctx, world);
  input.endFrame();
}

let last = performance.now();
let carry = 0;

if (shot) {
  stageShot();
  // Screenshot scenes render once, fully staged, with no waiting on the
  // player: the still frame is the deliverable.
  world.aimX = VIEW.width * 0.72;
  world.aimY = VIEW.height * 0.34;
  render(renderer, world);
  const ctx = renderer.ctx;
  if (shot === 'play') drawHud(ctx, world, false);
  if (shot === 'start') drawTitle(ctx, world);
  if (shot === 'end') drawGameOver(ctx, world);
  if (shot === 'win') drawWin(ctx, world);
} else {
  // A quiet attract field behind the title screen.
  startGame(world);
  world.phase = 'title';
  requestAnimationFrame(frame);
}

// For play-testing and debugging from the console.
window.__aurora = { world, input, startGame, startWave };
