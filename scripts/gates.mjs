import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { force, forceAll, randomBase58 } from './fixture.mjs';
import { bigrams, contentWords, proseStrings, h } from './lib/text.mjs';
import { readPng } from './lib/png.mjs';
import { extractPalette } from './lib/palette.mjs';
import { traceFavicon } from './lib/trace.mjs';
import { pathPolys, evenOdd } from './lib/iou.mjs';
import { parseTokens, resolve, contrast, rgbToHex } from './lib/color.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

const { register, STATES, handleOf, hrefOf, isStated, tally } = await imp('src/js/register.js');
const { classify, isAddressShaped } = await imp('src/js/gate.js');
const { renderPage } = await imp('src/js/page.js');
const { caSlot } = await imp('src/js/views.js');

let failed = 0;
const rows = [];
const check = (group, name, ok, detail = '') => { rows.push({ group, name, ok, detail }); if (!ok) failed++; };
const section = (t) => rows.push({ section: t });
const note = (t) => rows.push({ info: t });

async function walk(dir, skip = new Set(['node_modules', '.refcache', '.git'])) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, skip)));
    else out.push(p);
  }
  return out;
}
const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.md', '.txt', '']);
const isText = (f) => TEXT_EXT.has(path.extname(f)) || path.basename(f) === '_headers';
const rel = (f) => path.relative(root, f).replaceAll('\\', '/');
const read = (f) => readFile(f, 'utf8');

const projectFiles = (await walk(root)).filter(isText);
const srcFiles = projectFiles.filter((f) => rel(f).startsWith('src/'));
const distFiles = projectFiles.filter((f) => rel(f).startsWith('dist/'));
let distHtml = '';
try { distHtml = await read(path.join(dist, 'index.html')); } catch { /* reported below */ }

