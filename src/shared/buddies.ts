/**
 * Pixel buddies — 4 hand-drawn 16×16 sprites, each with an open-eye frame
 * and a blink frame. Rendered to <canvas> with image smoothing off so they
 * stay crisp at any size. No image assets needed.
 *
 * Legend: `.` transparent · `K` outline · `W` white · `P` blush ·
 * `B` body · `L` body-light · `D` body-dark · (bot only) `C` cyan eye,
 * `Y` antenna light.
 */

export interface Buddy {
  id: string;
  name: string;
  blurb: string;
  palette: Record<string, string>;
  frames: [string[], string[]]; // [open, blink]
}

const INK = "#33334d";
const BLUSH = "#ff9db0";

const BLOB: Buddy = {
  id: "blob",
  name: "Mochi",
  blurb: "A mint blob. Calm, round, quietly judges your inbox.",
  palette: { K: INK, W: "#ffffff", P: BLUSH, B: "#6fdcbd", L: "#cdf6e5", D: "#3fa98a" },
  frames: [
    [
      "................",
      ".....KKKKKK.....",
      "...KKBBBBBBKK...",
      "..KBBBBBBBBBBK..",
      "..KLLBBBBBBBBK..",
      ".KBBLLBBBBBBBBK.",
      ".KBBBLLBBBBBBBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBBKKBBBBKKBBK.",
      ".KBBKKBBBBKKBBK.",
      ".KBBBPBBBBPBBBK.",
      ".KBBBBBKKBBBBBK.",
      ".KBBBBBKKBBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KDDDDDDDDDDK..",
      "...KKKKKKKKKK...",
    ],
    [
      "................",
      ".....KKKKKK.....",
      "...KKBBBBBBKK...",
      "..KBBBBBBBBBBK..",
      "..KLLBBBBBBBBK..",
      ".KBBLLBBBBBBBBK.",
      ".KBBBLLBBBBBBBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBBBPBBBBPBBBK.",
      ".KBBBBBKKBBBBBK.",
      ".KBBBBBKKBBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KDDDDDDDDDDK..",
      "...KKKKKKKKKK...",
    ],
  ],
};

const CAT: Buddy = {
  id: "cat",
  name: "Pixel",
  blurb: "An orange tabby. Naps lots, never misses a ping.",
  palette: { K: INK, W: "#ffffff", P: BLUSH, B: "#f5a866", L: "#ffdcae", D: "#d17f3a" },
  frames: [
    [
      "..KK........KK..",
      ".KBBK......KBBK.",
      ".KBPBK....KBPBK.",
      ".KBBBBK..KBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KBBKBBBBKBBK..",
      "..KBBBBBBBBBBK..",
      "..KBKKBBBBKKBK..",
      "..KBKKBBBBKKBK..",
      "..KBBBPBBBPBBK..",
      "..KBBBBPPBBBBK..",
      "...KBBBKKBBBK...",
      "...KBBBBBBBBK...",
      "....KBBBBBBK....",
      "....KDDDDDDK....",
      ".....KKKKKK.....",
    ],
    [
      "..KK........KK..",
      ".KBBK......KBBK.",
      ".KBPBK....KBPBK.",
      ".KBBBBK..KBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KBBKBBBBKBBK..",
      "..KBBBBBBBBBBK..",
      "..KBBBBBBBBBBK..",
      "..KBBBBBBBBBBK..",
      "..KBBBPBBBPBBK..",
      "..KBBBBPPBBBBK..",
      "...KBBBKKBBBK...",
      "...KBBBBBBBBK...",
      "....KBBBBBBK....",
      "....KDDDDDDK....",
      ".....KKKKKK.....",
    ],
  ],
};

