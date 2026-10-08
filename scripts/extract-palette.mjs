// Writes src/styles/palette.json from the brand PNGs, with provenance.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPalette } from './lib/palette.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = extractPalette(path.join(root, 'brand'));
writeFileSync(path.join(root, 'src/styles/palette.json'), JSON.stringify(out, null, 2) + '\n');
for (const c of out.colours) console.log(c.name.padEnd(13), c.hex, String(c.support).padStart(8), 'px near |', c.method);
