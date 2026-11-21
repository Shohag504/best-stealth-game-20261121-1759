// input.js — keyboard (WASD / arrows, Shift to sneak) and mouse
// (click to walk there, click buttons on the title and end screens).

export function createInput(canvas, toWorld) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    Enter: 'confirm', Space: 'confirm',
    KeyR: 'restart',
  };

  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (action) {
      keys.add(action);
      if (action === 'confirm' || action === 'up' || action === 'down') event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) keys.delete(action);
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  });

  return {
    // A unit movement vector from the held keys, or null.
    moveDirection() {
      let dx = 0;
      let dy = 0;
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dy -= 1;
      if (keys.has('down')) dy += 1;
      if (dx === 0 && dy === 0) return null;
      const length = Math.hypot(dx, dy);
      return { x: dx / length, y: dy / length };
    },
    sneaking() {
      return keys.has('sneak');
    },
    // True once when Enter/Space is pressed; consumed by the caller.
    consumeConfirm() {
      if (!keys.has('confirm')) return false;
      keys.delete('confirm');
      return true;
    },
    consumeRestart() {
      if (!keys.has('restart')) return false;
      keys.delete('restart');
      return true;
    },
    // True once when the player clicks; returns the click in world pixels.
    consumeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return toWorld(mouse.clickX, mouse.clickY);
    },
    mouseScreen() {
      return { x: mouse.x, y: mouse.y };
    },
  };
}
