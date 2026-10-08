// Fetches the reference site, extracts its prose, and stores only short hashes of its word pairs and
// content words. Optional --extra=<file> adds more reference prose (for example the client's slide text).
// No reference text is written to this repository.
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bigrams, contentWords, proseStrings, h } from './lib/text.mjs';

const BASE = 'https://openspawn.app/';
const html = await (await fetch(BASE)).text();
const asset = html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)[1];
const js = await (await fetch(BASE + asset)).text();
const extraPath = process.argv.find((a) => a.startsWith('--extra='))?.slice(8);
const extra = extraPath ? await readFile(extraPath, 'utf8') : '';

const metas = [...html.matchAll(/content="([^"]+)"/g)].map((m) => m[1]);
const title = html.match(/<title>([^<]+)</)[1];
const strings = proseStrings(js, { singleQuotes: false });
const text = [title, ...metas, ...strings, extra].join('\n');

const out = { strings: strings.length, extra: !!extra, bigrams: [...bigrams(text)].map(h).sort(), words: [...contentWords(text)].map(h).sort() };
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ref-fingerprint.json');
await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, JSON.stringify(out));
console.log('fingerprint', out.strings, 'strings,', out.bigrams.length, 'bigrams,', out.words.length, 'words', extra ? '(with extra)' : '');
