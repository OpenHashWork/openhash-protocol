import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceFavicon, readPalette } from './lib/trace.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = traceFavicon(path.join(root, 'brand'), readPalette(root));
writeFileSync(path.join(root, 'src/favicon.svg'), svg);
console.log('favicon.svg', svg.length, 'bytes,', (svg.match(/M/g) || []).length, 'contours,', (svg.match(/L/g) || []).length, 'segments');
