// render.js — everything the player sees: the archive floor, walls and
// cover, the guards and their vision cones, the thief, the night
// lighting that shows what is safe, the HUD, and the title, caught
// and escaped screens. All art is drawn with canvas paths, no images.

import { TILE, COLS, ROWS, LANTERN_COUNT } from './level.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guard.js';
import { formatTime } from './state.js';

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

const darknessCanvas = document.createElement('canvas');
darknessCanvas.width = WIDTH;
darknessCanvas.height = HEIGHT;

function coneColor(suspicion, mode) {
  if (mode === 'chase') return 'rgba(224, 60, 60, 0.34)';
  if (suspicion > 65) return 'rgba(224, 110, 50, 0.30)';
  if (suspicion > 30) return 'rgba(224, 190, 70, 0.26)';
  return 'rgba(232, 210, 110, 0.20)';
}

function drawFloor(ctx, grid) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = row * TILE;
      const checker = (col + row) % 2 === 0;
      ctx.fillStyle = checker ? '#2b2620' : '#27221c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Worn rugs in the three wings.
  drawRug(ctx, 1, 9, 5, 3, '#5a2e35');
  drawRug(ctx, 9, 1, 5, 3, '#2e4a5a');
  drawRug(ctx, 17, 11, 5, 3, '#4a5a2e');
}

function drawRug(ctx, col, row, w, h, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(col * TILE + 4, row * TILE + 4, w * TILE - 8, h * TILE - 8);
  ctx.strokeStyle = 'rgba(220,190,120,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(col * TILE + 8, row * TILE + 8, w * TILE - 16, h * TILE - 16);
  ctx.globalAlpha = 1;
}

