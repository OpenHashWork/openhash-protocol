// Gate: address-shaped strings are matched against the stated registry. Base58 is never blanket-rejected.

const B58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const MIN = 32;
const MAX = 44;

export function isAddressShaped(input) {
  const s = String(input ?? '').trim();
  return s.length >= MIN && s.length <= MAX && B58.test(s);
}

// kinds: empty | not-address-shaped | no-registry | match | differs
export function classify(input, reg) {
  const s = String(input ?? '').trim();
  if (!s) return { kind: 'empty', input: s };
  if (!isAddressShaped(s)) return { kind: 'not-address-shaped', input: s };
  const ca = reg.ca;
  const stated = ca && ca.state === 'stated' && typeof ca.value === 'string' && ca.value.length > 0;
  if (!stated) return { kind: 'no-registry', input: s };
  return { kind: s === ca.value ? 'match' : 'differs', input: s };
}
