import { esc } from './util.js';
import * as I from './icons.js';
import { isStated, handleOf, hrefOf, hostOf } from './register.js';

export const STATE_LABEL = { stated: 'Stated', absent: 'Absent', unconfirmed: 'Unconfirmed' };

export const dot = (state, cls = '') => `<span class="dot s-${esc(state)} ${cls}" aria-hidden="true"></span>`;

// Reveal helper: stagger index maps to the data-d delay steps in the stylesheet.
export const rv = (i = 0) => (i > 0 ? ` reveal" data-d="${Math.min(i, 6)}` : ' reveal');

export const chip = (rec) =>
  `<span class="chip s-${esc(rec.state)}">${dot(rec.state)}${STATE_LABEL[rec.state] || esc(rec.state)}</span>`;

export function recordValue(rec) {
  if (!isStated(rec)) return '';
  const h = handleOf(rec);
  if (h) return `@${h}`;
  return rec.value ?? hostOf(rec.url) ?? '';
}

// On-chain address slot. Stated: full address, click to copy. Otherwise inert.
export function caSlot(rec) {
  const live = isStated(rec) && !!rec.value;
  const addr = live
    ? `<button type="button" class="ca-value" data-copy="${esc(rec.value)}" aria-label="Copy on-chain address">${esc(rec.value)}</button>`
    : `<span class="ca-value is-inert">${rec.state === 'unconfirmed' ? 'Unconfirmed' : 'Not stated'}</span>`;
  const btn = live
    ? `<button type="button" class="ca-copy" data-copy="${esc(rec.value)}" aria-label="Copy on-chain address">${I.copy}${I.check}<span class="ca-fb" role="status" aria-live="polite"></span></button>`
    : `<button type="button" class="ca-copy" disabled aria-disabled="true" aria-label="Copy on-chain address, unavailable">${I.copy}</button>`;
  return `<div class="ca" id="ca-slot" data-state="${esc(rec.state)}"><span class="ca-label">Contract</span>${addr}${btn}</div>`;
}

// Social icon. Href only when the record is stated. Handle is derived from the stored URL.
export function socialIcon(key, rec, svg, name) {
  const href = hrefOf(rec);
  if (href) {
    const h = handleOf(rec);
    const label = h ? `${name}, @${h}` : name;
    return `<a class="icon-link" data-social="${esc(key)}" href="${esc(href)}" target="_blank" rel="noreferrer noopener" aria-label="${esc(label)}" title="${esc(label)}">${svg}</a>`;
  }
  const label = `${name}, ${rec.state === 'unconfirmed' ? 'unconfirmed' : 'not stated'}`;
  return `<a class="icon-link is-inert" data-social="${esc(key)}" role="link" aria-disabled="true" aria-label="${esc(label)}" title="${esc(label)}">${svg}</a>`;
}

export const socials = (reg) =>
  socialIcon('x', reg.x, I.xMark, 'X') + socialIcon('github', reg.github, I.githubMark, 'GitHub');

export function windowFrame(title, body, extra = '') {
  return `<div class="window ${extra}"><div class="window-bar"><div class="window-lights" aria-hidden="true"><i></i><i></i><i></i></div><div class="window-title">${I.hash}${esc(title)}</div></div>${body}</div>`;
}

export function registerRows(reg, keys) {
  return keys
    .map((k, i) => {
      const r = reg[k];
      const v = recordValue(r);
      return `<li class="reg-row${rv(i % 6 + 1)}" data-key="${esc(k)}"><span class="reg-key">${esc(r.label)}</span><span class="reg-val${v ? '' : ' is-empty'}">${v ? esc(v) : 'No value on record'}</span>${chip(r)}</li>`;
    })
    .join('');
}

export const brandMark = (cls = 'brand-img', size = 32) =>
  `<img class="${cls}" src="./favicon.svg" width="${size}" height="${size}" alt="">`;

export const eq = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';

// Sample agent card. Always marked as a sample: it carries no live data.
export function agentCard({ name, role, initial, status = 'Sample run', live = true }, d = 0) {
  return `<div class="agent reveal"${d ? ` data-d="${Math.min(d, 6)}"` : ''}><span class="agent-face" aria-hidden="true">${esc(initial)}</span><span class="agent-who"><strong>${esc(name)}</strong><small>${esc(role)}</small></span><span class="agent-foot">${dot(live ? 'stated' : 'absent', live ? 'pulse' : '')}<span>${esc(status)}</span>${live ? eq : ''}</span></div>`;
}
