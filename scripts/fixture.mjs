import { randomBytes } from 'node:crypto';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function randomBase58(n) {
  return Array.from(randomBytes(n), (b) => B58[b % 58]).join('');
}

export function randomHandle() {
  return 'h' + randomBytes(5).toString('hex');
}

// Mutation anchors read the record that is current at runtime and force it into the requested state.
// Nothing here assumes which state the register holds today.
export function force(reg, key, state, extra = {}) {
  const cur = reg[key];
  const next = { ...cur, state };
  if (state === 'stated') {
    next.source = 'fixture statement';
    next.scope = null;
    if (key === 'ca') { next.value = extra.value ?? randomBase58(44); next.url = null; }
    else { next.url = extra.url ?? `https://${key === 'x' ? 'x.com' : 'github.com'}/${randomHandle()}`; next.value = null; }
  } else {
    next.value = null;
    next.url = null;
    next.source = null;
  }
  return { ...reg, [key]: next };
}

export function forceAll(reg, state, keys = ['ca', 'x', 'github']) {
  return keys.reduce((acc, k) => force(acc, k, state), reg);
}
