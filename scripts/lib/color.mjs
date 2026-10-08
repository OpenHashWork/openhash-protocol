// Resolves the token file's colours (hex, var(), color-mix in oklab) so the gates can check contrast and provenance.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function hexToRgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
export function rgbToHex(rgb) { return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join(''); }

function toOk([r, g, b]) {
  const [R, G, B] = [r, g, b].map(lin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOk([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(enc);
}

// colour = { rgb:[0..1 x3], a }
export function mix(c1, p1, c2, p2) {
  const total = p1 + p2;
  const w1 = p1 / total, w2 = p2 / total;
  const a = c1.a * w1 + c2.a * w2;
  const o1 = toOk(c1.rgb), o2 = toOk(c2.rgb);
  // premultiplied interpolation, as CSS does
  const pm = [0, 1, 2].map((i) => (o1[i] * c1.a * w1 + o2[i] * c2.a * w2) / (a || 1));
  return { rgb: fromOk(pm), a };
}

export function parseTokens(css) {
  const blocks = css.split(/:root\[data-theme="dark"\]/);
  const grab = (txt) => Object.fromEntries([...txt.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const light = grab(blocks[0]);
  const dark = { ...light, ...grab(blocks[1] || '') };
  return { light, dark };
}

export function resolve(expr, vars, depth = 0) {
  expr = expr.trim();
  if (depth > 20) throw new Error('token loop ' + expr);
  let m;
  if ((m = expr.match(/^#([0-9a-f]{6})$/i))) return { rgb: hexToRgb(expr), a: 1 };
  if (expr === 'transparent') return { rgb: [0, 0, 0], a: 0 };
  if ((m = expr.match(/^var\(--([\w-]+)\)$/))) return resolve(vars[m[1]], vars, depth + 1);
  if ((m = expr.match(/^color-mix\(in oklab,\s*(.+)\)$/))) {
    const parts = splitTop(m[1]);
    const parse = (s) => {
      const mm = s.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/);
      return [resolve(mm[1], vars, depth + 1), mm[2] === undefined ? null : Number(mm[2])];
    };
    let [c1, p1] = parse(parts[0]);
    let [c2, p2] = parse(parts[1]);
    if (p1 === null && p2 === null) { p1 = 50; p2 = 50; } else if (p1 === null) p1 = 100 - p2; else if (p2 === null) p2 = 100 - p1;
    return mix(c1, p1, c2, p2);
  }
  throw new Error('cannot resolve ' + expr);
}

function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out;
}

const L = (rgb) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function contrast(fg, bg) {
  // composite fg over bg if translucent
  const f = fg.a < 1 ? fg.rgb.map((v, i) => v * fg.a + bg.rgb[i] * (1 - fg.a)) : fg.rgb;
  const a = L(f), b = L(bg.rgb);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
