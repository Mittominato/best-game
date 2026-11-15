// Aurora Salvage — a tiny seeded random number generator.
//
// The live game uses Math.random. The screenshot scenes use a seeded
// generator so a shot set up with ?shot=play&seed=7 always lays the field
// out the same way. mulberry32 is small, fast and good enough for a game.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Turn a short word into a seed, so ?seed=aurora stages the same field
// as ?seed=7 would for its number: a name the pilot can remember.
export function hashSeed(word) {
  let h = 2166136261;
  for (let i = 0; i < word.length; i += 1) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
