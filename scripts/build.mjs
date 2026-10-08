import { rm, mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const DEFAULT_DIST = path.join(root, 'dist');

// Client code that ships. Page rendering modules stay at build time.
const CLIENT = ['main.js', 'register.js', 'gate.js', 'chain.js', 'theme-boot.js'];

export async function build(dist = DEFAULT_DIST, regOverride = null) {
  const { register: base } = await import(pathToFileURL(path.join(src, 'js/register.js')).href);
  const { renderPage } = await import(pathToFileURL(path.join(src, 'js/page.js')).href);
  const register = regOverride || base;
  const palette = JSON.parse(await readFile(path.join(src, 'styles/palette.json'), 'utf8'));
  const hexOf = (n) => palette.colours.find((c) => c.name === n).hex;

  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, 'assets'), { recursive: true });
  await mkdir(path.join(dist, 'js'), { recursive: true });
  for (const f of CLIENT) await cp(path.join(src, 'js', f), path.join(dist, 'js', f));
  if (regOverride) {
    // Override builds (gate and measurement fixtures) must hand the browser the same register the page was drawn from.
    const original = await readFile(path.join(src, 'js/register.js'), 'utf8');
    const start = original.indexOf('export const register = {');
    const end = original.indexOf('\n};', start) + 3;
    const next = original.slice(0, start) + 'export const register = ' + JSON.stringify(register, null, 2) + ';' + original.slice(end);
    await writeFile(path.join(dist, 'js/register.js'), next);
  }
  await cp(path.join(src, 'fonts'), path.join(dist, 'fonts'), { recursive: true });
  await cp(path.join(src, 'styles/tokens.css'), path.join(dist, 'assets/tokens.css'));
  await cp(path.join(src, 'styles/styles.css'), path.join(dist, 'assets/styles.css'));
  await cp(path.join(src, 'favicon.svg'), path.join(dist, 'favicon.svg'));
  await cp(path.join(src, 'apple-touch-icon.png'), path.join(dist, 'apple-touch-icon.png'));

  const title = `${register.name.value} | Agents that keep the routine moving`;
  const desc = `${register.name.value} puts software agents on repetitive jobs and links them into chains, built for ${register.chain.value}. Every outside fact on the site is one dated entry in a register and stays inert until it is stated.`;
  const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="${hexOf('brand-canvas')}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${hexOf('brand-deep')}" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="https://${register.domain.value}/">
<link rel="icon" href="./favicon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
<link rel="preload" href="./fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<script src="./js/theme-boot.js"></script>
<link rel="stylesheet" href="./assets/tokens.css">
<link rel="stylesheet" href="./assets/styles.css">
</head>
<body>
<a class="sr-only" href="#top">Jump to main</a>
${renderPage(register)}
<script type="module" src="./js/main.js"></script>
</body>
</html>
`;
  await writeFile(path.join(dist, 'index.html'), html);

  const rpcOrigin = new URL(register.rpc.url).origin;
  await writeFile(path.join(dist, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${rpcOrigin}; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`);
  await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.log('build ok -> dist/ (' + (html.length / 1024).toFixed(1) + ' KB html)');
}

async function cli() {
  const arg = (n) => process.argv.find((a) => a.startsWith('--' + n + '='))?.split('=')[1];
  const fx = arg('fixture');
  if (!fx) return build();
  const { register } = await import(pathToFileURL(path.join(src, 'js/register.js')).href);
  const { forceAll } = await import('./fixture.mjs');
  return build(path.resolve(root, arg('out') || '.refcache/fixture'), forceAll(register, fx));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch((e) => { console.error(e); process.exit(1); });
}
