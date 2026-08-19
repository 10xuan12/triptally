// ISO 4217 currency code, e.g. 'THB', 'TWD', 'JPY'
export type CurrencyCode = string

export type ExpenseCategory =
  | 'food'
  | 'accommodation'
  | 'transport'
  | 'shopping'
  | 'activities'
  | 'entertainment'
  | 'other'

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'other'

/**
 * A single trip. Deliberately minimal per the Founder's decision:
 * only name + currencies are required. Dates and budget are optional
 * so a trip can be created in ~10 seconds before departure.
 */
export interface Trip {
  id: string
  name: string
  homeCurrency: CurrencyCode
  tripCurrency: CurrencyCode
  startDate?: string // ISO date (YYYY-MM-DD)
  endDate?: string
  budget?: number // expressed in homeCurrency
  createdAt: string // ISO datetime
}

/**
 * A single expense. `rateUsed` and `amountHome` are frozen at creation
 * time and must NEVER be recalculated later — this is what keeps a
 * trip's historical totals stable even as live exchange rates move.
 * See README.md → Historical Exchange Rate Rule.
 */
export interface Expense {
  id: string
  tripId: string
  amountForeign: number
  currencyForeign: CurrencyCode
  rateUsed: number // 1 unit of currencyForeign, in homeCurrency, at entry time
  amountHome: number // amountForeign * rateUsed, precomputed and frozen
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  date: string // ISO date (YYYY-MM-DD)
  note?: string
  rateIsCached: boolean // true if a cached/fallback rate was used (offline)
}

/**
 * A real-world cash exchange (e.g. exchanging TWD for THB at a counter).
 * Distinct from the live reference rate — this captures what the
 * traveler actually received, including any fee.
 */
export interface CurrencyExchange {
  id: string
  tripId: string
  homeAmount: number
  foreignAmount: number
  date: string
  fee?: number
  location?: string
  note?: string
}

/**
 * A cached exchange-rate fetch, keyed by base currency. Used to convert
 * new expenses and as an offline fallback when the API is unreachable.
 */
export interface ExchangeRateSnapshot {
  baseCurrency: CurrencyCode
  rates: Record<CurrencyCode, number>
  fetchedAt: string // ISO datetime
}
