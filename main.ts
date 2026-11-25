// The World in One Image — Tuesday 24 November 2026 (v2, broadsheet edition).
// An original Node program (standard library only) that draws one 1024x1024 PNG:
// a dense newspaper front page summing up the whole of 24 November 2026's world
// news — every story below was reported that Tuesday, in some time zone, and
// nothing earlier or later is shown. Own rasterizer, own 5x7 bitmap font, own
// PNG encoder; no network, no randomness: two runs write identical bytes.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8), 0);
  crcData.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcData));
  return out;
}

function encodePNG(w: number, h: number, rgb: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = new Uint8Array(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---------------------------------------------------------------- canvas
const W = 1024, H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [248, 244, 233];
const INK: RGB = [20, 22, 26];
const RED: RGB = [158, 27, 27];
const NAVY: RGB = [29, 53, 87];
const GOLD: RGB = [201, 162, 39];
const GREY: RGB = [90, 95, 106];
const PANEL: RGB = [239, 232, 216];
const SKY: RGB = [16, 32, 56];
const SEA: RGB = [23, 58, 94];
const FLAME: RGB = [224, 122, 32];
const SMOKE: RGB = [168, 172, 178];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    fillRect(x - ((thick / 2) | 0), y - ((thick / 2) | 0), thick, thick, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function circle(cx: number, cy: number, r: number, c: RGB, fill = false, thick = 2): void {
  if (fill) {
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++)
        if (xx * xx + yy * yy <= r * r) setPx(cx + xx, cy + yy, c);
    return;
  }
  for (let a = 0; a < 720; a++) {
    const t = (a / 720) * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(t)), y = Math.round(cy + r * Math.sin(t));
    fillRect(x - ((thick / 2) | 0), y - ((thick / 2) | 0), thick, thick, c);
  }
}

function fillPoly(pts: number[][], c: RGB): void {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) setPx(x, y, c);
  }
}

function star(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
  const pts: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  fillPoly(pts, c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, each a 5-bit mask (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a], X: [0x11, 0x0a, 0x04, 0x04, 0x04, 0x0a, 0x11],
  Y: [0x11, 0x0a, 0x04, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08], "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0], ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08], '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13], '+': [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1d, 0x04], '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04], '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '·': [0, 0, 0, 0x0c, 0x0c, 0, 0], '★': [0x04, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0x04],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0], '—': [0, 0, 0, 0x1f, 0, 0, 0],
};

function drawChar(ch: string, x: number, y: number, s: number, c: RGB, bold: boolean): void {
  const g = FONT[ch] ?? FONT['?'];
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (g[r] & (1 << (4 - col))) {
        fillRect(x + col * s, y + r * s, s, s, c);
        if (bold) fillRect(x + col * s + Math.max(1, s >> 1), y + r * s, s, s, c);
      }
}

// Draws text; returns its pixel width. All text is uppercased by design.
function text(str: string, x: number, y: number, s: number, c: RGB, bold = false): number {
  const up = str.toUpperCase();
  let cx = x;
  for (const ch of up) { drawChar(ch, cx, y, s, c, bold); cx += 6 * s; }
  return up.length * 6 * s - s;
}

function textWidth(str: string, s: number): number {
  return str.length * 6 * s - s;
}

function textCentered(str: string, cx: number, y: number, s: number, c: RGB, bold = false): void {
  text(str, Math.round(cx - textWidth(str, s) / 2), y, s, c, bold);
}

function textRight(str: string, xRight: number, y: number, s: number, c: RGB, bold = false): void {
  text(str, xRight - textWidth(str, s), y, s, c, bold);
}

// Word-wraps text to maxChars per line; returns the y after the last line.
function wrap(str: string, x: number, y: number, maxChars: number, s: number, c: RGB, bold = false, lh = 17): number {
  const words = str.toUpperCase().split(' ');
  let cur = '', cy = y;
  const flush = () => { if (cur) { text(cur, x, cy, s, c, bold); cy += lh; cur = ''; } };
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) flush();
    cur = cur ? cur + ' ' + w : w;
  }
  flush();
  return cy;
}

function rule(x: number, y: number, w: number, hgt: number, c: RGB): void {
  fillRect(x, y, w, hgt, c);
}

