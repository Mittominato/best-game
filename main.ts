// Aurora Salvage — the entry program for make.fun best-game-01.
//
// Node 22, standard library only. It hands the game in: it copies this
// repository's game/ and screenshots/ into the output directory and
// writes the dossier.json the judge reads, built with the vendored
// make.fun library (vendor/makefun-game.ts, the kit's copy, unchanged).
//
// The grader runs it with /output as the target. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally first with `node serve.ts`, then open
// http://localhost:8080 and play it in desktop Chrome.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function fail(message) {
  console.error(`aurora-salvage: ${message}`);
  process.exit(1);
}

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) fail('game/ is missing beside main.ts');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing beside main.ts');

const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const name of shots) {
  const file = join(shotsDir, name);
  if (!statSync(file).isFile()) fail(`screenshots/${name} is not a regular file`);
  if (statSync(file).size > 262144) fail(`screenshots/${name} is over 256 KiB`);
}

// A clean output directory: stale files from an earlier run must never
// ride along into the graded entry.
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json in the kit): text_max_bytes
// shapes the dossier text; the others refuse an entry the scorer would
// refuse, so main.ts checks the same limits before it writes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
if (dossier.length > 1572864) fail('dossier.json is over the 1.5 MiB cap');
writeFileSync(join(outDir, 'dossier.json'), dossier);

const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true });
console.log(`aurora-salvage: wrote ${outDir} (game: ${gameFiles.length} entries, screenshots: ${shots.join(', ')}, dossier: ${dossier.length} bytes)`);
