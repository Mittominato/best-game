// Aurora Salvage — tuning constants.
//
// One place for every number the designers argue about: the size of the
// playfield, how fast the skiff flies, how the waves grow, what each pickup
// is worth. Nothing here draws or simulates; the simulation reads it.

export const VIEW = {
  width: 1280,
  height: 720,
};

export const PLAYER = {
  radius: 16,
  accel: 2400,
  maxSpeed: 420,
  drag: 2.6,
  fireInterval: 0.16,
  bulletSpeed: 760,
  bulletRadius: 5,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableTime: 2.0,
  maxHull: 3,
};

export const ASTEROID = {
  minRadius: 14,
  maxRadius: 46,
  minSpeed: 40,
  maxSpeed: 130,
  splitInto: 2,
  scoreSmall: 40,
  scoreMedium: 25,
  scoreLarge: 15,
};

export const POD = {
  radius: 11,
  score: 50,
  driftSpeed: 26,
  // While the pilot is still flying, a fresh pod drifts in every few
  // seconds when the field runs low: the hunt never dries up mid-wave.
  trickleInterval: 6,
  trickleMin: 2,
};

export const PICKUP = {
  radius: 13,
  lifetime: 12,
  shieldTime: 10,
  magnetTime: 12,
  overchargeTime: 8,
};

export const WAVES = {
  // How many asteroids and pods each wave starts with. Wave n adds a little
  // more of each, so the field gets denser as the pilot gets better.
  baseAsteroids: 5,
  asteroidsPerWave: 2,
  basePods: 6,
  podsPerWave: 1,
  bossEvery: 5,
  winWave: 10,
  clearBonus: 250,
  // If a wave starts with fewer pods than this left over, top the field
  // back up: a wave with nothing to collect is a wave with no choices.
  podTopUp: 3,
};

export const SCORING = {
  comboWindow: 3.0,
  comboStep: 0.5,
  comboCap: 4,
  asteroidBreak: 10,
};

export const PALETTE = {
  spaceTop: '#0b1030',
  spaceBottom: '#05070f',
  nebulaA: 'rgba(88, 60, 180, 0.20)',
  nebulaB: 'rgba(24, 140, 160, 0.16)',
  nebulaC: 'rgba(200, 80, 140, 0.12)',
  player: '#5df2e6',
  playerGlow: 'rgba(93, 242, 230, 0.55)',
  bullet: '#ffe066',
  pod: '#ffb347',
  podGlow: 'rgba(255, 179, 71, 0.6)',
  asteroid: '#8a6f5c',
  asteroidEdge: '#5d4638',
  shard: '#b09a86',
  shield: '#7ec8ff',
  magnet: '#ff8fd1',
  overcharge: '#c9a6ff',
  danger: '#ff5d5d',
  text: '#eaf6ff',
  dimText: '#9db8cc',
};