// ---------------------------------------------------------------- scenes
// Lead visual: Shanghai skyline at night under a magnifying glass, red star.
function drawShanghai(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  // distant stars
  for (let i = 0; i < 46; i++) {
    const sx = x + ((i * 67) % w), sy = y + ((i * 37) % 60);
    setPx(sx, sy, [210, 216, 228]);
  }
  const base = y + h - 34;
  // skyline: [width, height] pairs, deterministic
  const towers: number[][] = [
    [30, 90], [22, 130], [34, 74], [18, 108], [26, 150], [20, 84], [30, 118],
    [16, 66], [24, 138], [28, 96], [18, 112], [26, 78], [22, 126], [30, 88],
  ];
  let bx = x + 6;
  let ti = 0;
  for (const [tw, th] of towers) {
    if (bx + tw > x + w - 4) break;
    fillRect(bx, base - th, tw, th, [10, 18, 32]);
    for (let wy = base - th + 6; wy < base - 6; wy += 9)
      for (let wx = bx + 3; wx < bx + tw - 3; wx += 7)
        if ((wx * 7 + wy * 13) % 5 < 2) fillRect(wx, wy, 3, 4, [240, 200, 90]);
    bx += tw + 4; ti++;
  }
  // Oriental Pearl style tower: two spheres on a needle
  const px0 = x + w - 74;
  line(px0, base, px0, base - 168, [190, 198, 214], 3);
  circle(px0, base - 96, 17, [214, 120, 130], true);
  circle(px0, base - 140, 11, [214, 120, 130], true);
  circle(px0, base - 96, 17, GOLD, false, 2);
  // twisted tower: stacked, shrinking slabs
  const tx0 = x + 66;
  for (let i = 0; i < 9; i++) {
    const tw2 = 34 - i * 2, th2 = 17;
    fillRect(tx0 - (tw2 >> 1) + ((i % 3) - 1) * 2, base - 158 + i * th2, tw2, th2 - 2, [13, 24, 44]);
  }
  // water line
  fillRect(x, base, w, 3, [40, 90, 140]);
  for (let i = 0; i < 26; i++) fillRect(x + ((i * 41) % w), base + 8 + ((i * 23) % 18), 14, 2, [40, 90, 140]);
  // magnifying glass over the skyline, red star inside
  const gx = x + 196, gy = y + 108;
  circle(gx, gy, 62, GOLD, false, 6);
  line(gx + 44, gy + 44, gx + 84, gy + 84, GOLD, 9);
  star(gx, gy, 30, 13, RED);
}

// Second lead A: a warship on the sea, struck — explosion star astern.
function drawWarship(x: number, y: number): void {
  fillRect(x, y, 64, 64, SEA);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 4; i++)
      fillRect(x + 4 + i * 16 + (r % 2) * 6, y + 50 + r * 5, 9, 2, [90, 140, 190]);
  fillPoly([[x + 6, y + 38], [x + 56, y + 38], [x + 50, y + 47], [x + 12, y + 47]], INK);
  fillRect(x + 20, y + 30, 22, 8, INK);
  fillRect(x + 26, y + 23, 10, 7, INK);
  line(x + 31, y + 23, x + 31, y + 10, INK, 2);
  fillRect(x + 31, y + 10, 9, 5, RED);
  fillRect(x + 12, y + 33, 8, 4, INK);
  star(x + 55, y + 26, 10, 4, FLAME);
  star(x + 55, y + 26, 5, 2, GOLD);
}

// Second lead B: Riyadh's tallest tower, struck near the top.
function drawTower(x: number, y: number): void {
  fillRect(x, y, 64, 64, SKY);
  fillPoly([[x + 18, y + 62], [x + 24, y + 8], [x + 40, y + 8], [x + 46, y + 62]], [10, 18, 32]);
  for (let wy = y + 14; wy < y + 58; wy += 7)
    for (let wx = x + 26; wx < x + 40; wx += 6)
      if ((wx + wy) % 3 !== 0) fillRect(wx, wy, 3, 3, [240, 200, 90]);
  fillRect(x + 6, y + 60, 52, 3, [40, 90, 140]);
  star(x + 47, y + 12, 11, 5, RED);
  star(x + 47, y + 12, 6, 3, FLAME);
}

