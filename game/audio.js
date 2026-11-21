// audio.js — every sound is synthesized with WebAudio, so the game
// ships no audio files: soft footsteps, a lantern chime, the alarm
// sting, the caught thud and the escape arpeggio.

let audioContext = null;
let muted = false;

function context() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

// Call from the first click or keypress: browsers only let sound
// start after the player has interacted with the page.
export function unlockAudio() {
  context();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function blip(frequency, duration, type, volume, when = 0) {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playFootstep(sneaking) {
  blip(sneaking ? 140 : 95, 0.07, 'sine', sneaking ? 0.03 : 0.06);
}

export function playPickup() {
  blip(660, 0.12, 'sine', 0.12);
  blip(990, 0.18, 'sine', 0.1, 0.09);
}

export function playAlarm() {
  blip(220, 0.16, 'square', 0.07);
  blip(330, 0.16, 'square', 0.07, 0.16);
  blip(220, 0.22, 'square', 0.07, 0.32);
}

export function playCaught() {
  blip(180, 0.3, 'sawtooth', 0.1);
  blip(90, 0.5, 'sawtooth', 0.1, 0.12);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => blip(note, 0.25, 'sine', 0.1, i * 0.12));
}

export function playClick() {
  blip(440, 0.06, 'sine', 0.06);
}
