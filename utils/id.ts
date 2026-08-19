// `crypto.randomUUID()` is spec-restricted to secure contexts (https, or
// localhost) — it simply doesn't exist as a function anywhere else. That
// includes the very common case of testing on a phone against a dev
// server over plain HTTP via the machine's LAN IP (e.g. http://10.x.x.x:3000),
// which has no certificate and isn't `localhost` from the phone's point of
// view. Calling it there throws synchronously, and since callers here save
// records inside a plain try/finally (no catch), the exception aborts the
// save silently from the user's perspective — the sheet just never closes.
//
// `crypto.getRandomValues()` has no such restriction, so prefer
// `randomUUID()` when it's available and build an equivalent UUID v4 from
// `getRandomValues()` otherwise. IDs here are only ever used as local
// unique keys (never security-sensitive), so this is a correctness fix,
// not a security downgrade.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // No Web Crypto API at all (shouldn't happen in any modern browser) —
  // last-resort fallback so a save can never hard-fail on ID generation.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
