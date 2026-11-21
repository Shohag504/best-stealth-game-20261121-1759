[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/shohag504/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/shohag504/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Lantern Shadow — The Midnight Archive

A top-down 2D stealth game, built for the [make.fun](https://make.fun) "Make the best stealth game" bounty. You are a lantern thief slipping through a midnight archive: steal the three moon lanterns and reach the glowing exit without being seen.

## How to play

Open `game/index.html` in a desktop browser — no build step, no network, everything is static files under `game/`.

- **WASD / arrow keys** — move. **Shift** — sneak (slower, quieter, harder to spot). **Click** — walk to that spot.
- **Guards** patrol the three wings with visible vision cones. A cone filling yellow means a guard is getting suspicious; orange is close to the alarm; red means the chase is on. Suspicion always falls again when you break line of sight, so a near miss is recoverable.
- **Crates** block sight and movement — slip behind one. **Bushes** block sight but not movement — crouch inside one and you are much harder to spot.
- **Walking is loud**: nearby guards come to investigate the noise. Sneaking is silent.
- Steal all **3 moon lanterns** and the exit door opens. Reach it unseen to escape. If a guard catches you, press **R** or click to try again.

## The game

- `game/index.html` — page shell and canvas
- `game/main.js` — boot, frame loop, and the staged `?shot=` frames used for the screenshots
- `game/level.js` — the archive floor plan, cover, lanterns, exit, and guard routes
- `game/player.js` — the thief: walking, sneaking, click-to-move, and noise
- `game/guard.js` — patrols, vision cones, the suspicion meter, the chase, and investigating noises
- `game/render.js` — all the art: floor, walls, crates, bushes, guards, cones, night lighting, and the HUD
- `game/audio.js` — footsteps, pickup chimes, and alarm stings, all synthesized with WebAudio
- `game/input.js` — keyboard and mouse
- `game/state.js` — title, playing, caught, and escaped

Every drawing is procedural canvas art and every sound is synthesized — no copied assets, no copied game.

## Screenshots

The four images in `screenshots/` are real renders of this game's own code in headless Chrome: the cover shows a mid-game sneak past a guard's cone, then the alarm chase, the title screen, and the escape.

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`serve.ts` serves `game/` on http://localhost:8080 for local play-testing.

## License

MIT — see [LICENSE](LICENSE).
