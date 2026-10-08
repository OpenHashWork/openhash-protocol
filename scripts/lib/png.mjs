// Minimal PNG reader: 8-bit, non-interlaced, colour types 0, 2, 3, 4, 6. No dependencies.
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

export function readPng(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG: ' + file);
  let pos = 8;
  let ihdr = null;
  const idat = [];
  let plte = null;
  const chunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    chunks.push(type);
    if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = data;
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.bitDepth !== 8 || ihdr.interlace !== 0) throw new Error(`unsupported PNG: depth ${ihdr.bitDepth} interlace ${ihdr.interlace}`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  const stride = ihdr.width * ch;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * ihdr.height);
  for (let y = 0; y < ihdr.height; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  // expand to RGBA
  const rgba = Buffer.alloc(ihdr.width * ihdr.height * 4);
  for (let i = 0, n = ihdr.width * ihdr.height; i < n; i++) {
    let r, g, b, a = 255;
    const o = i * ch;
    if (ihdr.colorType === 6) { r = out[o]; g = out[o + 1]; b = out[o + 2]; a = out[o + 3]; }
    else if (ihdr.colorType === 2) { r = out[o]; g = out[o + 1]; b = out[o + 2]; }
    else if (ihdr.colorType === 0) { r = g = b = out[o]; }
    else if (ihdr.colorType === 4) { r = g = b = out[o]; a = out[o + 1]; }
    else { const p = out[o] * 3; r = plte[p]; g = plte[p + 1]; b = plte[p + 2]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { ...ihdr, chunks, rgba };
}

export const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