/* ---------- build output ---------- */
section('Build output');
check('build', 'dist/index.html exists', !!distHtml);
for (const f of ['favicon.svg', 'apple-touch-icon.png', 'assets/tokens.css', 'assets/styles.css', 'js/main.js', '_headers']) {
  let ok = true;
  try { await stat(path.join(dist, f)); } catch { ok = false; }
  check('build', `dist/${f} exists`, ok);
}
{
  const refs = [...distHtml.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map((m) => m[1]);
  const missing = [];
  for (const r of refs) { try { await stat(path.join(dist, r)); } catch { missing.push(r); } }
  check('build', 'every relative reference in dist/index.html resolves', refs.length > 0 && !missing.length, missing.join(', '));
  check('build', 'no inline scripts or style attributes', !/<script(?![^>]*\bsrc=)/.test(distHtml) && !/\sstyle="/.test(distHtml));
}

/* ---------- rule 5 ---------- */
section('Rule 5: repo hygiene');
{
  const all = await walk(root, new Set(['node_modules', '.git']));
  check('hygiene', 'no CLAUDE.md anywhere', !all.some((f) => /claude\.md$/i.test(f)));
  check('hygiene', 'no .claude directory or file', !all.some((f) => rel(f).split('/').includes('.claude')));
  const banned = new RegExp(['co-authored-by', 'generated (?:with|by)', 'cla' + 'ude', 'anthro' + 'pic', 'chat' + 'gpt', 'open' + 'ai\\b', 'copi' + 'lot', 'ai[- ]generated'].join('|'), 'i');
  const hits = [];
  for (const f of projectFiles.filter((p) => !rel(p).startsWith('scripts/ref-fingerprint') && rel(p) !== 'scripts/gates.mjs')) if (banned.test(await read(f))) hits.push(rel(f));
  check('hygiene', 'no AI attribution strings in any project text file', !hits.length, hits.join(', '));
  check('hygiene', 'no reference brand strings in src or dist', !(await Promise.all([...srcFiles, ...distFiles].map(read))).some((t) => /open\s?spawn|\$spawn|spawner|wizzy/i.test(t)));
}

/* ---------- brand assets and palette ---------- */
section('Rule 4: palette extracted from brand/ only');
const tokensCss = await read(path.join(root, 'src/styles/tokens.css'));
const paletteStored = JSON.parse(await read(path.join(root, 'src/styles/palette.json')));
{
  const fresh = extractPalette(path.join(root, 'brand'));
  check('brand', `brand PNGs are RGBA (IHDR colour type 6): transparent ${fresh.png.transparent.colorType}, opaque ${fresh.png.opaque.colorType}`, fresh.png.transparent.colorType === 6 && fresh.png.opaque.colorType === 6);
  const tp = readPng(path.join(root, 'brand', fresh.files.transparent));
  let a0 = 0, a255 = 0, aMid = 0;
  for (let i = 3; i < tp.rgba.length; i += 4) { const a = tp.rgba[i]; if (a === 0) a0++; else if (a === 255) a255++; else aMid++; }
  check('brand', `transparent PNG has real alpha (0: ${a0}, 255: ${a255}, edges: ${aMid})`, a0 > 1e6 && a255 > 1e5 && aMid > 0);
  check('palette', 'palette.json equals a fresh extraction from the brand pixels', JSON.stringify(fresh) === JSON.stringify(paletteStored));
  const pal = new Set(paletteStored.colours.map((c) => c.hex));
  check('palette', 'every palette colour is backed by real pixels', paletteStored.colours.every((c) => c.support > 1000), paletteStored.colours.map((c) => `${c.name} ${c.hex} ${c.support}px`).join(' | '));
  const tokenHex = [...tokensCss.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
  check('palette', 'tokens.css hex literals are exactly the palette, nothing invented', tokenHex.length === pal.size && tokenHex.every((x) => pal.has(x)), tokenHex.join(','));
  const vars = parseTokens(tokensCss);
  const bad = [];
  for (const theme of ['light', 'dark']) for (const [k, v] of Object.entries(vars[theme])) {
    if (k.startsWith('shadow-') || k === 'color-scheme') continue;
    try { resolve(v, vars[theme]); } catch (e) { bad.push(`${theme}:${k}`); }
  }
  check('palette', 'every colour token resolves to hex, var() or color-mix of palette colours', !bad.length, bad.join(', '));
  const hexRe = /#[0-9a-fA-F]{3,8}\b/;
  const fnRe = /\b(?:oklch|oklab|rgba?|hsla?|hwb|lab|lch|color)\(/;
  const named = /(?:^|[\s:,(])(white|black|gray|grey|silver|red|green|blue|yellow|orange|purple|pink|brown|cyan|magenta|teal|navy|maroon|olive|lime|aqua|fuchsia|gold|violet|indigo)\s*(?=[;,)}])/i;
  const offenders = [];
  for (const f of srcFiles.filter((p) => !/palette\.json$|tokens\.css$|\.svg$/.test(p))) {
    const t = await read(f);
    const body = f.endsWith('.css') ? t.replace(/\/\*[\s\S]*?\*\//g, '') : t;
    if (hexRe.test(f.endsWith('.css') ? body : body.replace(/#[a-z][\w-]*/g, '')) || fnRe.test(body) || (f.endsWith('.css') && named.test(body))) offenders.push(rel(f));
  }
  check('palette', 'no colour literal outside tokens.css (src css and js)', !offenders.length, offenders.join(', '));
  const distCss = await read(path.join(dist, 'assets/styles.css'));
  const distTokens = await read(path.join(dist, 'assets/tokens.css'));
  const distHex = [...(distCss + distTokens + distHtml).matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0].toLowerCase()).filter((x) => !/^#[0-9a-f]{6}$/.test(x) || true);
  const anchors = new Set(distHtml.match(/href="#[^"]+"/g)?.map((a) => a.slice(6, -1)));
  const stray = [...new Set(distHex)].filter((x) => !pal.has(x) && !anchors.has(x.slice(1)));
  check('palette', 'every hex in dist is a palette colour', !stray.length, stray.join(','));
  check('palette', 'dist stylesheet carries no colour literal', !hexRe.test(distCss) && !fnRe.test(distCss));
  const themeMeta = [...distHtml.matchAll(/name="theme-color" content="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase());
  check('palette', 'theme-color metas are palette colours', themeMeta.length === 2 && themeMeta.every((x) => pal.has(x)), themeMeta.join(','));

  section('State palette and contrast, with provenance');
  const asHex = (theme, k) => rgbToHex(resolve(vars[theme][k], vars[theme]).rgb);
  const prov = (hx) => { const c = paletteStored.colours.find((p) => p.hex === hx); return c ? `${c.name} (${c.support} px in ${c.source.split('/').pop()})` : 'mixed from palette colours'; };
  for (const [state, tok] of [['stated', 'c-state-stated'], ['absent', 'c-state-absent'], ['unconfirmed', 'c-state-unconfirmed']]) {
    note(`state ${state.padEnd(11)} light ${asHex('light', tok)} = ${prov(asHex('light', tok))}; dark ${asHex('dark', tok)} = ${prov(asHex('dark', tok))}`);
  }
  const pairs = [['c-ink', 'c-ground', 7], ['c-ink-soft', 'c-ground', 4.5], ['c-muted', 'c-ground', 4.5], ['c-muted-2', 'c-ground', 4.5], ['c-on-accent', 'c-accent', 4.5], ['c-footer-muted', 'c-footer-bg', 4.5], ['c-ink', 'c-panel', 7], ['c-muted', 'c-ground-alt', 4.5], ['c-state-stated', 'c-ground', 3], ['c-state-absent', 'c-ground', 3], ['c-state-unconfirmed', 'c-ground', 3], ['c-accent-text', 'c-ground', 4.5]];
  for (const theme of ['light', 'dark']) {
    const v = vars[theme];
    const lows = pairs.filter(([f, b, min]) => contrast(resolve(v[f], v), resolve(v[b], v)) < min).map(([f, b, min]) => `${f}/${b} ${contrast(resolve(v[f], v), resolve(v[b], v)).toFixed(2)}<${min}`);
    check('contrast', `${theme} theme: text, state and accent pairs meet WCAG contrast`, !lows.length, lows.join('; '));
  }
}

/* ---------- favicon and icons ---------- */
section('Favicon: traced from the logo pixel grid');
{
  const src = await read(path.join(root, 'src/favicon.svg'));
  const dst = await read(path.join(dist, 'favicon.svg'));
  const fresh = traceFavicon(path.join(root, 'brand'), paletteStored);
  check('favicon', 'src/favicon.svg equals a fresh trace of the brand mask', src === fresh);
  check('favicon', 'dist/favicon.svg equals the source', dst === src);
  check('favicon', 'SVG, 32x32 with 0 0 32 32 viewBox', /<svg[^>]+width="32"[^>]+height="32"[^>]+viewBox="0 0 32 32"/.test(dst));
  check('favicon', 'no XML comments and no double hyphens anywhere in the file', !dst.includes('<!--') && !dst.includes('--'));
  const pal = new Set(paletteStored.colours.map((c) => c.hex));
  const fav = [...dst.matchAll(/stop-color="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase());
  check('favicon', 'gradient stops are palette colours', fav.length === 3 && fav.every((x) => pal.has(x)), fav.join(','));
  const polys = pathPolys(dst);
  const tp = readPng(path.join(root, 'brand', paletteStored.files.transparent));
  const A = (x, y) => tp.rgba[(y * tp.width + x) * 4 + 3];
  let x0 = tp.width, y0 = tp.height, x1 = 0, y1 = 0;
  for (let y = 0; y < tp.height; y++) for (let x = 0; x < tp.width; x++) if (A(x, y) > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1), ox = x0 - ((side - (x1 - x0 + 1)) >> 1), oy = y0 - ((side - (y1 - y0 + 1)) >> 1);
  let both = 0, either = 0;
  const N = 200;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, v = (j + 0.5) / N;
    const m = A(Math.floor(ox + u * side), Math.floor(oy + v * side)) > 127;
    const t = evenOdd(polys, 1 + u * 30, 1 + v * 30);
    if (m && t) both++;
    if (m || t) either++;
  }
  const iou = both / either;
  check('favicon', `traced outline overlaps the logo mask (IoU ${iou.toFixed(4)})`, iou >= 0.97);
  const ico = readPng(path.join(dist, 'apple-touch-icon.png'));
  check('favicon', `apple-touch-icon is a ${ico.width}x${ico.height} PNG`, ico.width === 180 && ico.height === 180);
  check('favicon', 'page links both icons', /rel="icon"[^>]+favicon\.svg/.test(distHtml) && /rel="apple-touch-icon"/.test(distHtml));
  check('favicon', 'header and footer show the traced mark as the logo', (distHtml.match(/<img class="brand-img" src="\.\/favicon\.svg"/g) || []).length === 2);
}

/* ---------- units and motion ---------- */
section('Mobile and motion hygiene');
{
  const css = await read(path.join(root, 'src/styles/styles.css'));
  check('units', 'no ch units in any stylesheet', !/\d(?:\.\d+)?ch\b/.test(css + tokensCss));
  check('motion', 'prefers-reduced-motion block present in CSS', /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css));
  const main = await read(path.join(root, 'src/js/main.js'));
  check('motion', 'main.js honours prefers-reduced-motion', /prefers-reduced-motion: reduce/.test(main) && /reduce/.test(main));
  check('mobile', 'tap size token is 44px', /--tap:\s*44px/.test(css));
  const hidden = css.match(/[^{}]*(?:\.socials|\.icon-link|\.footer-socials)[^{}]*\{[^}]*display:\s*none/g);
  check('social', 'no rule hides the social icons at any breakpoint', !hidden, hidden ? hidden.join(' | ') : '');
}

/* ---------- rule 1 ---------- */
section('Rule 1: register pattern');
{
  const bad = [];
  for (const [k, r] of Object.entries(register)) {
    if (!STATES.includes(r.state)) bad.push(k + ': bad state');
    if ('asOf' in r) bad.push(k + ': carries a date field');
    if (r.state === 'stated' && !(r.value || r.url)) bad.push(k + ': stated with nothing');
    if (r.state === 'stated' && !r.source) bad.push(k + ': stated without source');
    if (r.state !== 'stated' && (r.value || r.url)) bad.push(k + ': inert record carries data');
    if ('handle' in r) bad.push(k + ': stores a handle');
  }
  check('register', 'every record has a valid state and a source when stated, and none carries a date field', !bad.length, bad.join('; '));
  check('register', 'chain, endpoint and source match the client statement', register.chain.value === 'Solana' && register.rpc.url === 'https://solana-rpc.publicnode.com' && register.chain.source === 'client statement' && register.chain.scope === 'batch-level');
  const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
  const MONTH = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}\b|\b\d{1,2} (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
  const clientJs = (await Promise.all(['main.js', 'chain.js', 'gate.js'].map((f) => read(path.join(dist, 'js', f))))).join('\n');
  const allDist = (await Promise.all(distFiles.filter((f) => !/\.woff2$/.test(f)).map(read))).join('\n');
  check('dates', 'no ISO date, date field or timestamp in any shipped file (markup, scripts, styles, headers)', !ISO.test(allDist) && !/asOf|toISOString|Date\.now/.test(allDist));
  check('dates', 'chain id is stated as 0x65 (101) in the register and on the page', register.chainid.value === '0x65 · 101' && distHtml.includes('0x65 · 101'));
  check('dates', 'no date in the shipped page: no ISO date, no month-day text, no <time> element, anywhere in markup or attributes', !ISO.test(distHtml) && !MONTH.test(distHtml) && !/<time\b/i.test(distHtml));
  check('dates', 'no date or clock string is produced by client scripts that render text (main, chain, gate)', !/toISOString|toLocale(?:Date|Time)?String|new Date\(|Date\.now|clockUtc|\bUTC\b/.test(clientJs));
  check('dates', 'no date-bearing words in visible copy (dated, checked, as of, last check)', !/\b(?:dated|checked|as of|last check|last looked)\b/i.test(distHtml.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head>[\s\S]*?<\/head>/g, ' ').replace(/<[^>]+>/g, ' ')));
  check('dates', 'every register branch renders without dates', ['absent', 'stated', 'unconfirmed'].every((n) => !ISO.test(renderPage(forceAll(register, n))) && !/<time\b/.test(renderPage(forceAll(register, n)))));
  check('rpc', 'RPC endpoint is solana-rpc.publicnode.com, shown on the page and allowed by the CSP', register.rpc.url === 'https://solana-rpc.publicnode.com' && distHtml.includes('solana-rpc.publicnode.com') && /connect-src 'self' https:\/\/solana-rpc\.publicnode\.com/.test(await read(path.join(dist, '_headers'))));
  const everything = (await Promise.all([...srcFiles, ...distFiles, ...projectFiles.filter((p) => rel(p).startsWith('scripts/') && rel(p) !== 'scripts/gates.mjs')].map(read))).join('\n');
  check('rpc', 'no _worker.js, no proxy or relay: the client calls the stated endpoint directly', !projectFiles.some((f) => /_worker\.js$/.test(f)) && !/_worker|\bproxy\b|\brelay\b/i.test(clientJs) && /endpoint = live\.dataset\.rpc/.test(await read(path.join(root, 'src/js/main.js'))) && /doFetch\(endpoint/.test(await read(path.join(root, 'src/js/chain.js'))));
  check('rpc', 'the old endpoint appears nowhere, and there is no fallback or retry list', !/mainnet-beta|api\.mainnet|fallback/i.test(everything) && (clientJs.match(/https?:\/\//g) || []).length === 0);
}

/* ---------- rule 2 ---------- */
section('Rule 2: link rule');
const anchorFor = (html, key) => html.match(new RegExp(`<a[^>]*data-social="${key}"[^>]*>`))?.[0] || '';
// Reads the record that is current at runtime, whichever state that is.
function checkLinks(html, reg) {
  const errs = [];
  for (const key of ['x', 'github']) {
    const a = anchorFor(html, key);
    const rec = reg[key];
    const hasHref = /\shref=/.test(a);
    if (!a) errs.push(`${key}: icon missing`);
    if (isStated(rec) && rec.url) {
      if (!hasHref) errs.push(`${key}: stated but no href`);
      if (!a.includes(`href="${hrefOf(rec)}"`)) errs.push(`${key}: href is not the stored URL`);
      const hdl = handleOf(rec);
      if (!hdl || !a.includes(`@${hdl}`)) errs.push(`${key}: derived handle missing from label`);
    } else {
      if (hasHref) errs.push(`${key}: href on an unstated record`);
      if (!/aria-disabled="true"/.test(a)) errs.push(`${key}: not marked inert`);
    }
  }
  const external = [...html.replace(/<head>[\s\S]*?<\/head>/, '').matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]);
  const allowed = new Set(['x', 'github'].filter((k) => isStated(reg[k])).map((k) => hrefOf(reg[k])));
  for (const u of external) if (!allowed.has(u)) errs.push(`unexpected external href ${u}`);
  return errs;
}
const absentReg = forceAll(register, 'absent');
const statedReg = forceAll(register, 'stated');
const unconfReg = forceAll(register, 'unconfirmed');
const pages = { absent: renderPage(absentReg), stated: renderPage(statedReg), unconfirmed: renderPage(unconfReg) };
{
  const cur = checkLinks(distHtml, register);
  check('links', `shipped page obeys the link rule (current: x ${register.x.state}, github ${register.github.state})`, !cur.length, cur.join('; '));
  for (const [name, reg] of [['absent', absentReg], ['stated', statedReg], ['unconfirmed', unconfReg]]) {
    const errs = checkLinks(pages[name], reg);
    check('links', `branch ${name}: socials follow the record`, !errs.length, errs.join('; '));
  }
  check('links', 'handle is derived from the stored URL (no stored handle)', handleOf(statedReg.x) === new URL(statedReg.x.url).pathname.split('/')[1] && !('handle' in statedReg.x));
  check('links', 'X and GitHub icons render in every state', ['absent', 'stated', 'unconfirmed'].every((n) => ['x', 'github'].every((k) => anchorFor(pages[n], k))));
  const full = distHtml.match(/<span class="socials"[\s\S]*?<\/span>/)?.[0] || '';
  const labels = [...full.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) => m[1].replace(/<svg[\s\S]*?<\/svg>/g, '').trim());
  check('social', 'social anchors contain no text, only the svg', labels.length === 2 && labels.every((l) => l === ''));
  check('social', 'official X mark and GitHub Octicon paths are used', full.includes('M18.244 2.25h3.308l-7.227 8.26') && full.includes('M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59'));
  check('social', 'socials sit in the top header row and are repeated in the footer', /<div class="nav-actions">[\s\S]*data-social="x"[\s\S]*data-social="github"/.test(distHtml) && /id="footer-socials"/.test(distHtml));
  const mutantSocial = (html) => html.replace(/(<a class="icon-link is-inert"[^>]*data-social="[a-z]+")/g, '$1 href="https://example.invalid/x"');
  check('mutation', 'link-rule check rejects a renderer that adds href to unstated records', checkLinks(mutantSocial(pages.absent), absentReg).length > 0);
}

/* ---------- contract slot ---------- */
section('On-chain address slot: both branches');
{
  const caA = caSlot(absentReg.ca);
  const caS = caSlot(statedReg.ca);
  check('ca', 'absent branch: inert, shows the state word only, no copy payload, copy button disabled', !/data-copy/.test(caA) && /is-inert/.test(caA) && />Not stated</.test(caA) && !/\d{4}-\d{2}-\d{2}|<time/.test(caA) && /<button[^>]*disabled/.test(caA));
  check('ca', 'stated branch: full address shown, untruncated, click to copy, button enabled', caS.includes(`>${statedReg.ca.value}</button>`) && caS.includes(`data-copy="${statedReg.ca.value}"`) && !/…|\.\.\./.test(caS) && !/<button[^>]*disabled/.test(caS) && /ca-fb/.test(caS));
  const i = distHtml.indexOf('id="ca-slot"');
  check('ca', 'slot sits in the fixed header, ahead of all page content', i > 0 && i < distHtml.indexOf('<main>') && i < distHtml.indexOf('id="top"'));
  check('ca', `shipped page matches the current record (${register.ca.state})`, distHtml.includes(caSlot(register.ca)));
  const css = await read(path.join(root, 'src/styles/styles.css'));
  check('ca', 'slot stylesheet sets a large font and wraps the whole address', /\.ca-value\s*\{[^}]*font-size:\s*clamp\(1\.05rem,\s*2\.5vw,\s*1\.55rem\)[^}]*overflow-wrap:\s*anywhere/.test(css));
  check('ca', 'copy handler gives visible and announced feedback', /classList\.add\('done'\)/.test(await read(path.join(root, 'src/js/main.js'))) && /aria-live="polite"/.test(caS));
}

/* ---------- gate ---------- */
section('Rule 3: gate (never blanket-reject base58)');
let demoB = '';
{
  function checkGate(cls, regAbsent, regStated) {
    const errs = [];
    const real = regStated.ca.value;
    const other = randomBase58(44);
    for (const s of [randomBase58(44), randomBase58(43), randomBase58(32), '  ' + randomBase58(44) + '  ']) {
      if (cls(s, regAbsent).kind === 'not-address-shaped') errs.push('rejects base58 when registry absent');
      if (cls(s, regAbsent).kind !== 'no-registry') errs.push('absent branch should be no-registry');
      if (cls(s, regStated).kind === 'not-address-shaped') errs.push('rejects base58 when registry stated');
    }
    if (cls(real, regStated).kind !== 'match') errs.push('stated value does not match itself');
    if (cls(' ' + real + ' ', regStated).kind !== 'match') errs.push('padding breaks match');
    if (cls(other, regStated).kind !== 'differs') errs.push('different address not called different');
    if (cls(real, regAbsent).kind !== 'no-registry') errs.push('absent registry still matches');
    for (const bad of ['0' + randomBase58(43), randomBase58(20) + 'O' + randomBase58(23), randomBase58(43) + 'l', 'I' + randomBase58(43), 'hello world', randomBase58(31), randomBase58(45)]) {
      if (cls(bad, regStated).kind !== 'not-address-shaped') errs.push('non-base58 or wrong length treated as address: ' + bad);
    }
    if (cls('', regStated).kind !== 'empty') errs.push('empty input');
    return errs;
  }
  const gateErrs = checkGate(classify, absentReg, statedReg);
  check('gate', 'both branches, four shapes, edge cases, wrong alphabets', !gateErrs.length, gateErrs.join('; '));
  let blanket = 0;
  for (let i = 0; i < 500; i++) if (!isAddressShaped(randomBase58(32 + (i % 13)))) blanket++;
  check('gate', '500 random base58 strings of address length, none rejected', blanket === 0, String(blanket));
  const mutants = {
    'rejects every base58 string': () => ({ kind: 'not-address-shaped' }),
    'ignores the registry': (s) => ({ kind: isAddressShaped(s) ? 'match' : 'not-address-shaped' }),
    'matches when registry absent': (s, r) => (isAddressShaped(s) ? { kind: s === r.ca.value || r.ca.value === null ? 'match' : 'differs' } : { kind: 'not-address-shaped' })
  };
  for (const [name, fn] of Object.entries(mutants)) check('mutation', `gate check rejects mutant: ${name}`, checkGate(fn, absentReg, statedReg).length > 0);
  demoB = distHtml.match(/data-demo-b="([^"]+)"/)?.[1];
  check('gate', 'demo samples are declared in the shipped page', /data-demo-a="[^"]+"/.test(distHtml) && !!demoB);
  check('gate', 'demo sample is address-shaped and is not any stated registry value', isAddressShaped(demoB) && !Object.values(register).some((r) => r.value === demoB));
}

/* ---------- numbers ---------- */
section('Fabricated numbers');
{
  const strip = (html) => html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head>[\s\S]*?<\/head>/g, ' ')
    .replace(/<time[^>]*>[\s\S]*?<\/time>/g, ' ')
    .replace(/<(span|b)[^>]*\bdata-(?:derived|ord)\b[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const visible = strip(distHtml).replace(/&[a-z#0-9]+;/g, ' ');
  const digits = visible.replace(demoB || '\u0000', '').replace(/0x65 · 101/g, '').match(/.{0,24}\d.{0,24}/g) || [];
  check('numbers', 'no digit in visible copy except values derived from the register', !digits.length, digits.slice(0, 4).join(' | '));
  const derived = [...distHtml.matchAll(/<(?:span|b)[^>]*data-derived[^>]*>([\s\S]*?)<\/(?:span|b)>/g)].map((m) => m[1]);
  const tl = tally(register);
  const ok = new Set([String(tl.stated), String(tl.absent + tl.unconfirmed), String(tl.total), '0%', String(register.chainid.value)]);
  check('numbers', 'every derived span equals a count computed from the register', derived.every((v) => ok.has(v) || !/\d/.test(v)), derived.join(','));
  const tokens = new Set();
  for (const f of [...srcFiles, ...distFiles, ...projectFiles.filter((p) => rel(p).startsWith('scripts/') && !/ref-fingerprint|gates\.mjs|fixture\.mjs/.test(p))]) {
    for (const m of (await read(f)).matchAll(/[1-9A-HJ-NP-Za-km-z]{32,44}/g)) tokens.add(m[0]);
  }
  const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const extras = [...tokens].filter((t) => t !== demoB && !ALPHA.includes(t) && /\d/.test(t) && /[A-Z]/.test(t) && /[a-z]/.test(t));
  check('numbers', 'no address-shaped string in src, dist or scripts other than the demo sample', !extras.length, extras.join(', '));
  const REF_CA_SHA256 = 'dab80d5647e200325258b3c1ffeb40eb92af727b0e1e48131cd509c01d8ed565';
  check('numbers', 'the reference site contract string appears nowhere in this project', ![...tokens].some((t) => createHash('sha256').update(t).digest('hex') === REF_CA_SHA256));
}

/* ---------- copy ---------- */
section('Copy: no shared word pairs with the reference site or the client slides');
{
  const fp = JSON.parse(await read(path.join(root, 'scripts/ref-fingerprint.json')));
  const refPairs = new Set(fp.bigrams);
  const refWords = new Set(fp.words);
  const visible = distHtml
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<title>([\s\S]*?)<\/title>/, ' $1 . ')
    .replace(/<meta[^>]*(?:description|og:description|og:title)[^>]*content="([^"]*)"[^>]*>/g, ' . $1 . ')
    .replace(/<(?:time|svg)[\s\S]*?<\/(?:time|svg)>/g, ' ')
    .replace(/<\/(?:p|li|h\d|small|strong|div|span|summary|dt|dd|em|b|a|button|section)>/g, ' . ')
    .replace(/<[^>]+>/g, ' ');
  const main = await read(path.join(root, 'src/js/main.js'));
  const text = [visible, ...proseStrings(main)].join(' . ').replace(/&middot;|&amp;|&#39;/g, ' ');
  const ours = bigrams(text);
  const shared = [...ours].filter((b) => refPairs.has(h(b)));
  check('copy', `zero shared 2-grams (stop-word pairs excluded): ${ours.size} of ours against ${refPairs.size} of theirs`, shared.length === 0, shared.join(' | '));
  const sw = [...contentWords(text)].filter((w) => refWords.has(h(w)));
  note(`shared single content words (generic vocabulary, informational): ${sw.length}${sw.length ? ' -> ' + sw.join(', ') : ''}`);
}

/* ---------- animation ---------- */
section('Animation: values taken from the reference, every section animates');
{
  const css = await read(path.join(root, 'src/styles/styles.css'));
  const main = await read(path.join(root, 'src/js/main.js'));
  const has = (re, msg) => check('animation', msg, re.test(css));
  has(/\.js \.reveal \{[^}]*opacity: 0; transform: translateY\(16px\); transition: opacity 0\.62s var\(--ease-out\), transform 0\.62s var\(--ease-out\)/, 'scroll reveal: opacity and 16px rise over 620 ms');
  has(/--ease-out: cubic-bezier\(0\.22, 1, 0\.36, 1\)/, 'easing curve is cubic-bezier(.22, 1, .36, 1)');
  has(/data-d="1"\] \{ transition-delay: 60ms[\s\S]*data-d="6"\] \{ transition-delay: 320ms/, 'stagger steps of 60 ms capped at 320 ms');
  has(/\.marquee-track \{[^}]*animation: marquee 58s linear infinite[\s\S]*\.reverse \{ animation-direction: reverse; animation-duration: 66s/, 'marquee rows: 58 s and 66 s reverse, linear, pause on hover');
  has(/pulse-dot 2\.6s var\(--ease-out\) infinite/, 'status dot pulse: 2.6 s');
  has(/eq-turn 0\.54s ease-in-out infinite backwards[\s\S]*12% \{[^}]*\} 26% \{[\s\S]*40% \{/, 'equaliser: 0.54 s with 12, 26 and 40 percent beats');
  has(/animation: spin 0\.7s linear infinite/, 'spinner: 0.7 s');
  has(/caret-blink 1s steps\(1\) infinite/, 'caret blink: 1 s, one step');
  has(/press-ready 0\.64s var\(--ease-out\)/, 'button press: 0.64 s');
  has(/setup-in 0\.32s var\(--ease-out\)/, 'tab panel entrance: 0.32 s');
  has(/\.o1 \{ --d: 56%; --t: 24s; \}[\s\S]*\.o2 \{ --d: 78%; --t: 38s;[\s\S]*\.o3 \{ --d: 102%; --t: 58s;/, 'orbit rings: 24 s, 38 s and 58 s');
  has(/\.run-bar i \{[^}]*transition: width 0\.12s linear/, 'progress bar: 120 ms linear');
  has(/\.nav \{[^}]*transition: background 0\.26s ease, border-color 0\.26s ease/, 'header: 0.26 s background transition');
  check('animation', 'script timings: 34 ms typing, 90 ms progress tick, 640 ms steps, 700 ms pause, 4200 ms hold', /setTimeout\(step, 34\)/.test(main) && /pct \+ 1; paintWalk\(\); \}, 90\)/.test(main) && /wait\(640\)/.test(main) && /wait\(700\)/.test(main) && /wait\(4200\)/.test(main));
  check('animation', 'reveal observer: threshold 0.12, bottom margin -8 percent, one-shot, shows at once when the tab is hidden', /threshold: 0\.12, rootMargin: '0px 0px -8% 0px'/.test(main) && /io\.unobserve/.test(main) && /document\.hidden\) \{\n  reveals\.forEach/.test(main));
  check('animation', 'reduced motion switches off marquee, orbits, caret, pulse, equaliser, tab entrance and reveals', /prefers-reduced-motion: reduce\)[\s\S]*\.js \.reveal \{ opacity: 1; transform: none[\s\S]*\.marquee-track \{ animation: none[\s\S]*\.orbit, \.orbit i[\s\S]*\.tabpanel\.enter/.test(css));
  const bodyHtml = distHtml.slice(distHtml.indexOf('<body>'));
  const blocks = [...bodyHtml.matchAll(/<(section|footer)\b[^>]*>([\s\S]*?)<\/\1>/g)];
  const stat = blocks.filter((m) => !/class="[^"]*\breveal\b/.test(m[2])).map((m) => m[0].slice(0, 60));
  check('animation', `every one of the ${blocks.length} sections and the footer contains scroll-revealed content, none is static`, blocks.length >= 11 && !stat.length, stat.join(' | '));
  const revealCount = (bodyHtml.match(/class="[^"]*\breveal\b/g) || []).length;
  check('animation', `${revealCount} elements carry the reveal class, spread across all sections`, revealCount >= 65);
  check('animation', 'items inside lists and grids are staggered (faq, tiles, points, rows, open items, footer)', ['faq-item reveal', 'tile reveal', 'reg-row reveal', 'footer-brand reveal', 'footer-cols reveal'].every((c) => bodyHtml.includes(c)));
}

/* ---------- report ---------- */
for (const r of rows) {
  if (r.section) { console.log('\n' + r.section); continue; }
  if (r.info) { console.log('  note  ' + r.info); continue; }
  console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.name}${r.ok ? '' : r.detail ? '\n        ' + r.detail : ''}`);
}
const total = rows.filter((r) => 'ok' in r).length;
console.log(`\n${total - failed}/${total} checks passed`);
process.exit(failed ? 1 : 0);