function drawWallsAndCover(ctx, grid) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (tile === '#') {
        ctx.fillStyle = '#4a4552';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6a6478';
        ctx.fillRect(x, y, TILE, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (tile === 'C') {
        ctx.fillStyle = '#6e4f2a';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#4a3319';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (tile === 'B') {
        ctx.fillStyle = '#2c4a26';
        for (const [dx, dy, r] of [[12, 14, 11], [26, 10, 12], [20, 26, 11], [10, 28, 9]]) {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#3d6a33';
        for (const [dx, dy, r] of [[16, 12, 5], [26, 22, 5], [10, 22, 4]]) {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function drawLanterns(ctx, lanterns, time) {
  for (const lantern of lanterns) {
    if (lantern.taken) continue;
    const cx = lantern.x;
    const cy = lantern.y;
    const flicker = 0.85 + Math.sin(time * 5 + lantern.x) * 0.15;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34 * flicker);
    glow.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 34 * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d1508';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd678';
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, exit, open, time) {
  const cx = exit.x;
  const cy = exit.y;
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, open ? 70 : 40);
  glow.addColorStop(0, open ? `rgba(90, 255, 150, ${0.7 * pulse})` : 'rgba(120, 140, 120, 0.35)');
  glow.addColorStop(1, 'rgba(90, 255, 150, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, open ? 70 : 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? '#2fae5f' : '#5a6a5a';
  ctx.fillRect(cx - 16, cy - 18, 32, 36);
  ctx.fillStyle = open ? '#b8ffcf' : '#9aa89a';
  ctx.fillRect(cx - 10, cy - 12, 20, 24);
  if (open) {
    ctx.fillStyle = '#12351f';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', cx, cy - 26);
  }
}

function drawGuard(ctx, guard) {
  const bob = Math.sin(guard.stepPhase) * 1.5;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob * 0.4);
  // Tunic and helmet.
  ctx.fillStyle = guard.color;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(-4, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  // Face direction.
  ctx.fillStyle = '#1c1a22';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 8, Math.sin(guard.facing) * 8, 5, 0, Math.PI * 2);
  ctx.fill();
  // Helmet brim.
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 14, guard.facing - 0.7, guard.facing + 0.7);
  ctx.stroke();
  ctx.restore();

  // Suspicion ticks above the head.
  if (guard.suspicion > 5) {
    const w = 30;
    const x = guard.x - w / 2;
    const y = guard.y - 26;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = guard.suspicion > 65 ? '#e05252' : guard.suspicion > 30 ? '#e0a83c' : '#e8d26e';
    ctx.fillRect(x, y, w * (guard.suspicion / 100), 5);
  }
  if (guard.mode === 'chase') {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 32);
  }
}

function drawVisionCone(ctx, guard) {
  ctx.fillStyle = coneColor(guard.suspicion, guard.mode);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
}

function drawThief(ctx, player, time) {
  const bob = player.moving ? Math.sin(player.stepPhase) * 1.6 : 0;
  // The thief's own lantern light, so the player is always readable
  // against the dark floor.
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 46);
  glow.addColorStop(0, 'rgba(255, 220, 140, 0.30)');
  glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.4);
  // Cloak.
  ctx.fillStyle = player.sneaking ? '#4b5178' : '#5d6390';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 140, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood point in the facing direction.
  ctx.fillStyle = '#333850';
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.facing) * 18, Math.sin(player.facing) * 18);
  ctx.lineTo(Math.cos(player.facing + 2.5) * 10, Math.sin(player.facing + 2.5) * 10);
  ctx.lineTo(Math.cos(player.facing - 2.5) * 10, Math.sin(player.facing - 2.5) * 10);
  ctx.closePath();
  ctx.fill();
  // Face and lantern glow dot.
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 5, Math.sin(player.facing) * 5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Click-to-move marker.
  if (player.moveTarget) {
    ctx.strokeStyle = 'rgba(255, 230, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.moveTarget.x, player.moveTarget.y, 8 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawDarkness(ctx, player, lanterns, exit, guards, open) {
  const dark = darknessCanvas.getContext('2d');
  dark.clearRect(0, 0, WIDTH, HEIGHT);
  dark.fillStyle = 'rgba(5, 7, 18, 0.60)';
  dark.fillRect(0, 0, WIDTH, HEIGHT);
  dark.globalCompositeOperation = 'destination-out';
  punchLight(dark, player.x, player.y, 230);
  for (const lantern of lanterns) {
    if (!lantern.taken) punchLight(dark, lantern.x, lantern.y, 95);
  }
  punchLight(dark, exit.x, exit.y, open ? 120 : 60);
  for (const guard of guards) punchLight(dark, guard.x, guard.y, 55);
  dark.globalCompositeOperation = 'source-over';
  ctx.drawImage(darknessCanvas, 0, 0);
}

function punchLight(dark, x, y, radius) {
  const gradient = dark.createRadialGradient(x, y, 4, x, y, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.75, 'rgba(0,0,0,0.85)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  dark.fillStyle = gradient;
  dark.beginPath();
  dark.arc(x, y, radius, 0, Math.PI * 2);
  dark.fill();
}

function drawHud(ctx, state, maxSuspicion, anyChase) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // Top bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, WIDTH, 34);
  // Lanterns collected.
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#ffd678';
  let lanternText = '';
  for (let i = 0; i < LANTERN_COUNT; i++) lanternText += i < state.lanternsTaken ? '◉ ' : '○ ';
  ctx.fillText(`Lanterns ${lanternText}`, 12, 9);
  // Objective.
  ctx.fillStyle = '#d8d2c0';
  ctx.textAlign = 'center';
  const objective = state.lanternsTaken >= LANTERN_COUNT
    ? 'All lanterns stolen — reach the EXIT!'
    : `Steal ${LANTERN_COUNT - state.lanternsTaken} more lantern${LANTERN_COUNT - state.lanternsTaken === 1 ? '' : 's'}, then escape`;
  ctx.fillText(objective, WIDTH / 2, 9);
  // Timer and alert meter.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d8d2c0';
  ctx.fillText(formatTime(state.time), WIDTH - 12, 9);
  const meterW = 150;
  const meterX = WIDTH - 190;
  const meterY = 40;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(meterX - 2, meterY - 2, meterW + 4, 12);
  ctx.fillStyle = anyChase ? '#e05252' : maxSuspicion > 30 ? '#e0a83c' : '#7fae6a';
  ctx.fillRect(meterX, meterY, meterW * (maxSuspicion / 100), 8);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(anyChase ? 'ALARM!' : 'SEEN', meterX, meterY + 16);
  ctx.restore();
}

