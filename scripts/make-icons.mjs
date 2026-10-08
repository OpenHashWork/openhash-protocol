// Writes src/apple-touch-icon.png (180x180) by box-filtering the opaque brand PNG. No dependencies.
import { readdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng } from './lib/png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'brand');
const files = readdirSync(dir).filter((n) => /\.png/i.test(n));
const opaque = files.find((f) => !/\.\.png$/i.test(f));
const p = readPng(path.join(dir, opaque));

// Crop the centre square that holds the mark with a little air, then downsample to 180.
const N = 180;
const crop = Math.round(p.width * 0.62);
const o = (p.width - crop) >> 1;
const raw = Buffer.alloc((N * 3 + 1) * N);
for (let y = 0; y < N; y++) {
  raw[y * (N * 3 + 1)] = 0;
  for (let x = 0; x < N; x++) {
    const x0 = o + Math.floor((x * crop) / N), x1 = o + Math.floor(((x + 1) * crop) / N);
    const y0 = o + Math.floor((y * crop) / N), y1 = o + Math.floor(((y + 1) * crop) / N);
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * p.width + xx) * 4; r += p.rgba[i]; g += p.rgba[i + 1]; b += p.rgba[i + 2]; n++; }
    const k = y * (N * 3 + 1) + 1 + x * 3;
    raw[k] = Math.round(r / n); raw[k + 1] = Math.round(g / n); raw[k + 2] = Math.round(b / n);
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const v of buf) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(path.join(root, 'src/apple-touch-icon.png'), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('apple-touch-icon.png written from', opaque);
