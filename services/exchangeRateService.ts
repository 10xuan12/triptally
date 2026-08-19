import type { CurrencyCode, ExchangeRateSnapshot } from '~/types'

// All exchange-rate network access and localStorage caching goes through
// this module — components/pages must never call fetch() on the rate API
// or touch `rates:*` localStorage keys directly (see BUILD_BRIEF rule #3).

const CACHE_KEY_PREFIX = 'rates:'

interface OpenErApiResponse {
  result: string
  base_code: string
  rates: Record<string, number>
  time_last_update_utc?: string
}

function cacheKey(base: CurrencyCode): string {
  return `${CACHE_KEY_PREFIX}${base}`
}

function readLocalStorage(key: string): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently;
    // the snapshot already returned to the caller is still valid, it just
    // won't be there as an offline fallback next time.
  }
}

/**
 * Fetches fresh rates for `base` from open.er-api.com and caches them to
 * localStorage under `rates:{base}`. Throws on network failure or a
 * non-success API response — `getRate` is the one that adds offline
 * fallback on top of this.
 */
export async function fetchRates(base: CurrencyCode): Promise<ExchangeRateSnapshot> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
  if (!res.ok) {
    throw new Error(`匯率 API 回應錯誤：${res.status}`)
  }

  const data = (await res.json()) as OpenErApiResponse
  if (data.result !== 'success' || !data.rates) {
    throw new Error('匯率 API 回應格式錯誤')
  }

  const snapshot: ExchangeRateSnapshot = {
    baseCurrency: base,
    rates: data.rates,
    fetchedAt: new Date().toISOString()
  }

  writeLocalStorage(cacheKey(base), JSON.stringify(snapshot))

  return snapshot
}

/**
 * Reads the most recently cached rate snapshot for `base`, or `null` if
 * this device has never fetched one successfully.
 */
export function getCachedRates(base: CurrencyCode): ExchangeRateSnapshot | null {
  const raw = readLocalStorage(cacheKey(base))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ExchangeRateSnapshot
  } catch {
    return null
  }
}

/**
 * Resolves the rate to convert 1 unit of `base` into `target`. Tries a
 * live fetch first; on network failure (or a response that's missing
 * `target`, e.g. an unrecognized code) falls back to the most recent
 * cache for `base`. Per the offline rule, a save must never be blocked by
 * a network failure — this only throws when no rate is available at all
 * (never fetched successfully and no cache exists).
 */
export async function getRate(
  base: CurrencyCode,
  target: CurrencyCode
): Promise<{ rate: number; isCached: boolean; fetchedAt: string }> {
  try {
    const snapshot = await fetchRates(base)
    const rate = snapshot.rates[target]
    if (typeof rate === 'number') {
      return { rate, isCached: false, fetchedAt: snapshot.fetchedAt }
    }
    // Target code missing from an otherwise-successful response — fall
    // through to whatever's cached below.
  } catch {
    // Network/API failure — fall through to cache below.
  }

  const cached = getCachedRates(base)
  const cachedRate = cached?.rates[target]
  if (cached && typeof cachedRate === 'number') {
    return { rate: cachedRate, isCached: true, fetchedAt: cached.fetchedAt }
  }

  throw new Error('無法取得匯率，請檢查網路連線')
}
