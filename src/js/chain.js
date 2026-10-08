// Narrow live reads against the stated RPC endpoint. fetch is injectable so the gates can drive it.

async function rpc(endpoint, method, params, doFetch, signal) {
  const res = await doFetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || 'rpc error');
  return body.result;
}

export async function readSlot(endpoint, doFetch = globalThis.fetch, signal) {
  const slot = await rpc(endpoint, 'getSlot', [{ commitment: 'confirmed' }], doFetch, signal);
  if (typeof slot !== 'number') throw new Error('unexpected reply');
  return slot;
}

// Only called when the register states a on-chain address.
export async function readSupply(endpoint, mint, doFetch = globalThis.fetch, signal) {
  const r = await rpc(endpoint, 'getTokenSupply', [mint], doFetch, signal);
  const v = r && r.value;
  if (!v || typeof v.uiAmountString !== 'string') throw new Error('unexpected reply');
  return v.uiAmountString;
}

export function formatSlot(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

