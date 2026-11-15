# Aurora Salvage

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Mittominato/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Mittominato/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original 2D arcade game for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01) (best-game-01).

You fly a salvage skiff through a nebula debris field. Collect the amber
salvage pods, smash the drifting rocks with your pulse bolts, grab shield,
magnet and overcharge pickups, and survive all ten waves — including the
Wreck Titan that lumbers in every fifth wave. Clear wave 10 and the
contract is complete.

## Play

Serve it locally and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/` is plain static files.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Fly |
| Mouse | Aim |
| Hold left click | Fire pulse bolts |
| Space | Dash (with a short cooldown) |
| P | Pause |
| M | Mute |
| R | Restart after game over or victory |

## The game

- **Goal:** collect salvage, clear each wave of asteroids, survive 10 waves.
- **Score:** pods are worth 50, rocks 15–40, the Wreck Titan 500; chaining
  pickups and kills inside 3 seconds builds a combo multiplier up to x5.
- **Hull:** three hearts. A shield pickup absorbs one hit; a dash gives a
  brief window of safety.
- **Waves:** each wave adds more rocks and pods; every fifth wave brings
  the Wreck Titan, a huge rock that sheds debris and takes 30 hits.
- **Sound:** every effect is synthesized live with WebAudio — no audio
  files ship with the game.

## Tuning

Every number the game plays by lives in `game/src/config.js`: the skiff's
speed and dash, the rocks' sizes, the wave growth, the combo window. The
waves are tuned so wave 1 teaches (5 rocks, 6 pods), the middle waves
press, and wave 10 with its second Titan is a real finish line — a first
run should reach wave 3 or 4, a practised pilot should clear the contract.

## Screenshots

The four stills in `screenshots/` are real renders of the game's own
code, staged with the deterministic scenes in `shots.json`:

1. `1-start.jpg` — the title screen (`?shot=start&seed=7`)
2. `2-play.jpg` — mid-wave combat (`?shot=play&seed=7`)
3. `3-end.jpg` — the game-over panel (`?shot=end&seed=7`)
4. `4-win.jpg` — the contract-complete panel (`?shot=win&seed=7`)

Any word works as a seed too (`?seed=aurora` stages the same field every
time), so a reviewer can reproduce a shot exactly.

## Layout

```
main.ts               entry program: copies game/ + screenshots/ to /output
                      and writes dossier.json with vendor/makefun-game.ts
serve.ts              tiny static server for local play-testing
shots.json            the four deterministic screenshot scenes
game/
  index.html          page shell
  style.css           page chrome around the canvas
  src/
    main.js           bootstrap, fixed-step loop, screenshot staging
    world.js          simulation: skiff, bolts, rocks, pods, waves, boss
    render.js         all canvas drawing (original vector art, no images)
    hud.js            HUD, title, pause, game-over and victory panels
    input.js          keyboard + mouse
    audio.js          synthesized WebAudio sound effects
    config.js         tuning constants
    random.js         seeded RNG for deterministic scenes
vendor/
  makefun-game.ts     the kit's dossier library, unchanged
```

## License

MIT — see [LICENSE](LICENSE).
