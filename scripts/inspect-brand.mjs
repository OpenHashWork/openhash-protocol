// Prints IHDR, alpha histogram and dominant colours of every PNG in brand/.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, hex } from './lib/png.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'brand');
const CT = { 0: 'greyscale', 2: 'truecolour RGB', 3: 'indexed', 4: 'greyscale+alpha', 6: 'truecolour+alpha RGBA' };

for (const f of readdirSync(dir).filter((n) => /\.png/i.test(n))) {
  const p = readPng(path.join(dir, f));
  const n = p.width * p.height;
  const alpha = new Map();
  const q = new Map();
  for (let i = 0; i < n; i++) {
    const a = p.rgba[i * 4 + 3];
    const bucket = a === 255 ? '255' : a === 0 ? '0' : a < 128 ? '1-127' : '128-254';
    alpha.set(bucket, (alpha.get(bucket) || 0) + 1);
    const key = [0, 1, 2].map((c) => p.rgba[i * 4 + c] >> 3).join(',');
    q.set(key, (q.get(key) || 0) + 1);
  }
  console.log(`\n${f}\n  ${p.width}x${p.height}  bit depth ${p.bitDepth}  IHDR colour type ${p.colorType} (${CT[p.colorType]})  chunks: ${[...new Set(p.chunks)].join(' ')}`);
  console.log('  alpha histogram: ' + [...alpha].map(([k, v]) => `${k}: ${v} (${((v / n) * 100).toFixed(2)}%)`).join(', '));
  const top = [...q].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => {
    const [r, g, b] = k.split(',').map((x) => (Number(x) << 3) + 4);
    return `${hex(r, g, b)} ${((v / n) * 100).toFixed(1)}%`;
  });
  console.log('  dominant (5-bit buckets): ' + top.join(' | '));
  console.log('  corner pixels: ' + [[0, 0], [p.width - 1, 0], [0, p.height - 1], [p.width - 1, p.height - 1]].map(([x, y]) => { const i = (y * p.width + x) * 4; return hex(p.rgba[i], p.rgba[i + 1], p.rgba[i + 2]) + '/a' + p.rgba[i + 3]; }).join(' '));
}
