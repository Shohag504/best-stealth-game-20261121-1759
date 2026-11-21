// main.js — boots Lantern Shadow, runs the frame loop, and wires the
// thief, the guards, the lanterns and the exit together. It also
// honours ?shot=start|play|alarm|win, which stages one frozen frame
// for the entry's screenshots.

import { COLS, ROWS, TILE, buildArchiveLevel, buildGuardRoutes, tileCenter, tileAt } from './level.js';
import { createPlayer, updatePlayer, setMoveTarget, isHiddenInBush } from './player.js';
import { createGuard, updateGuard, guardHearsNoise } from './guard.js';
import { createGameState, startRun, catchThief, escapeArchive, allLanternsTaken } from './state.js';
import { createInput } from './input.js';
import { renderGame } from './render.js';
import { unlockAudio, playFootstep, playPickup, playAlarm, playCaught, playWin, playClick } from './audio.js';

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

// Fit the 960x640 archive into the window, keeping its shape.
let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  viewScale = Math.min(canvas.width / WIDTH, canvas.height / HEIGHT);
  viewOffsetX = (canvas.width - WIDTH * viewScale) / 2;
  viewOffsetY = (canvas.height - HEIGHT * viewScale) / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function toWorld(screenX, screenY) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return {
    x: (screenX * dpr - viewOffsetX) / viewScale,
    y: (screenY * dpr - viewOffsetY) / viewScale,
  };
}

const input = createInput(canvas, toWorld);
const state = createGameState();

let level;
let lanterns;
let exit;
let guards;
let player;

function resetWorld() {
  level = buildArchiveLevel();
  lanterns = level.lanterns.map((spot) => {
    const center = tileCenter(spot.x, spot.y);
    return { ...center, taken: false };
  });
  exit = tileCenter(level.exit.x, level.exit.y);
  guards = buildGuardRoutes().map((route, index) => createGuard(route, index));
  const spawn = tileCenter(2, 1);
  player = createPlayer(spawn);
}
resetWorld();

function thiefCaughtBy(guardName) {
  if (state.mode !== 'playing') return;
  catchThief(state, guardName);
  playCaught();
  statusLine.textContent = `Caught by the ${guardName} guard. Press R to try again.`;
}

function onNoise(noise) {
  for (const guard of guards) guardHearsNoise(guard, noise);
}

function update(dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;

  const click = input.consumeClick();
  if (click && click.x >= 0 && click.x < WIDTH && click.y >= 0 && click.y < HEIGHT) {
    setMoveTarget(player, click);
  }
  const wasMoving = player.moving;
  updatePlayer(player, input, level.grid, dt, onNoise);
  if (player.moving && !wasMoving) playFootstep(player.sneaking);

  const thiefState = {
    sneaking: player.sneaking,
    inBush: isHiddenInBush(level.grid, player),
  };
  let alarmWasOn = guards.some((g) => g.mode === 'chase');
  for (const guard of guards) {
    updateGuard(guard, level.grid, player, thiefState, dt, () => thiefCaughtBy(guard.name));
    if (state.mode !== 'playing') return;
  }
  if (!alarmWasOn && guards.some((g) => g.mode === 'chase')) playAlarm();

  // Picking up a lantern.
  for (const lantern of lanterns) {
    if (!lantern.taken && Math.hypot(lantern.x - player.x, lantern.y - player.y) < 26) {
      lantern.taken = true;
      state.lanternsTaken += 1;
      playPickup();
      statusLine.textContent = `Lantern ${state.lanternsTaken} of 3 stolen.`;
    }
  }

  // Reaching the exit with every lantern wins the run.
  if (allLanternsTaken(state)) {
    const col = Math.floor(player.x / TILE);
    const row = Math.floor(player.y / TILE);
    if (tileAt(level.grid, col, row) === 'E') {
      escapeArchive(state);
      playWin();
      statusLine.textContent = 'Escaped unseen with all three lanterns.';
    }
  }
}

// Staged, frozen frames for the entry's screenshots.
function applyShotMode(shot) {
  if (shot === 'start') {
    state.mode = 'title';
    return true;
  }
  if (shot === 'play') {
    startRun(state);
    state.time = 42;
    state.lanternsTaken = 1;
    lanterns[0].taken = true;
    player.x = tileCenter(10, 7).x;
    player.y = tileCenter(10, 7).y;
    player.sneaking = true;
    player.facing = Math.PI / 2;
    const guard = guards[0];
    guard.x = tileCenter(11, 3).x;
    guard.y = tileCenter(11, 3).y;
    guard.facing = Math.PI / 2;
    guard.suspicion = 55;
    guard.pauseTimer = 99;
    return true;
  }
  if (shot === 'alarm') {
    startRun(state);
    state.time = 72;
    state.lanternsTaken = 2;
    lanterns[0].taken = true;
    lanterns[1].taken = true;
    player.x = tileCenter(18, 10).x;
    player.y = tileCenter(18, 10).y;
    player.facing = -Math.PI / 2;
    const guard = guards[1];
    guard.x = tileCenter(18, 8).x;
    guard.y = tileCenter(18, 8).y;
    guard.facing = Math.PI / 2;
    guard.suspicion = 100;
    guard.mode = 'chase';
    guard.lastSeen = { x: player.x, y: player.y };
    return true;
  }
  if (shot === 'win') {
    startRun(state);
    state.time = 154;
    state.lanternsTaken = 3;
    for (const lantern of lanterns) lantern.taken = true;
    player.x = tileCenter(12, 14).x;
    player.y = tileCenter(12, 14).y;
    escapeArchive(state);
    return true;
  }
  return false;
}

const params = new URLSearchParams(window.location.search);
const frozenShot = applyShotMode(params.get('shot'));

let lastTime = performance.now();
let elapsed = 0;

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  elapsed += dt;

  if (!frozenShot) {
    if (state.mode === 'title' && (input.consumeConfirm() || input.consumeClick())) {
      unlockAudio();
      playClick();
      startRun(state);
      statusLine.textContent = 'Steal the three moon lanterns, then reach the exit.';
    } else if ((state.mode === 'caught' || state.mode === 'win') && (input.consumeRestart() || input.consumeClick())) {
      unlockAudio();
      playClick();
      resetWorld();
      startRun(state);
    } else {
      update(dt);
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(viewScale, 0, 0, viewScale, viewOffsetX, viewOffsetY);
  renderGame(ctx, { grid: level.grid, lanterns, exit, guards, player, state }, elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
