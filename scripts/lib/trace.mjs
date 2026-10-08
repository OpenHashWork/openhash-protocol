// Traces the logo's alpha mask into a 32x32 SVG path. Deterministic: same pixels in, same SVG out.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readPng } from './png.mjs';

const GRID = 512;      // sampling grid across the mark
const SIZE = 32;       // favicon units
const PAD = 1;         // units of padding inside the 32 box
const EPS = 0.07;      // simplification tolerance in favicon units

function simplify(pts, eps) {
  // Douglas-Peucker on a closed loop: split at the two farthest points.
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  let i0 = 0, i1 = 0, best = -1;
  for (let i = 1; i < pts.length; i++) { const d = d2(pts[0], pts[i]); if (d > best) { best = d; i1 = i; } }
  const run = (a, b) => {
    const out = [];
    const rec = (s, e) => {
      let m = -1, mi = -1;
      const [x1, y1] = pts[s % pts.length], [x2, y2] = pts[e % pts.length];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
      for (let i = s + 1; i < e; i++) {
        const [x, y] = pts[i % pts.length];
        const d = Math.abs(dy * (x - x1) - dx * (y - y1)) / L;
        if (d > m) { m = d; mi = i; }
      }
      if (m > eps) { rec(s, mi); out.push(pts[mi % pts.length]); rec(mi, e); }
    };
    out.push(pts[a % pts.length]);
    rec(a, b);
    return out;
  };
  return [...run(i0, i1), ...run(i1, i0 + pts.length)];
}

export function traceFavicon(brandDir, paletteJson) {
  const file = readdirSync(brandDir).find((n) => /\.\.png$/i.test(n));
  const p = readPng(path.join(brandDir, file));
  const A = (x, y) => p.rgba[(y * p.width + x) * 4 + 3];
  let x0 = p.width, y0 = p.height, x1 = 0, y1 = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (A(x, y) > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const ox = x0 - ((side - (x1 - x0 + 1)) >> 1), oy = y0 - ((side - (y1 - y0 + 1)) >> 1);
  const cell = side / GRID;
  const inside = new Uint8Array(GRID * GRID);
  for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
    let sum = 0, n = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const x = Math.floor(ox + (gx + (sx + 0.5) / 4) * cell), y = Math.floor(oy + (gy + (sy + 0.5) / 4) * cell);
      if (x >= 0 && y >= 0 && x < p.width && y < p.height) sum += A(x, y); n++;
    }
    inside[gy * GRID + gx] = sum / n > 127 ? 1 : 0;
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= GRID || y >= GRID ? 0 : inside[y * GRID + x]);

  // Crack following: directed boundary edges with the filled side on the right.
  const edges = new Map();
  const add = (a, b) => { const k = a[0] + ',' + a[1]; (edges.get(k) || edges.set(k, []).get(k)).push(b); };
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) add([x, y], [x + 1, y]);
    if (!at(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
    if (!at(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
    if (!at(x - 1, y)) add([x, y + 1], [x, y]);
  }
  const loops = [];
  for (const [k, outs] of edges) {
    while (outs.length) {
      const start = k.split(',').map(Number);
      const loop = [start];
      let cur = outs.pop();
      while (cur[0] !== start[0] || cur[1] !== start[1]) {
        loop.push(cur);
        const list = edges.get(cur[0] + ',' + cur[1]);
        cur = list.pop();
      }
      loops.push(loop);
    }
  }
  const scale = (SIZE - 2 * PAD) / GRID;
  const f = (v) => (+(v * scale + PAD).toFixed(2)).toString();
  const paths = loops
    .filter((l) => l.length > 12)
    .map((l) => {
      const s = simplify(l, EPS / scale);
      return 'M' + s.map(([x, y]) => f(x) + ' ' + f(y)).join('L') + 'Z';
    });

  const by = Object.fromEntries(paletteJson.colours.map((c) => [c.name, c.hex]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${by['brand-deep']}"/><stop offset="0.5" stop-color="${by['brand-mid']}"/><stop offset="1" stop-color="${by['brand-glow']}"/></linearGradient></defs><path fill="url(#g)" fill-rule="evenodd" d="${paths.join('')}"/></svg>\n`;
}

export function readPalette(root) {
  return JSON.parse(readFileSync(path.join(root, 'src/styles/palette.json'), 'utf8'));
}
