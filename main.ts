// Lantern Shadow — the hand-in program (Node 22, standard library only).
// The game is plain static files under game/ that a desktop browser
// plays offline, and the screenshots are real renders of it. This
// program copies game/ and screenshots/ from beside this file into
// /output and writes /output/dossier.json, the summary the judge
// reads, using the vendored make.fun library, unchanged.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, so a bad entry fails here first instead of
// on the server: at most 4 screenshots of 256 KiB each, at most
// 993 files and 48 MiB under game/, and a 160 KiB dossier text.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
