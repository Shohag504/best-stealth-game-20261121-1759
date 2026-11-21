// player.js — the lantern thief: walking, sneaking, click-to-move,
// and the noise that gives the thief away.

import { TILE, blocksMovement, tileAt } from './level.js';

export const WALK_SPEED = 132;
export const SNEAK_SPEED = 66;
export const PLAYER_RADIUS = 13;

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    facing: 0,
    moving: false,
    sneaking: false,
    moveTarget: null,
    // Seconds until the next footstep noise ping while walking.
    noiseTimer: 0,
    // Footstep bob for the walk animation.
    stepPhase: 0,
  };
}

// True when the thief stands on a bush tile, half-hidden in leaves.
export function isHiddenInBush(grid, player) {
  const col = Math.floor(player.x / TILE);
  const row = Math.floor(player.y / TILE);
  return tileAt(grid, col, row) === 'B';
}

function collides(grid, x, y) {
  const r = PLAYER_RADIUS - 2;
  for (const [cx, cy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const col = Math.floor((x + cx) / TILE);
    const row = Math.floor((y + cy) / TILE);
    if (blocksMovement(grid, col, row)) return true;
  }
  return false;
}

export function updatePlayer(player, input, grid, dt, onNoise) {
  const keyDir = input.moveDirection();
  player.sneaking = input.sneaking();

  let dir = keyDir;
  if (!dir && player.moveTarget) {
    const dx = player.moveTarget.x - player.x;
    const dy = player.moveTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      player.moveTarget = null;
    } else {
      dir = { x: dx / dist, y: dy / dist };
    }
  }

  player.moving = dir !== null;
  if (dir) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = player.x + dir.x * speed * dt;
    const ny = player.y + dir.y * speed * dt;
    // Move axis by axis so the thief slides along walls.
    if (!collides(grid, nx, player.y)) player.x = nx;
    if (!collides(grid, player.x, ny)) player.y = ny;
    player.facing = Math.atan2(dir.y, dir.x);
    player.stepPhase += dt * (player.sneaking ? 7 : 11);

    // Walking is loud: a noise ping every half second that nearby
    // guards come to investigate. Sneaking is silent.
    if (!player.sneaking) {
      player.noiseTimer -= dt;
      if (player.noiseTimer <= 0) {
        player.noiseTimer = 0.45;
        onNoise({ x: player.x, y: player.y, radius: 115 });
      }
    }
  } else {
    player.noiseTimer = 0;
  }
}

export function setMoveTarget(player, point) {
  player.moveTarget = point;
}