function drawCenterPanel(ctx, lines, accent) {
  ctx.fillStyle = 'rgba(4, 6, 14, 0.82)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  let y = HEIGHT / 2 - 110;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = line.font;
    ctx.fillText(line.text, WIDTH / 2, y);
    y += line.gap;
  }
  if (accent) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(WIDTH / 2 - 350, HEIGHT / 2 - 165, 700, 330);
    ctx.lineWidth = 1;
  }
}

export function renderGame(ctx, world, time) {
  const { grid, lanterns, exit, guards, player, state } = world;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawFloor(ctx, grid);
  drawWallsAndCover(ctx, grid);
  drawLanterns(ctx, lanterns, time);
  drawExit(ctx, exit, state.lanternsTaken >= LANTERN_COUNT, time);
  for (const guard of guards) drawGuard(ctx, guard);
  drawThief(ctx, player, time);
  drawDarkness(ctx, player, lanterns, exit, guards, state.lanternsTaken >= LANTERN_COUNT);
  for (const guard of guards) drawVisionCone(ctx, guard);
  const maxSuspicion = Math.max(0, ...guards.map((g) => g.suspicion));
  const anyChase = guards.some((g) => g.mode === 'chase');

  if (state.mode === 'title') {
    drawCenterPanel(ctx, [
      { text: 'LANTERN SHADOW', color: '#ffd678', font: 'bold 46px sans-serif', gap: 58 },
      { text: 'The Midnight Archive', color: '#d8d2c0', font: 'italic 24px sans-serif', gap: 46 },
      { text: 'Steal the 3 moon lanterns and reach the EXIT unseen.', color: '#ffffff', font: '18px sans-serif', gap: 32 },
      { text: 'WASD / arrows to move · Shift to sneak · click to walk there', color: '#c8c2b0', font: '16px sans-serif', gap: 30 },
      { text: 'Guards watch with yellow cones — slip behind crates and bushes.', color: '#c8c2b0', font: '16px sans-serif', gap: 30 },
      { text: 'If a cone fills red, run and break line of sight to cool off.', color: '#c8c2b0', font: '16px sans-serif', gap: 44 },
      { text: 'Click or press Enter to begin', color: '#ffd678', font: 'bold 20px sans-serif', gap: 0 },
    ], '#ffd678');
    return;
  }

  drawHud(ctx, state, maxSuspicion, anyChase);

  if (state.mode === 'caught') {
    drawCenterPanel(ctx, [
      { text: 'CAUGHT!', color: '#ff5a5a', font: 'bold 52px sans-serif', gap: 64 },
      { text: `The ${state.caughtBy} guard caught you with ${state.lanternsTaken} of ${LANTERN_COUNT} lanterns.`, color: '#ffffff', font: '19px sans-serif', gap: 36 },
      { text: 'The archive keeps its secrets — this time.', color: '#c8c2b0', font: '16px sans-serif', gap: 44 },
      { text: 'Press R or click to try again', color: '#ffd678', font: 'bold 20px sans-serif', gap: 0 },
    ], '#ff5a5a');
  } else if (state.mode === 'win') {
    drawCenterPanel(ctx, [
      { text: 'ESCAPED UNSEEN', color: '#7dff9e', font: 'bold 46px sans-serif', gap: 60 },
      { text: `All ${LANTERN_COUNT} moon lanterns stolen in ${formatTime(state.time)}.`, color: '#ffffff', font: '20px sans-serif', gap: 36 },
      { text: 'The night watch never knew you were there.', color: '#c8c2b0', font: '16px sans-serif', gap: 44 },
      { text: 'Press R or click to play again', color: '#ffd678', font: 'bold 20px sans-serif', gap: 0 },
    ], '#7dff9e');
  }
}
