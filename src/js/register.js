// Register: every external fact is one record. state is stated | absent | unconfirmed.
// Only url and value are stored. Handles are derived at render time, never stored.

export const STATES = ['stated', 'absent', 'unconfirmed'];

export const register = {
  name: { label: 'Name', state: 'stated', value: 'OpenHash', url: null, source: 'client statement', scope: null },
  domain: { label: 'Domain', state: 'stated', value: 'openhash.work', url: null, source: 'client statement', scope: null },
  product: { label: 'Product', state: 'stated', value: 'Software agents for repetitive jobs, linked into chains', url: null, source: 'client slides', scope: null },
  chain: { label: 'Chain', state: 'stated', value: 'Solana', url: null, source: 'client statement', scope: 'batch-level' },
  chainid: { label: 'Chain id', state: 'stated', value: '0x65 · 101', url: null, source: 'client statement', scope: 'batch-level' },
  rpc: { label: 'RPC endpoint', state: 'stated', value: null, url: 'https://solana-rpc.publicnode.com', source: 'client statement', scope: 'batch-level' },
  ca: { label: 'On-chain address', state: 'absent', value: null, url: null, source: null, scope: null },
  access: { label: 'Product access', state: 'absent', value: null, url: null, source: null, scope: null },
  x: { label: 'X', state: 'absent', value: null, url: null, source: null, scope: null },
  github: { label: 'GitHub', state: 'absent', value: null, url: null, source: null, scope: null }
};

export function isStated(rec) {
  return !!rec && rec.state === 'stated' && !!(rec.value || rec.url);
}

export function hostOf(url) {
  try { return new URL(url).host; } catch { return null; }
}

// Handle is derived from the stored URL. First path segment, as shown on the platform.
export function handleOf(rec) {
  if (!isStated(rec) || !rec.url) return null;
  try {
    const seg = new URL(rec.url).pathname.split('/').filter(Boolean)[0];
    return seg ? seg : null;
  } catch { return null; }
}

// Href exists only for stated records with a stored http(s) URL.
export function hrefOf(rec) {
  if (!isStated(rec) || !rec.url) return null;
  try {
    const u = new URL(rec.url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
}

export function tally(reg) {
  const out = { stated: 0, absent: 0, unconfirmed: 0, total: 0 };
  for (const rec of Object.values(reg)) {
    out[rec.state] = (out[rec.state] || 0) + 1;
    out.total += 1;
  }
  return out;
}