// Small panel icons, drawn inside a 36x36 box at (x, y).
function iconRocket(x: number, y: number): void {
  fillPoly([[x + 18, y + 2], [x + 25, y + 12], [x + 25, y + 26], [x + 11, y + 26], [x + 11, y + 12]], NAVY);
  circle(x + 18, y + 15, 4, PAPER, true);
  fillPoly([[x + 11, y + 22], [x + 4, y + 32], [x + 11, y + 30]], RED);
  fillPoly([[x + 25, y + 22], [x + 32, y + 32], [x + 25, y + 30]], RED);
  fillPoly([[x + 14, y + 30], [x + 22, y + 30], [x + 18, y + 36]], FLAME);
}
function iconEurope(x: number, y: number): void {
  circle(x + 18, y + 18, 16, NAVY, true);
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    star(x + 18 + Math.round(11 * Math.cos(t)), y + 18 + Math.round(11 * Math.sin(t)), 3, 1, GOLD);
  }
}
function iconTemple(x: number, y: number): void {
  fillPoly([[x + 18, y + 2], [x + 22, y + 10], [x + 14, y + 10]], GOLD);
  fillPoly([[x + 8, y + 18], [x + 28, y + 18], [x + 24, y + 11], [x + 12, y + 11]], NAVY);
  fillPoly([[x + 5, y + 26], [x + 31, y + 26], [x + 27, y + 19], [x + 9, y + 19]], NAVY);
  fillRect(x + 3, y + 27, 30, 7, NAVY);
  fillRect(x + 15, y + 29, 6, 5, PAPER);
}
function iconPacific(x: number, y: number): void {
  circle(x + 25, y + 10, 6, GOLD, true);
  fillPoly([[x + 4, y + 26], [x + 14, y + 16], [x + 24, y + 26]], [46, 110, 70]);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 3; i++)
      fillRect(x + 3 + i * 12 + (r % 2) * 5, y + 29 + r * 3, 8, 2, SEA);
}
function iconDome(x: number, y: number): void {
  const pts: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI - (i / 12) * Math.PI;
    pts.push([x + 18 + 13 * Math.cos(t), y + 24 - 13 * Math.sin(t)]);
  }
  pts.push([x + 31, y + 26], [x + 5, y + 26]);
  fillPoly(pts, NAVY);
  line(x + 18, y + 10, x + 18, y + 4, GOLD, 2);
  fillRect(x + 4, y + 27, 28, 6, NAVY);
  fillRect(x + 30, y + 12, 3, 21, NAVY);
}
function iconFactory(x: number, y: number): void {
  fillRect(x + 3, y + 20, 22, 13, GREY);
  fillRect(x + 6, y + 8, 5, 12, GREY);
  fillRect(x + 15, y + 5, 5, 15, GREY);
  circle(x + 9, y + 5, 4, SMOKE, true);
  circle(x + 18, y + 2, 5, SMOKE, true);
  fillRect(x + 7, y + 25, 4, 4, GOLD);
  fillRect(x + 14, y + 25, 4, 4, GOLD);
  fillRect(x + 26, y + 26, 7, 7, INK);
}
function iconCoin(x: number, y: number): void {
  circle(x + 18, y + 18, 15, GOLD, true);
  circle(x + 18, y + 18, 15, [150, 118, 20], false, 2);
  text('$', x + 12, y + 8, 3, INK, true);
}
function iconFlag(x: number, y: number): void {
  fillRect(x + 8, y + 4, 3, 30, INK);
  fillPoly([[x + 11, y + 5], [x + 31, y + 9], [x + 11, y + 15]], RED);
  circle(x + 20, y + 10, 3, [46, 110, 70], true);
  fillRect(x + 4, y + 33, 26, 3, GREY);
}
function iconShop(x: number, y: number): void {
  fillRect(x + 6, y + 16, 24, 16, NAVY);
  for (let i = 0; i < 4; i++) fillRect(x + 4 + i * 7, y + 10, 6, 6, i % 2 ? PAPER : RED);
  fillRect(x + 14, y + 22, 8, 10, PAPER);
  fillRect(x + 24, y + 20, 4, 5, GOLD);
}

