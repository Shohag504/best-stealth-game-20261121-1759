// state.js — the game's flow: title, playing, caught, escaped.
// Holds the timer, the stolen lanterns and the restart.

import { LANTERN_COUNT } from './level.js';

export function createGameState() {
  return {
    mode: 'title', // title | playing | caught | win
    time: 0,
    lanternsTaken: 0,
    caughtBy: null,
    bestTime: null,
  };
}

export function startRun(state) {
  state.mode = 'playing';
  state.time = 0;
  state.lanternsTaken = 0;
  state.caughtBy = null;
}

export function catchThief(state, guardName) {
  if (state.mode !== 'playing') return;
  state.mode = 'caught';
  state.caughtBy = guardName;
}

export function escapeArchive(state) {
  if (state.mode !== 'playing') return;
  state.mode = 'win';
  if (state.bestTime === null || state.time < state.bestTime) state.bestTime = state.time;
}

export function allLanternsTaken(state) {
  return state.lanternsTaken >= LANTERN_COUNT;
}

export function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
