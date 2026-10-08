import { esc } from './util.js';
import * as I from './icons.js';
import { dot, chip, caSlot, socials, windowFrame, registerRows, brandMark, agentCard, STATE_LABEL } from './views.js';
import { tally, hostOf, isStated } from './register.js';

const NAV = [
  ['#agents', 'Agents'],
  ['#chains', 'Chains'],
  ['#gate', 'Gate'],
  ['#register', 'Register'],
  ['#chain', 'Solana'],
  ['#faq', 'Questions']
];

const DEMO_NOT_ADDRESS = 'hello openhash';
const DEMO_ADDRESS = '3UFWNAw2ad6hoGCZ22WTPYVKcXjL2ux4UGKKjQvKKuNu';
const SAMPLES = [
  { name: 'Ada', role: 'Collector', initial: 'A' },
  { name: 'Bo', role: 'Analyst', initial: 'B' },
  { name: 'Cy', role: 'Reviewer', initial: 'C' }
];
const STEPS = ['Gathering a fresh item', 'Reading what it contains', 'Writing a short note', 'Handing it to Bo'];

export function renderPage(reg) {
  const t = tally(reg);
  const pending = Object.entries(reg).filter(([, r]) => r.state !== 'stated');
  const rpcHost = hostOf(reg.rpc.url) || '';
  const chainName = reg.chain.value || 'Solana';
  const name = reg.name.value;
  const hand = `<span class="hand" aria-hidden="true">${I.arrow}</span>`;
  const chainRow = SAMPLES.map((s, i) => agentCard({ ...s, status: i === 2 ? 'Sample wait' : 'Sample run', live: i !== 2 }, i + 1)).join(hand);

  const FAQ = [
    [`What is ${name}?`, `Software agents that take over repetitive jobs, linked together, operated from one workspace, for ${chainName}. That description comes from client slides and is the sum of what has been stated.`],
    ['Can I download it or sign up?', 'Nothing of the kind has been stated yet. The register holds an open entry for product access, and this answer changes when it does.'],
    ['Why are some icons and fields faded?', 'Their entry is absent or unconfirmed. They keep their place so the layout never jumps and they accept no clicks.'],
    ['Where is the on-chain address?', 'The slot at the very top of the page holds it. Today it shows not stated. As soon as a value enters the register, the slot shows the entire string and copies it on a click.'],
    ['How do the X and GitHub icons get their links?', 'The register stores a URL. The page derives the handle from that URL when it draws the icon. With no stored URL there is nothing to follow, so the icon stays inert.'],
    ['What does the gate do with an address that is not ours?', 'It reports the shape honestly. An address-shaped string is compared with the stated on-chain address and called a match or a difference. It is never thrown out for being unfamiliar.'],
    [`Who named ${chainName} and the endpoint?`, `A client statement, recorded at batch level. The provenance line sits on each of those entries.`],
    ['Are the agent cards real data?', 'No. Every card, status and progress bar on the site is a labelled sample drawn in your browser. Only the cluster slot is live.'],
    ['What does the page remember about me?', 'Only your light or dark choice, kept in this browser. No accounts, no cookies, no analytics.']
  ];

  const header = `
<header class="nav" id="nav">
  <div class="nav-inner wrap">
    <a href="#top" class="nav-brand" aria-label="${esc(name)} home">${brandMark('brand-img', 32)}<span><strong>${esc(name)}</strong><small>${esc(chainName)} · ${esc(reg.domain.value)}</small></span></a>
    <nav class="nav-links" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
    <div class="nav-actions">
      <button type="button" class="nav-icon-link" id="theme-toggle" aria-label="Switch colour theme" title="Switch colour theme"><span class="i-sun">${I.sun}</span><span class="i-moon">${I.moon}</span></button>
      <span class="socials" id="socials">${socials(reg)}</span>
      <button type="button" class="nav-burger" id="burger" aria-label="Expand navigation" aria-expanded="false" aria-controls="sheet">${I.menu}</button>
    </div>
  </div>
  <div class="ca-wrap wrap">${caSlot(reg.ca)}</div>
  <div class="nav-sheet" id="sheet" hidden>${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
</header>`;

  const hero = `
<section class="hero" id="top">
  <div class="wrap hero-inner">
    <div class="hero-copy reveal">
      <span class="hero-badge">Built for ${esc(chainName)}</span>
      <h1>Routine work,<br><em>handed off for good.</em></h1>
      <p class="lead hero-lead">${esc(name)} puts software agents on the repetitive parts of your day. Give each one a remit, walk it through the routine once, then link agents end to end so everything keeps moving while you do something else.</p>
      <div class="hero-actions"><a class="btn btn-primary btn-lg" href="#agents">${I.eye}Meet the agents</a><a class="btn btn-ghost btn-lg" href="#gate">${I.search}Check an address</a></div>
      <ul class="hero-trust">
        <li class="reveal" data-d="1">${I.tag}One remit per agent</li>
        <li class="reveal" data-d="2">${I.refresh}Taught once, repeated</li>
        <li class="reveal" data-d="3">${I.link}Linked end to end</li>
        <li class="reveal" data-d="4">${I.shield}Stated claims only</li>
      </ul>
    </div>
    <div class="hero-shot reveal" data-d="2">
      ${windowFrame('Workspace · sample', `<div class="chain-row">${chainRow}</div>`, 'hero-window')}
      <div class="hero-callout callout-a"><span class="dot s-stated pulse" aria-hidden="true"></span><span><strong><span data-derived>${t.stated}</span> on record</strong><small>live only where stated</small></span></div>
      <div class="hero-callout callout-b"><span class="dot s-absent" aria-hidden="true"></span><span><strong><span data-derived>${t.absent + t.unconfirmed}</span> waiting</strong><small>drawn and inert</small></span></div>
    </div>
    <p class="hero-caption reveal" data-d="3">Sample cards. They show the shape of the product and carry no live data.</p>
  </div>
</section>`;

  const jobs = ['Filing the daily report', 'Sorting what arrives overnight', 'Tidying a shared folder', 'Checking a dashboard on the hour', 'Copying figures between sheets', 'Flagging items that need a person', 'Gathering prices while you sleep', 'Renaming a batch of files'];
  const rules = ['Absent draws inert', 'Unconfirmed draws inert', 'Every entry names its origin', 'Links derive from stored URLs', 'Handles are read, never typed', 'Address shapes get matched', 'No string is refused for looking odd', 'One file holds the facts'];
  const mq = (items, ic, rev) => `<div class="marquee-track${rev ? ' reverse' : ''}">${[0, 1].map((n) => `<ul${n ? ' aria-hidden="true"' : ''}>${items.map((s) => `<li>${ic}${esc(s)}</li>`).join('')}</ul>`).join('')}</div>`;
  const gate = `
<section class="marquee-section" aria-label="Examples of routine work">
  <div class="wrap marquee-head reveal"><p class="marquee-label">Routine an agent could hold</p><h2>Hand over the dull parts.</h2></div>
  <div class="marquee reveal" data-d="1">${mq(jobs, dot('stated'), false)}${mq(rules, I.hash, true)}</div>
  <div class="wrap">
    <div class="link-rule reveal" aria-hidden="true"><span class="link-rule-line"></span><span class="link-rule-chip">${I.arrow}Paste anything</span><span class="link-rule-line"></span></div>
    <div class="gate-flow" id="gate">
      <div class="gate-copy reveal">
        <span class="icon-tile solid">${I.shield}</span>
        <span class="eyebrow">The gate</span>
        <h2>Paste an address. It is compared, not judged.</h2>
        <p class="lead">Any string resembling a Solana address is set beside the register. The gate does not turn a string away for being unfamiliar; it reports if the string equals what has been stated.</p>
      </div>
      <div class="gate-stage reveal" data-d="2" id="gate-stage" data-demo-a="${esc(DEMO_NOT_ADDRESS)}" data-demo-b="${esc(DEMO_ADDRESS)}">
        <div class="gate-form">
          <label class="gate-hint" for="gate-input">Type or paste a string to check.</label>
          <div class="gate-input"><span class="gate-mirror" aria-hidden="true"></span><span class="gate-caret" aria-hidden="true"></span><input id="gate-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste a string" aria-describedby="gate-verdict"></div>
          <div class="gate-fields">
            <span><small>Shape</small><b id="gf-shape">Waiting</b></span>
            <span><small>Register</small><b id="gf-reg">${reg.ca.state === 'stated' ? 'Address stated' : reg.ca.state === 'unconfirmed' ? 'Address unconfirmed' : 'Address absent'}</b></span>
            <span><small>Verdict</small><b id="gf-verdict">Waiting</b></span>
          </div>
          <div class="gate-status" role="status" id="gate-verdict"><span class="spinner" aria-hidden="true"></span><span><strong id="gv-title">Ready</strong><small id="gv-body">Two samples type themselves in. Tap into the field to enter your own.</small></span></div>
          <button type="button" class="btn btn-ghost" id="gate-replay">${I.refresh}Replay samples</button>
        </div>
      </div>
    </div>
  </div>
</section>`;

  const points = [
    [I.tag, 'A label', 'How one agent is told from another.'],
    [I.layers, 'A remit', 'A single responsibility, kept narrow.'],
    [I.refresh, 'A routine', 'Shown once, then repeated without prompting.'],
    [I.link, 'A position in the series', 'Its output feeds whichever agent follows.'],
    [I.eye, 'A visible status', 'Running, waiting or idle, readable at a glance.'],
    [I.clock, 'Its own pace', 'It keeps going behind the scenes.']
  ];
  const agents = `
<section class="section" id="agents">
  <div class="wrap">
    <div class="split">
      <div class="split-copy reveal">
        <span class="eyebrow">Meet an agent</span>
        <h2>A label, a remit, one routine.</h2>
        <p class="lead">Each agent is built around a single responsibility. You set its remit, walk it through the routine once, and from then on it repeats that routine without being asked again.</p>
        <ul class="points">${points.map(([ic, h, b], i) => `<li class="reveal" data-d="${Math.min(i + 1, 6)}"><span class="icon-tile">${ic}</span><span><strong>${h}</strong><small>${b}</small></span></li>`).join('')}</ul>
        <a class="text-link" href="#chains">Watch agents cooperate ${I.arrow}</a>
      </div>
      <div class="split-shot reveal" data-d="2">
        ${windowFrame('Agent · sample', `<div class="agent-solo">${agentCard({ ...SAMPLES[0], status: 'Sample run' })}<dl class="entry"><div><dt>remit</dt><dd>Collector</dd></div><div><dt>routine</dt><dd>Gather each new item</dd></div><div><dt>passes to</dt><dd>Bo, the Analyst</dd></div></dl></div>`)}
        <div class="shot-note reveal" data-d="3">${dot('stated', 'pulse')}A sample. It shows how an agent is described, not a genuine setup.</div>
      </div>
    </div>
    <div class="run-band reveal">
      <div class="run-copy">
        <span class="eyebrow">Two controls</span>
        <h3>Run it. Halt it. Nothing runs unseen.</h3>
        <p>The card beside this text acts out one routine. The two buttons halt it on the spot or send it onward again. All of it happens in this tab.</p>
      </div>
      <div class="run-demo" id="run-demo" data-steps="${esc(STEPS.join('|'))}">
        <div class="run-head"><span class="agent-face" aria-hidden="true">A</span><span class="run-who"><strong>Ada</strong><small>Collector · sample</small></span><span class="run-status" id="run-status">${dot('stated', 'pulse')}<span id="run-status-t">Running</span></span></div>
        <div class="run-task"><span id="run-task">${esc(STEPS[0])}</span><b data-derived id="run-pct">0%</b></div>
        <div class="run-bar" role="progressbar" aria-label="Sample routine progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><i id="run-fill"></i></div>
        <div class="run-controls">
          <button type="button" class="run-btn" id="run-start" aria-label="Start the routine">${I.play}Start</button>
          <button type="button" class="run-btn" id="run-stop" aria-label="Stop the routine">${I.stop}Stop</button>
        </div>
      </div>
    </div>
  </div>
</section>`;

  const tabs = [
    ['one', 'One agent', 'One remit, one routine.', 'Start small. A single agent with a clear remit pays off immediately: it picks up the routine you keep repeating and carries it out alone.',
      `<div class="agent-solo">${agentCard({ ...SAMPLES[0], status: 'Sample run' })}</div>`],
    ['chain', 'A chain', 'Hand the result along.', 'Aim one agent at another and the output of each becomes the input of whichever comes after. The sequence shows who passes what to whom.',
      `<div class="chain-row">${chainRow}</div>`],
    ['crew', 'A workspace', 'See each member of the crew at once.', 'Each agent and each sequence is listed together, with a status beside every label, so a glance shows what is moving.',
      `<ul class="crew">${SAMPLES.map((s, i) => `<li><span class="agent-face" aria-hidden="true">${s.initial}</span><span class="agent-who"><strong>${s.name}</strong><small>${s.role}</small></span><span class="chip s-${i === 2 ? 'absent' : 'stated'}">${dot(i === 2 ? 'absent' : 'stated')}${i === 2 ? 'Waiting' : 'Running'}</span></li>`).join('')}</ul>`]
  ];
  const chains = `
<section class="section section-alt" id="chains">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">Chains</span><h2>From one agent to a crew.</h2><p class="lead">Begin with one routine. Link the agents that follow. Previews use sample cards.</p></div>
    <div class="tabs reveal" data-d="1">
      <div class="tablist" role="tablist" aria-label="Scale of a setup">${tabs.map(([id, label], i) => `<button type="button" role="tab" class="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`).join('')}</div>
      ${tabs.map(([id, , h, p, pv], i) => `<div class="tabpanel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${i ? 'hidden' : ''}>
        <div class="tab-copy"><h3>${h}</h3><p>${p}</p></div>
        ${windowFrame('Preview · sample', pv)}
      </div>`).join('')}
    </div>
  </div>
</section>`;

  const moves = [
    ['Define', 'Name it, narrow it', 'Label the agent and set its remit. A single responsibility reads better than five.'],
    ['Link', 'Point it onward', 'Aim its output at another agent. The sequence makes each hand-off visible.'],
    ['Release', 'Send it off', 'The sequence keeps moving behind the scenes while its status stays on screen.']
  ];
  const method = `
<section class="section" id="method">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">Method</span><h2>Three moves from idea to loop.</h2></div>
    <ol class="moves">${moves.map(([tag, h, b], i) => `<li class="move reveal" data-d="${i + 1}"><span class="node" data-ord>${i + 1}</span><div class="move-card"><span class="tag">${tag}</span><h3>${h}</h3><p>${b}</p></div></li>`).join('')}</ol>
  </div>
</section>`;

  const states = {
    stated: ['An entry with a value or stored URL and a named origin.', 'The slot comes alive. Links open in another tab, copy works, and the handle is read from the URL. The chip turns solid and its dot pulses.'],
    absent: ['An entry nobody has stated yet.', 'The slot holds its place so nothing shifts later, but it ignores clicks and says plainly that it is not stated. The chip shows a hollow ring.'],
    unconfirmed: ['An entry someone mentioned and nobody has backed.', 'It is drawn as an absent one would be: held in place and inert. The chip shows a half ring until a provenance line exists.']
  };
  const registerSec = `
<section class="section section-alt" id="register">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">The register</span><h2>Say only what is on record.</h2><p class="lead">Facts about ${esc(name)} that live outside the product sit in one register. Each is stated, absent or unconfirmed, and the page is drawn accordingly.</p></div>
    <div class="reg-wrap reveal" data-d="1">${windowFrame('Register', `<ul class="reg-list" id="reg-list">${registerRows(reg, ['product', 'domain', 'chain', 'chainid', 'rpc', 'ca', 'access', 'x', 'github'])}</ul>`)}</div>
    <div class="state-cards">${['stated', 'absent', 'unconfirmed'].map((s, i) => `<div class="state-card reveal" data-d="${i + 1}"><span class="chip s-${s}">${dot(s)}${STATE_LABEL[s]}</span><h3>${states[s][0]}</h3><p>${states[s][1]}</p></div>`).join('')}</div>
  </div>
</section>`;

  const tile = (icon, label, value, note, derived = true, d = 1) => `<div class="tile reveal" data-d="${d}"><span class="icon-tile">${icon}</span><span class="tile-body"><small>${label}</small><b${derived ? ' data-derived' : ''}>${value}</b><em>${note}</em></span></div>`;
  const chain = `
<section class="section chain-sec" id="chain">
  <div class="chain-backdrop" aria-hidden="true"></div>
  <div class="wrap">
    <div class="chain-hero">
      <div class="chain-copy reveal"><span class="eyebrow">Solana</span><h2>${esc(chainName)}, and one live read.</h2><p class="lead">${esc(chainName)} and the endpoint were named in a ${esc(reg.chain.source)}, recorded at ${esc(reg.chain.scope)}. The slot below is read from that endpoint, in your browser.</p></div>
      <div class="orbit-stage reveal" data-d="2" aria-hidden="true"><div class="platform"><span class="disc"></span><span class="orbit o1"><i></i></span><span class="orbit o2"><i></i><i></i></span><span class="orbit o3"><i></i></span></div>${brandMark('stage-mark', 160)}</div>
    </div>
    <div class="tiles">
      ${tile(I.layers, 'Stated entries', t.stated, 'on the register', true, 1)}
      ${tile(I.hash, 'Chain id', esc(reg.chainid.value), 'stated, ' + esc(reg.chainid.source), true, 2)}
      ${tile(I.lock, 'Inert entries', t.absent + t.unconfirmed, 'absent or unconfirmed', true, 3)}
            ${tile(I.link, 'Endpoint host', esc(rpcHost), 'stated, ' + esc(reg.rpc.source), false, 4)}
    </div>
    <div class="live reveal" data-d="1" id="live" data-rpc="${esc(isStated(reg.rpc) ? reg.rpc.url : '')}" data-ca="${esc(isStated(reg.ca) ? reg.ca.value : '')}">
      <div class="live-main">
        <div class="live-head"><span class="eyebrow">Live read</span><span class="live-state" id="live-state">${dot('unconfirmed')}<span id="live-state-t">Not read yet</span></span></div>
        <div class="live-slot"><small>Current slot</small><b id="live-slot">–</b></div>
        <p class="live-note" id="live-note">Asks the stated endpoint for the current slot, then again at a calm interval. A failed read is shown as failed, with its time.</p>
        <button type="button" class="btn btn-ghost" id="live-refresh">${I.refresh}Read again</button>
      </div>
      <div class="live-side">
        <div class="live-row"><span>Token supply</span><span id="live-supply" class="live-inert">${isStated(reg.ca) ? 'Reading' : 'Waits for an on-chain address'}</span></div>
        <div class="live-row"><span>Endpoint</span><span>${esc(rpcHost)}</span></div>
        <div class="live-row"><span>Method</span><span>JSON-RPC over HTTPS</span></div>
      </div>
    </div>
  </div>
</section>`;

  const unlock = [
    ['ca', 'The on-chain address lands', 'The top slot fills with the complete string and turns copyable. The gate stops reporting that it has nothing to compare against, and begins calling matches.'],
    ['x', 'The X link lands', 'The icon opens onto the stored URL. The handle appears in its label, read out of that URL, never typed a second time.'],
    ['github', 'The GitHub link lands', 'Same treatment: the Octicon opens onto the stored URL, and the footer follows without any edit.']
  ];
  const phases = `
<section class="section section-alt" id="unlock">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">What unlocks what</span><h2>Statements arrive. The page follows.</h2><p class="lead">Nothing here is edited by hand when a fact lands. The entry changes, and each reader of it changes along.</p></div>
    <ol class="phases">${unlock.map(([k, h, b], i) => `<li class="phase${i === 0 ? ' mission' : ''} reveal" data-d="${i + 1}"><span class="node" data-ord>${i + 1}</span><div class="move-card"><div class="phase-head"><span class="tag">${esc(reg[k].label)}</span>${i === 0 ? '<span class="pill">Gates everything</span>' : ''}<span class="phase-now">${chip(reg[k])}</span></div><h3>${h}</h3><p>${b}</p></div></li>`).join('')}</ol>
  </div>
</section>`;

  const faq = `
<section class="section" id="faq">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">Questions</span><h2>Short answers, all on record.</h2></div>
    <div class="faq-cols reveal">${[FAQ.slice(0, 5), FAQ.slice(5)].map((col) => `<div class="faq-col">${col.map(([q, a], i) => `<details class="faq-item reveal" data-d="${Math.min(i + 1, 6)}"><summary><span>${q}</span>${I.chevron}</summary><p>${a}</p></details>`).join('')}</div>`).join('')}</div>
  </div>
</section>`;

  const open = `
<section class="section section-alt" id="open">
  <div class="wrap">
    <div class="open-band reveal">
      <div class="open-copy"><span class="eyebrow">Open items</span><h2>Waiting on a statement.</h2><p class="lead">Items below derive from the register as the page loads. An entry drops off as soon as it is stated.</p></div>
      <ul class="open-list" id="open-list">${pending.length ? pending.map(([, r], i) => `<li class="reveal" data-d="${Math.min(i + 1, 6)}">${dot(r.state)}<span>${esc(r.label)}</span><span class="open-date">${STATE_LABEL[r.state].toLowerCase()}</span></li>`).join('') : '<li><span>Every entry is stated.</span></li>'}</ul>
    </div>
  </div>
</section>`;

  const footer = `
<footer class="footer">
  <div class="wrap footer-inner">
    <div class="footer-brand reveal">${brandMark('brand-img', 32)}<span><strong>${esc(name)}</strong><small>${esc(reg.domain.value)}</small></span></div>
    <div class="footer-socials reveal" data-d="1" id="footer-socials">${socials(reg)}</div>
    <div class="footer-cols reveal" data-d="2">
      <div><span class="eyebrow">Page</span>${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
      <div><span class="eyebrow">Facts</span><span>${esc(chainName)}</span><span>${esc(rpcHost)}</span><span>Register: <span data-derived>${t.total}</span> entries</span></div>
    </div>
  </div>
</footer>`;

  const tasks = ['Sorting a shared folder', 'Reading a long report', 'Checking the latest draft'];
  const floorRows = SAMPLES.map((s, i) => `<li class="reveal" data-d="${i + 1}" data-run="1"><span class="agent-face" aria-hidden="true">${s.initial}</span><span class="agent-who"><strong>${s.name}</strong><small>${s.role}</small></span><span class="floor-task">${tasks[i]}</span><span class="chip s-stated floor-chip">${dot('stated', 'pulse')}<b>Running</b></span><span class="floor-controls"><button type="button" class="run-btn" data-act="start" aria-label="Start ${s.name}">${I.play}</button><button type="button" class="run-btn" data-act="stop" aria-label="Stop ${s.name}">${I.stop}</button></span></li>`).join('');
  const board = `
<section class="section" id="board">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">Crew board</span><h2>Every agent, one glance.</h2><p class="lead">A single list shows who is moving and who is paused. Halt one, resume one, or switch every agent at once. This board is a sample.</p></div>
    <div class="floor reveal" data-d="1" id="floor">
      <div class="floor-head"><span class="floor-title">Sample crew</span><button type="button" class="floor-all is-stop" id="floor-all">${I.stop}<span>Halt all</span></button></div>
      <ul class="floor-list">${floorRows}</ul>
    </div>
  </div>
</section>`;

  const loop = `
<section class="section section-alt" id="loop">
  <div class="wrap">
    <div class="split">
      <div class="split-copy reveal">
        <span class="eyebrow">Pairing</span>
        <h2>Two agents can argue a result into shape.</h2>
        <p class="lead">One produces, one critiques, and the result travels back and forth until it holds up. Only the version that survives lands on your desk.</p>
        <ul class="points"><li class="reveal" data-d="1"><span class="icon-tile">${I.refresh}</span><span><strong>Repeat on its own</strong><small>The exchange continues without prompting.</small></span></li><li class="reveal" data-d="2"><span class="icon-tile">${I.eye}</span><span><strong>Judge only the end</strong><small>Skip the middle, judge the outcome.</small></span></li></ul>
      </div>
      <div class="split-shot reveal" data-d="2">
        ${windowFrame('Pairing · sample', `<div class="pair"><div class="pair-col">${agentCard({ ...SAMPLES[0], status: 'Drafting' })}</div><div class="pair-mid" aria-hidden="true"><span class="pair-line">${I.arrow}<small>the draft</small></span><span class="pair-line back">${I.arrow}<small>what is off</small></span></div><div class="pair-col">${agentCard({ ...SAMPLES[2], status: 'Reviewing' })}</div></div>`)}
      </div>
    </div>
  </div>
</section>`;

  const buildSteps = [['Do', 'Pull from the source and kick off an export.'], ['Hold', 'Wait until the file has landed.'], ['Think', 'Condense it into three bullet points.'], ['Choose', 'If the drop is large, flag it as urgent.'], ['Ask', 'Present the digest before release.']];
  const build = `
<section class="section" id="build">
  <div class="wrap">
    <div class="section-head center reveal"><span class="eyebrow">Watch a routine form</span><h2>Plain steps, one after another.</h2><p class="lead">An illustrative routine, assembled step by step. It shows how a routine reads when written out; it is not a recorded run.</p></div>
    <div class="buildwrap reveal" data-d="1">${windowFrame('Routine · illustration', `<div class="build" id="build-demo"><ol class="build-steps">${buildSteps.map(([k, t], i) => `<li class="reveal" data-d="${Math.min(i + 1, 6)}" data-step><span class="node" data-ord>${i + 1}</span><span class="build-body"><b class="tag">${k}</b><span>${t}</span></span><span class="build-pct" data-derived>0%</span></li>`).join('')}</ol><div class="build-foot"><div class="run-bar" role="progressbar" aria-label="Illustrative routine progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><i id="build-fill"></i></div><button type="button" class="btn btn-ghost" id="build-replay">${I.refresh}Play again</button></div></div>`)}</div>
  </div>
</section>`;

  const closer = `<section class="section" id="closer"><div class="wrap"><div class="thesis reveal"><p class="thesis-line">Attention is the scarce part. <em>Hand off what remains.</em></p><p class="thesis-body">Every repeated chore you keep doing yourself is time taken from something only you can do. Agents with clear remits carry the repeats, and the register keeps every outside claim honest.</p></div></div></section>`;
  return `${header}<main>${hero}${gate}${agents}${chains}${board}${loop}${build}${method}${registerSec}${chain}${phases}${faq}${closer}${open}</main>${footer}`;
}
