import type { Trip, Expense, ExpenseCategory, PaymentMethod } from '~/types'

// Stage 6 backup file shape. Kept intentionally small and flat — this is a
// local export/import, not an API contract that needs to evolve gracefully,
// but `version` still gives a future migration something to check.
export interface BackupPayload {
  version: 1
  exportedAt: string
  trips: Trip[]
  expenses: Expense[]
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food', 'accommodation', 'transport', 'shopping', 'activities', 'entertainment', 'other'
]
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'credit_card', 'debit_card', 'other']

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isOptionalString(x: unknown): boolean {
  return x === undefined || typeof x === 'string'
}

export function isValidTrip(x: unknown): x is Trip {
  if (!isRecord(x)) return false
  return (
    typeof x.id === 'string' && x.id.length > 0 &&
    typeof x.name === 'string' &&
    typeof x.homeCurrency === 'string' &&
    typeof x.tripCurrency === 'string' &&
    typeof x.createdAt === 'string' &&
    isOptionalString(x.startDate) &&
    isOptionalString(x.endDate) &&
    (x.budget === undefined || typeof x.budget === 'number')
  )
}

export function isValidExpense(x: unknown): x is Expense {
  if (!isRecord(x)) return false
  return (
    typeof x.id === 'string' && x.id.length > 0 &&
    typeof x.tripId === 'string' &&
    typeof x.amountForeign === 'number' &&
    typeof x.currencyForeign === 'string' &&
    typeof x.rateUsed === 'number' &&
    typeof x.amountHome === 'number' &&
    typeof x.category === 'string' && EXPENSE_CATEGORIES.includes(x.category as ExpenseCategory) &&
    typeof x.paymentMethod === 'string' && PAYMENT_METHODS.includes(x.paymentMethod as PaymentMethod) &&
    typeof x.date === 'string' &&
    typeof x.rateIsCached === 'boolean' &&
    isOptionalString(x.note)
  )
}

/**
 * Validates a parsed backup file's *shape* against the Trip/Expense types
 * before anything is written to localStorage — an import must never
 * partially apply or coerce bad data. Every trip and every expense must
 * individually pass, or the whole file is rejected.
 */
export function isValidBackup(x: unknown): x is BackupPayload {
  if (!isRecord(x)) return false
  if (!Array.isArray(x.trips) || !x.trips.every(isValidTrip)) return false
  if (!Array.isArray(x.expenses) || !x.expenses.every(isValidExpense)) return false
  return true
}
