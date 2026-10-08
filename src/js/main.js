import { register } from './register.js';
import { classify } from './gate.js';
import { readSlot, readSupply, formatSlot } from './chain.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Header: stuck state, measured height, menu, theme */
const nav = $('#nav');
const setNavH = () => document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
new ResizeObserver(setNavH).observe(nav);
setNavH();
const onScroll = () => nav.classList.toggle('stuck', scrollY > 24);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = $('#burger');
const sheet = $('#sheet');
burger.addEventListener('click', () => {
  const open = sheet.hidden;
  sheet.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Collapse navigation' : 'Expand navigation');
});
sheet.addEventListener('click', (e) => {
  if (e.target.closest('a')) { sheet.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Expand navigation'); }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { sheet.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.focus(); } });

$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('openhash-theme', next); } catch { /* storage may be blocked */ }
});

/* Reveal on scroll */
const reveals = $$('.reveal');
if (reduce || !('IntersectionObserver' in window) || document.hidden) {
  reveals.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
}

/* Click to copy */
document.addEventListener('click', async (e) => {
  const trig = e.target.closest('[data-copy]');
  if (!trig) return;
  const text = trig.getAttribute('data-copy');
  if (!text) return;
  const btn = trig.closest('.ca')?.querySelector('.ca-copy');
  const fb = btn?.querySelector('.ca-fb');
  try {
    await navigator.clipboard.writeText(text);
    btn?.classList.add('done');
    if (fb) fb.textContent = 'Copied';
    btn?.setAttribute('aria-label', 'Copied');
    setTimeout(() => {
      btn?.classList.remove('done');
      if (fb) fb.textContent = '';
      btn?.setAttribute('aria-label', 'Copy on-chain address');
    }, 1600);
  } catch {
    // Clipboard API refused (permissions, insecure context). Fall back to a temporary selection.
    let ok = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'sr-only';
      document.body.appendChild(ta); ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch { /* fall through */ }
    if (fb) fb.textContent = ok ? 'Copied' : 'Copy blocked';
    btn?.classList.add('done');
    setTimeout(() => { btn?.classList.remove('done'); if (fb) fb.textContent = ''; }, 1600);
  }
});

/* Tabs */
const tabs = $$('[role="tab"]');
function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = $('#' + t.getAttribute('aria-controls'));
    panel.hidden = !on;
    if (on && !reduce) { panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter'); }
  });
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length], true); }
    if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); selectTab(tabs.at(-1), true); }
  });
});

