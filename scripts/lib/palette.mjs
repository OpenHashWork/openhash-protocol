// Derives the brand palette from the PNG files in brand/. Every colour is an actual pixel value.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { readPng, hex } from './png.mjs';

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function brandFiles(dir) {
  const files = readdirSync(dir).filter((n) => /\.png/i.test(n));
  const transparent = files.find((f) => /\.\.png$/i.test(f));
  const opaque = files.find((f) => f !== transparent);
  if (!transparent || !opaque) throw new Error('expected one transparent and one opaque PNG in brand/');
  return { transparent, opaque };
}

export function extractPalette(dir) {
  const { transparent, opaque } = brandFiles(dir);
  const t = readPng(path.join(dir, transparent));
  const px = [];
  for (let i = 0; i < t.width * t.height; i++) if (t.rgba[i * 4 + 3] === 255) px.push([t.rgba[i * 4], t.rgba[i * 4 + 1], t.rgba[i * 4 + 2]]);
  px.sort((a, b) => luma(...a) - luma(...b));
  const near = (c) => px.reduce((n, p) => n + (Math.abs(p[0] - c[0]) <= 2 && Math.abs(p[1] - c[1]) <= 2 && Math.abs(p[2] - c[2]) <= 2 ? 1 : 0), 0);
  const stops = [['deep', 0.01], ['dark', 0.2], ['mid', 0.5], ['bright', 0.8], ['glow', 0.99]];
  const colours = stops.map(([name, q]) => {
    const lo = Math.max(0, Math.floor(px.length * (q - 0.005)));
    const hi = Math.min(px.length - 1, Math.floor(px.length * (q + 0.005)));
    const band = px.slice(lo, hi + 1);
    const med = [0, 1, 2].map((c) => band.map((p) => p[c]).sort((a, b) => a - b)[band.length >> 1]);
    return { name: 'brand-' + name, hex: hex(...med), source: `brand/${transparent}`, method: `median of opaque mark pixels in the ${(q * 100).toFixed(0)}th luminance percentile band`, support: near(med) };
  });
  const o = readPng(path.join(dir, opaque));
  const corner = [o.rgba[0], o.rgba[1], o.rgba[2]];
  let same = 0;
  for (let i = 0; i < o.width * o.height; i++) if (o.rgba[i * 4] === corner[0] && o.rgba[i * 4 + 1] === corner[1] && o.rgba[i * 4 + 2] === corner[2]) same++;
  colours.push({ name: 'brand-canvas', hex: hex(...corner), source: `brand/${opaque}`, method: 'corner pixel; the artwork background', support: same });
  return {
    generatedBy: 'scripts/extract-palette.mjs',
    files: { transparent, opaque },
    png: { transparent: { colorType: t.colorType, alphaOpaquePixels: px.length }, opaque: { colorType: o.colorType } },
    colours
  };
}
