import { createHash } from 'node:crypto';

export const STOP = new Set(('a an and are as at be but by can do does for from had has have he her his how i if in into is it its just me my no not of on one or our out so than that the their them then there these they this those to up us was we were what when where which while who why will with would you your yours ' +
  'also been being both each few more most other some such only own same too very s t about above after again all any because before below between during further here once over under until against off down am did doing having it\'s that\'s').split(/\s+/));

export const clean = (s) => s.toLowerCase().replace(/[’‘]/g, "'");

// Split prose into segments at punctuation, then into words.
export function segments(text) {
  return clean(text)
    .split(/[.,;:!?()—–"“”\n\r|\/\\\[\]{}<>=]+| - /)
    .map((seg) => seg.match(/[a-z][a-z'-]*/g) || [])
    .filter((w) => w.length);
}

export function bigrams(text, { contentOnly = false } = {}) {
  const out = new Set();
  for (const seg of segments(text)) {
    const words = contentOnly ? seg.filter((w) => !STOP.has(w)) : seg;
    for (let i = 0; i + 1 < words.length; i++) {
      const a = words[i], b = words[i + 1];
      if (STOP.has(a) && STOP.has(b)) continue;
      out.add(a + ' ' + b);
    }
  }
  return out;
}

export function contentWords(text) {
  const out = new Set();
  for (const seg of segments(text)) for (const w of seg) if (!STOP.has(w) && w.length > 3) out.add(w);
  return out;
}

export const h = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

// Pull prose-like string literals out of a JS bundle or source file.
export function proseStrings(js, { singleQuotes = true } = {}) {
  const out = [];
  const re = singleQuotes
    ? /"((?:[^"\\\n]|\\.){4,})"|`((?:[^`\\]|\\.){4,})`|'((?:[^'\\\n]|\\.){4,})'/g
    : /"((?:[^"\\\n]|\\.){4,})"|`((?:[^`\\]|\\.){4,})`/g;
  for (const m of js.matchAll(re)) {
    const s = (m[1] ?? m[2] ?? m[3]).replace(/\\n/g, ' ');
    if (!/\s/.test(s)) continue;
    if (/[{}]|\$\{|=>|\bfunction\b|\breturn\b|===?/.test(s)) continue;
    if (!/[a-z]{3,}/i.test(s)) continue;
    out.push(s);
  }
  return out;
}