/* Gate demo. Timings follow the reference: 34 ms per character, 700 ms before the checking steps, 640 ms per step, 4200 ms hold. */
const stage = $('#gate-stage');
const input = $('#gate-input');
const inputWrap = $('.gate-input');
const mirror = $('.gate-mirror');
const caret = $('.gate-caret');
const gStatus = $('#gate-verdict');
const replay = $('#gate-replay');
const MESSAGES = {
  empty: ['Ready', 'Two samples type themselves in. Tap into the field to enter your own.', 'Waiting', 'Waiting'],
  'not-address-shaped': ['Not address-shaped', 'Nothing to compare. The string is reported as plain text.', 'Plain text', 'Nothing to match'],
  'no-registry': ['Address-shaped, nothing to match', 'The register holds no stated on-chain address, so this string stays unconfirmed. It is not called invalid.', 'Address-shaped', 'Unconfirmed'],
  match: ['Matches the stated on-chain address', 'The string equals the stated value, character for character.', 'Address-shaped', 'Match'],
  differs: ['Address-shaped, different from the stated one', 'The shape is fine. It is simply not the stated on-chain address.', 'Address-shaped', 'Different']
};
const CHECK_STEPS = [['Reading the shape', 'Length and alphabet only.'], ['Comparing with the register', 'Against the stated on-chain address, if there is one.']];
function showVerdict(text) {
  const r = classify(text, register);
  const [title, body, shape, verdict] = MESSAGES[r.kind];
  $('#gv-title').textContent = title;
  $('#gv-body').textContent = body;
  $('#gf-shape').textContent = shape;
  $('#gf-verdict').textContent = verdict;
  gStatus.dataset.kind = r.kind;
  gStatus.classList.remove('busy');
}
function placeCaret() {
  mirror.textContent = input.value;
  caret.style.left = 17 + mirror.offsetWidth + 'px';
}
let gateTimer = 0;
let demoRun = 0;
function typeInto(text, id) {
  return new Promise((resolve) => {
    if (reduce) { input.value = text; placeCaret(); resolve(); return; }
    let i = 0;
    const step = () => {
      if (id !== demoRun) return resolve();
      input.value = text.slice(0, ++i);
      placeCaret();
      if (i < text.length) gateTimer = setTimeout(step, 34); else resolve();
    };
    step();
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
async function runDemo() {
  const id = ++demoRun;
  const samples = [stage.dataset.demoA, stage.dataset.demoB];
  inputWrap.classList.add('typing');
  for (const sample of samples) {
    if (id !== demoRun) return;
    input.value = '';
    placeCaret();
    gStatus.dataset.kind = 'empty';
    gStatus.classList.add('busy');
    $('#gv-title').textContent = 'Typing';
    $('#gv-body').textContent = 'A sample string is being entered.';
    await typeInto(sample, id);
    if (id !== demoRun) return;
    replay.classList.remove('is-ready');
    void replay.offsetWidth;
    replay.classList.add('is-ready');
    await wait(700);
    for (const [title, body] of CHECK_STEPS) {
      if (id !== demoRun) return;
      $('#gv-title').textContent = title;
      $('#gv-body').textContent = body;
      await wait(640);
    }
    if (id !== demoRun) return;
    replay.classList.remove('is-ready');
    showVerdict(sample);
    await wait(4200);
  }
  if (id === demoRun) inputWrap.classList.remove('typing');
}
function stopDemo() { demoRun++; clearTimeout(gateTimer); inputWrap.classList.remove('typing'); replay.classList.remove('is-ready'); }
input.addEventListener('focus', stopDemo);
input.addEventListener('input', () => { stopDemo(); showVerdict(input.value); });
replay.addEventListener('click', () => { input.value = ''; runDemo(); });
if ('IntersectionObserver' in window && !reduce && !document.hidden) {
  const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); runDemo(); } }, { threshold: 0.35 });
  io.observe(stage);
} else {
  runDemo();
}

/* Sample routine */
const demo = $('#run-demo');
const steps = demo.dataset.steps.split('|');
const pctEl = $('#run-pct');
const fill = $('#run-fill');
const bar = $('.run-bar', demo);
const startBtn = $('#run-start');
const stopBtn = $('#run-stop');
const startHTML = startBtn.innerHTML;
let pct = 0;
let walkTimer = 0;
function paintWalk() {
  pctEl.textContent = pct + '%';
  fill.style.width = pct + '%';
  bar.setAttribute('aria-valuenow', String(pct));
  $('#run-task').textContent = steps[Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length))];
}
function setWalk(running) {
  clearInterval(walkTimer);
  startBtn.disabled = running;
  stopBtn.disabled = !running;
  startBtn.classList.toggle('is-live', running);
  startBtn.innerHTML = running ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>Working' : startHTML;
  bar.classList.toggle('stopped', !running);
  $('#run-status-t').textContent = running ? 'Running' : 'Stopped';
  const d = $('#run-status .dot');
  d.className = 'dot ' + (running ? 's-stated pulse' : 's-absent');
  if (running && !reduce) walkTimer = setInterval(() => { pct = pct >= 100 ? 0 : pct + 1; paintWalk(); }, 90);
  paintWalk();
}
startBtn.addEventListener('click', () => setWalk(true));
stopBtn.addEventListener('click', () => setWalk(false));
setWalk(!reduce);

