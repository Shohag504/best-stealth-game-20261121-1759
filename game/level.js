// level.js — the Midnight Archive: one hand-built floor plan.
// Tiles: '#' wall, '.' floor, 'C' crate (blocks sight and movement),
// 'B' bush (blocks sight only — you can crouch inside it), 'L' a moon
// lantern to steal, 'E' the exit door, 'P' where the thief starts.
// The map is built by code, not pasted, so every wall run is named.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;

export const LANTERN_COUNT = 3;

function blankGrid() {
  const grid = [];
  for (let y = 0; y < ROWS; y++) grid.push(new Array(COLS).fill('.'));
  return grid;
}

function wallRun(grid, x0, y0, x1, y1) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) grid[y][x] = '#';
  }
}

function put(grid, x, y, tile) {
  grid[y][x] = tile;
}

export function buildArchiveLevel() {
  const grid = blankGrid();

  // Outer walls, with the exit gap at the bottom centre.
  wallRun(grid, 0, 0, COLS - 1, 0);
  wallRun(grid, 0, ROWS - 1, 11, ROWS - 1);
  wallRun(grid, 13, ROWS - 1, COLS - 1, ROWS - 1);
  wallRun(grid, 0, 0, 0, ROWS - 1);
  wallRun(grid, COLS - 1, 0, COLS - 1, ROWS - 1);
  put(grid, 12, ROWS - 1, 'E');

  // Two long gallery walls divide the archive into three wings,
  // each with two door gaps so there is always another route.
  wallRun(grid, 7, 1, 7, 4);
  wallRun(grid, 7, 6, 7, 10);
  wallRun(grid, 7, 12, 7, 14);
  wallRun(grid, 15, 1, 15, 4);
  wallRun(grid, 15, 6, 15, 10);
  wallRun(grid, 15, 12, 15, 14);

  // A display case wall across the top-left wing and one across
  // the bottom-right wing break up the long sight lines.
  wallRun(grid, 1, 3, 2, 3);
  wallRun(grid, 4, 3, 6, 3);
  wallRun(grid, 16, 8, 18, 8);
  wallRun(grid, 20, 8, 22, 8);

  // Crates: solid cover you can slip behind.
  const crates = [
    [4, 2], [10, 4], [12, 6], [18, 2], [20, 10],
    [9, 12], [13, 9], [3, 13], [21, 12], [17, 13],
  ];
  for (const [x, y] of crates) put(grid, x, y, 'C');

  // Bushes: leafy cover that hides you but lets you walk through.
  const bushes = [
    [5, 4], [11, 2], [19, 4], [9, 6], [21, 9],
    [4, 10], [13, 13], [17, 6], [2, 6], [20, 13],
  ];
  for (const [x, y] of bushes) put(grid, x, y, 'B');

  // The three moon lanterns, one per wing.
  const lanterns = [
    { x: 21, y: 1 },
    { x: 21, y: 14 },
    { x: 2, y: 13 },
  ];
  for (const lantern of lanterns) put(grid, lantern.x, lantern.y, 'L');

  put(grid, 2, 1, 'P');

  return { grid, lanterns, exit: { x: 12, y: ROWS - 1 } };
}

// Four patrol loops, one per wing, so every route is watched.
export function buildGuardRoutes() {
  return [
    {
      name: 'red',
      color: '#e05252',
      waypoints: [
        { x: 9, y: 2 }, { x: 13, y: 2 }, { x: 13, y: 5 }, { x: 9, y: 5 },
      ],
    },
    {
      name: 'blue',
      color: '#4f7de0',
      waypoints: [
        { x: 17, y: 3 }, { x: 21, y: 3 }, { x: 21, y: 7 }, { x: 17, y: 7 },
      ],
    },
    {
      name: 'green',
      color: '#4fbf6a',
      waypoints: [
        { x: 9, y: 10 }, { x: 13, y: 10 }, { x: 12, y: 13 }, { x: 10, y: 13 },
      ],
    },
    {
      name: 'violet',
      color: '#9a6ee0',
      waypoints: [
        { x: 2, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 12 }, { x: 2, y: 12 },
      ],
    },
  ];
}

export function tileAt(grid, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return grid[row][col];
}

export function blocksMovement(grid, col, row) {
  const tile = tileAt(grid, col, row);
  return tile === '#' || tile === 'C';
}

export function blocksSight(grid, col, row) {
  const tile = tileAt(grid, col, row);
  return tile === '#' || tile === 'C' || tile === 'B';
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

// True when no sight-blocking tile lies between two points.
export function hasLineOfSight(grid, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = Math.floor((from.x + dx * t) / TILE);
    const row = Math.floor((from.y + dy * t) / TILE);
    if (blocksSight(grid, col, row)) return false;
  }
  return true;
}