// ---------------------------------------------------------------- the page
fillRect(0, 0, W, H, PAPER);
const ML = 36, MR = 988, CW = MR - ML; // margins, content width

// top strip
fillRect(0, 0, W, 28, INK);
text('TUESDAY 24 NOVEMBER 2026', ML, 7, 2, PAPER, true);
textRight('LATE EDITION · ALL TIME ZONES', MR, 7, 2, GOLD, true);

// masthead
textCentered('THE WORLD IN ONE IMAGE', 512, 40, 7, INK, true);
rule(ML, 96, CW, 6, INK);
rule(ML, 106, CW, 2, INK);
textCentered('THE DAY IN ONE PICTURE — TUESDAY 24 NOVEMBER 2026', 512, 114, 3, RED, true);

// ---------------------------------------------------------------- lead story
const LY = 148;
text('THE LEAD · CHINA', ML, LY, 2, RED, true);
rule(ML, LY + 20, 210, 3, RED);
text('BEIJING PROBES', ML, LY + 30, 5, INK, true);
text('SHANGHAI PARTY', ML, LY + 70, 5, INK, true);
text('CHIEF CHEN JINING', ML, LY + 110, 5, INK, true);
let by = wrap('POLITBURO MEMBER UNDER ANTI-GRAFT INVESTIGATION — THE FOURTH SINCE 2025',
  ML, LY + 156, 48, 2, NAVY, true, 17);
wrap("XINHUA ANNOUNCED THE PROBE ON TUESDAY. CHEN, 61, HAS RUN SHANGHAI — CHINA'S FINANCIAL CAPITAL — SINCE 2022. THE WATCHDOG GAVE NO DETAILS OF THE ALLEGED VIOLATIONS. THE MOVE EXTENDS THE ANTI-CORRUPTION DRIVE DEEP INTO THE POLITBURO.",
  ML, by + 4, 50, 2, INK, false, 17);
// lead visual, right
const VX = 664, VW = 324;
drawShanghai(VX, LY, VW, 252);
fillRect(VX, LY + 252, VW, 22, INK);
text('SHANGHAI — UNDER THE GLASS', VX + 10, LY + 256, 2, PAPER, true);

// ---------------------------------------------------------------- markets
const MY = 444;
fillRect(ML, MY, CW, 100, INK);
text('MARKETS', ML + 14, MY + 8, 3, GOLD, true);
text('THE HUANG EFFECT', ML + 190, MY + 8, 3, PAPER, true);
// sparkline, rising
const spark: number[][] = [[716, 30], [752, 25], [788, 27], [824, 18], [860, 20], [896, 11], [932, 5]];
for (let i = 0; i + 1 < spark.length; i++)
  line(ML + spark[i][0], MY + spark[i][1], ML + spark[i + 1][0], MY + spark[i + 1][1], GOLD, 3);
circle(ML + 932, MY + 5, 4, GOLD, true);
text("S&P 500 +4.7%", ML + 14, MY + 38, 3, PAPER, true);
text('NASDAQ +6.5%', ML + 330, MY + 38, 3, PAPER, true);
text('NIKKEI 225 +3.9%', ML + 646, MY + 38, 3, PAPER, true);
wrap("NVIDIA'S JENSEN HUANG IS BACK AS CEO AFTER TRUMP INTERVENTION · SANOFI BUYS INSMED FOR $41BN · DELL RAISES FORECAST ON AI DEMAND",
  ML + 14, MY + 68, 77, 2, [214, 218, 226], false, 15);

// ---------------------------------------------------------------- second leads
const SY = 560;
rule(ML, SY - 8, CW, 2, INK);
// left: Libya
drawWarship(ML, SY);
text('WAR · LIBYA', ML + 76, SY, 2, RED, true);
text('UKRAINE TAKES ITS', ML + 76, SY + 20, 3, INK, true);
text('WAR TO LIBYA', ML + 76, SY + 44, 3, INK, true);
wrap('KYIV CONFIRMS STRIKES ON TWO RUSSIAN VESSELS OFF LIBYA. IN ZAPORIZHZHIA, A GLIDE BOMB KILLS 2 AND WOUNDS 40+.',
  ML, SY + 74, 38, 2, INK, false, 14);