/* Live chain read */
const live = $('#live');
const endpoint = live.dataset.rpc;
const mint = live.dataset.ca;
const stateDot = $('#live-state .dot');
let inflight = 0;
async function readChain() {
  if (!endpoint) { $('#live-state-t').textContent = 'No endpoint stated'; return; }
  const id = ++inflight;
  $('#live-state-t').textContent = 'Reading';
  stateDot.className = 'dot s-unconfirmed';
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const slot = await readSlot(endpoint, fetch.bind(globalThis), ctl.signal);
    if (id !== inflight) return;
    $('#live-slot').textContent = formatSlot(slot);
    stateDot.className = 'dot s-stated pulse';
    $('#live-state-t').textContent = 'Live';
  } catch (e) {
    if (id !== inflight) return;
    stateDot.className = 'dot s-absent';
    $('#live-state-t').textContent = 'Read failed (' + (e && e.message ? e.message : 'no reply') + ')';
  } finally { clearTimeout(to); }
  if (mint) {
    try { $('#live-supply').textContent = await readSupply(endpoint, mint, fetch.bind(globalThis), ctl.signal); $('#live-supply').classList.remove('live-inert'); }
    catch (e) { $('#live-supply').textContent = 'Read failed (' + (e && e.message ? e.message : 'no reply') + ')'; }
  }
}
$('#live-refresh').addEventListener('click', readChain);
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); readChain(); setInterval(() => { if (!document.hidden) readChain(); }, 30000); } }, { rootMargin: '200px 0px' });
  io.observe(live);
} else {
  readChain();
}

/* Crew board */
const floor = $('#floor');
const rows = $$('li[data-run]', floor);
const allBtn = $('#floor-all', floor);
function setRow(li, running) {
  li.dataset.run = running ? '1' : '0';
  li.classList.toggle('is-stopped', !running);
  const chipEl = $('.floor-chip', li);
  chipEl.className = 'chip floor-chip s-' + (running ? 'stated' : 'absent');
  $('.dot', chipEl).className = 'dot s-' + (running ? 'stated pulse' : 'absent');
  $('b', chipEl).textContent = running ? 'Running' : 'Stopped';
  $('[data-act=start]', li).disabled = running;
  $('[data-act=stop]', li).disabled = !running;
  $('[data-act=start]', li).classList.toggle('is-live', running);
}
function syncAll() {
  const any = rows.some((r) => r.dataset.run === '1');
  allBtn.classList.toggle('is-stop', any);
  $('span', allBtn).textContent = any ? 'Halt all' : 'Resume all';
}
rows.forEach((li) => {
  setRow(li, true);
  $('[data-act=start]', li).addEventListener('click', () => { setRow(li, true); syncAll(); });
  $('[data-act=stop]', li).addEventListener('click', () => { setRow(li, false); syncAll(); });
});
allBtn.addEventListener('click', () => { const next = !rows.some((r) => r.dataset.run === '1'); rows.forEach((li) => setRow(li, next)); syncAll(); });

/* Routine illustration: one step at a time, percent beside each, looped */
const buildEl = $('#build-demo');
const bSteps = $$('[data-step]', buildEl);
const bFill = $('#build-fill');
const bBar = $('.run-bar', buildEl);
let bRun = 0;
function bPaint(done, pctNow) {
  bSteps.forEach((li, i) => {
    li.classList.toggle('is-done', i < done);
    li.classList.toggle('is-on', i === done);
    $('.build-pct', li).textContent = (i < done ? 100 : i === done ? pctNow : 0) + '%';
  });
  const total = Math.round(((done + (pctNow / 100)) / bSteps.length) * 100);
  bFill.style.width = Math.min(100, total) + '%';
  bBar.setAttribute('aria-valuenow', String(Math.min(100, total)));
}
async function playBuild() {
  const id = ++bRun;
  if (reduce) { bPaint(bSteps.length, 100); bSteps.forEach((li) => { li.classList.add('is-done'); li.classList.remove('is-on'); $('.build-pct', li).textContent = '100%'; }); return; }
  bPaint(0, 0);
  for (let i = 0; i < bSteps.length; i++) {
    for (let p = 0; p <= 100; p += 20) {
      if (id !== bRun) return;
      bPaint(i, p);
      await wait(120);
    }
    await wait(640);
  }
  if (id !== bRun) return;
  bSteps.forEach((li) => li.classList.add('is-done'));
  bFill.style.width = '100%';
  await wait(4200);
  if (id === bRun) playBuild();
}
$('#build-replay').addEventListener('click', playBuild);
if ('IntersectionObserver' in window && !reduce && !document.hidden) {
  const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); playBuild(); } }, { threshold: 0.35 });
  io.observe(buildEl);
} else {
  playBuild();
}