const FROG: Buddy = {
  id: "frog",
  name: "Puddles",
  blurb: "A pond frog. Big eyes, bigger dedication to your focus.",
  palette: { K: INK, W: "#ffffff", P: "#ff9db0", B: "#7ed957", L: "#cdf5b5", D: "#4da63a" },
  frames: [
    [
      "...KKK....KKK...",
      "..KWWWK..KWWWK..",
      "..KWKWK..KWKWK..",
      "..KWWWK..KWWWK..",
      "...KKKKKKKKKK...",
      "..KBBBBBBBBBBK..",
      ".KBBBBBBBBBBBBK.",
      ".KBKBBBBBBBBKBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBPBBBBBBBPBBK.",
      ".KBBBKBBBBBKBBK.",
      ".KBBBKKKKKKBBBK.",
      ".KBBBBBBBBBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KDDDDDDDDDDK..",
      "...KKKKKKKKKK...",
    ],
    [
      "...KKK....KKK...",
      "..KBBBK..KBBBK..",
      "..KBBBK..KBBBK..",
      "..KBBBK..KBBBK..",
      "...KKKKKKKKKK...",
      "..KBBBBBBBBBBK..",
      ".KBBBBBBBBBBBBK.",
      ".KBKBBBBBBBBKBK.",
      ".KBBBBBBBBBBBBK.",
      ".KBPBBBBBBBPBBK.",
      ".KBBBKBBBBBKBBK.",
      ".KBBBKKKKKKBBBK.",
      ".KBBBBBBBBBBBBK.",
      "..KBBBBBBBBBBK..",
      "..KDDDDDDDDDDK..",
      "...KKKKKKKKKK...",
    ],
  ],
};

const BOT: Buddy = {
  id: "bot",
  name: "Bolt",
  blurb: "A tiny robot. Scans your toasts so you don't have to.",
  palette: {
    K: INK, W: "#ffffff", P: BLUSH,
    B: "#7aa7ff", L: "#cbdcff", D: "#2f3a5c",
    C: "#7df9ff", Y: "#ffd93d",
  },
  frames: [
    [
      ".......YY.......",
      ".......KK.......",
      "....KKKKKKKK....",
      "...KBBBBBBBBK...",
      "..KBBBBBBBBBBK..",
      "..KBBLLBBBBBK...",
      "..KBDDDDDDDDBK..",
      "..KBDCCBDCCDBK..",
      "..KBDCCBDCCDBK..",
      "..KBDDDDDDDDBK..",
      "..KBBBBBBBBBBK..",
      "...KBBKKKKBBK...",
      "...KBBBBBBBBK...",
      "....KBBBBBBK....",
      "....KDDDDDDK....",
      ".....KKKKKK.....",
    ],
    [
      ".......YY.......",
      ".......KK.......",
      "....KKKKKKKK....",
      "...KBBBBBBBBK...",
      "..KBBBBBBBBBBK..",
      "..KBBLLBBBBBK...",
      "..KBDDDDDDDDBK..",
      "..KBDDDDDDDDBK..",
      "..KBDDDDDDDDBK..",
      "..KBDDDDDDDDBK..",
      "..KBBBBBBBBBBK..",
      "...KBBKKKKBBK...",
      "...KBBBBBBBBK...",
      "....KBBBBBBK....",
      "....KDDDDDDK....",
      ".....KKKKKK.....",
    ],
  ],
};

export const BUDDIES: Buddy[] = [BLOB, CAT, FROG, BOT];

export function getBuddy(id: string): Buddy {
  return BUDDIES.find((b) => b.id === id) ?? BLOB;
}

/** Draw a buddy frame onto a canvas at any pixel size. */
export function drawBuddy(
  canvas: HTMLCanvasElement,
  buddyId: string,
  frame: 0 | 1,
  sizePx: number,
): void {
  const buddy = getBuddy(buddyId);
  const rows = buddy.frames[frame];
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width = sizePx * dpr;
  canvas.height = sizePx * dpr;
  canvas.style.width = `${sizePx}px`;
  canvas.style.height = `${sizePx}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, sizePx, sizePx);
  const cell = sizePx / 16;
  for (let y = 0; y < 16; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < 16; x++) {
      const ch = row[x] ?? ".";
      if (ch === ".") continue;
      const color = buddy.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(x * cell),
        Math.floor(y * cell),
        Math.ceil(cell),
        Math.ceil(cell),
      );
    }
  }
}

/** Dev-time sanity check: every row must be exactly 16 chars. */
export function validateBuddies(): string[] {
  const problems: string[] = [];
  for (const b of BUDDIES) {
    b.frames.forEach((frame, fi) => {
      if (frame.length !== 16) problems.push(`${b.id} frame ${fi}: ${frame.length} rows`);
      frame.forEach((row, ri) => {
        if (row.length !== 16) problems.push(`${b.id} f${fi} r${ri}: len ${row.length}`);
        for (const ch of row) {
          if (ch !== "." && !b.palette[ch]) problems.push(`${b.id} f${fi} r${ri}: unknown glyph '${ch}'`);
        }
      });
    });
  }
  return problems;
}