// divider
fillRect(510, SY, 2, 136, GREY);
// right: Riyadh
drawTower(ML + 488, SY);
text('MIDDLE EAST · RIYADH', ML + 564, SY, 2, RED, true);
text('PIF TOWER STRUCK', ML + 564, SY + 20, 3, INK, true);
text('FOR A SECOND TIME', ML + 564, SY + 44, 3, INK, true);
wrap("HOOTHI MISSILE HITS RIYADH'S TALLEST TOWER, SEAT OF THE SAUDI WEALTH FUND: 11 INJURED. JETS REPLY AT HODEIDAH.",
  ML + 488, SY + 74, 38, 2, INK, false, 14);

// ---------------------------------------------------------------- brief grid
const GY = 702;
rule(ML, GY - 8, CW, 2, INK);
text('THE WORLD IN BRIEF — NINE MORE STORIES', ML, GY + 2, 2, RED, true);
textRight('ALL REPORTED TUESDAY 24 NOV 2026', MR, GY + 2, 2, GREY);
type Panel = { icon: (x: number, y: number) => void; tag: string; head: string; sub1: string; sub2: string };
const panels: Panel[] = [
  { icon: iconRocket, tag: 'SPACE', head: 'SHENZHOU-24 IN ORBIT', sub1: "PAKISTAN'S ALI — FIRST", sub2: 'FOREIGNER TO TIANGONG' },
  { icon: iconEurope, tag: 'EUROPE', head: 'RUSSIA WARNS ESTONIA', sub1: "BORDER ROW RISKS 'OPEN", sub2: "WAR'; NATO EYES SPACE" },
  { icon: iconTemple, tag: 'MYANMAR', head: 'UK SANCTIONS 5 GENERALS', sub1: 'ICJ GENOCIDE RULING', sub2: 'BACKED BY 14 NATIONS' },
  { icon: iconPacific, tag: 'PACIFIC', head: 'SOLOMONS DROP CHINA PACT', sub1: 'HONIARA SWITCHES TO', sub2: 'AN AUSTRALIAN DEAL' },
  { icon: iconDome, tag: 'GAZA', head: 'HAMAS SECURITY CHIEF KILLED', sub1: 'ABU NAHEL + 6 DIE IN', sub2: 'STRIKES DESPITE TRUCE' },
  { icon: iconFactory, tag: 'AIR', head: 'CITY CHOKES AT AQI 538', sub1: "LAHORE IS THE WORLD'S", sub2: 'MOST POLLUTED BIG CITY' },
  { icon: iconCoin, tag: 'TRADE', head: 'US READIES NEW TARIFFS', sub1: 'CHINA + EU FACE LEVIES', sub2: 'OVER SUBSIDIES' },
  { icon: iconFlag, tag: 'BANGLADESH', head: 'HASINA VOWS TO RETURN', sub1: 'EX-PM, SENTENCED TO', sub2: 'DEATH, SETS DEC 16 DATE' },
  { icon: iconShop, tag: 'COLOMBIA', head: 'HOSTAGES IN CARTAGENA', sub1: 'GUNMEN SEIZE SHOPPERS;', sub2: 'BOMB IN VILLAVICENCIO' },
];
const PW = 301, PH = 90;
for (let i = 0; i < panels.length; i++) {
  const col = i % 3, row = (i / 3) | 0;
  const x = ML + col * (PW + 24), y = GY + 26 + row * (PH + 8);
  fillRect(x, y, PW, PH, PANEL);
  fillRect(x, y, PW, 3, i % 2 ? NAVY : RED);
  const p = panels[i];
  p.icon(x + 8, y + 8);
  text(p.tag, x + 52, y + 9, 2, RED, true);
  wrap(p.head, x + 52, y + 26, 20, 2, INK, true, 15);
  text(p.sub1, x + 10, y + 57, 2, GREY);
  text(p.sub2, x + 10, y + 71, 2, GREY);
}

// ---------------------------------------------------------------- write out
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG(W, H, px));
