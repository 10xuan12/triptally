import type { Expense, ExpenseCategory, PaymentMethod } from '~/types'

// Single localStorage key holding all expenses (across every trip) as one
// JSON array, scoped by tripId on read — mirrors useTrips.ts. Never
// read/written directly from a component.
const STORAGE_KEY = 'expenses'

function readExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeExpenses(expenses: Expense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    // Storage full/unavailable — in-memory list is still usable this
    // session, it just won't survive a reload.
  }
}

export interface AddExpenseInput {
  tripId: string
  amountForeign: number
  currencyForeign: string
  rateUsed: number
  amountHome: number
  category: ExpenseCategory
  paymentMethod: PaymentMethod
  date: string
  note?: string
  rateIsCached: boolean
}

// `amountHome` is deliberately absent — it's ALWAYS re-derived as
// `amountForeign * rateUsed` inside updateExpense(), never settable
// directly, so it can never drift out of sync with those two.
//
// `currencyForeign`/`rateUsed`/`rateIsCached` ARE now editable (they
// weren't before this feature), but only to support the amount-currency
// toggle in ExpenseQuickAdd.vue/ExpenseEditSheet.vue: switching to
// homeCurrency hardcodes rateUsed to 1; switching to tripCurrency supplies
// a freshly fetched rate. A plain "just edit the amount/category/etc."
// call — the common case — omits these three entirely, so they fall back
// to the existing record's values below and rateUsed stays exactly as
// frozen. The rule is still "never silently recalculated from a live
// rate" — it only ever changes via this explicit, caller-driven path.
export interface UpdateExpenseInput {
  amountForeign?: number
  currencyForeign?: string
  rateUsed?: number
  rateIsCached?: boolean
  category?: ExpenseCategory
  paymentMethod?: PaymentMethod
  date?: string
  note?: string
}

/**
 * Expenses CRUD backed by the `expenses` localStorage key, scoped by
 * tripId. `rateUsed`/`amountHome` must already be frozen by the caller
 * (see ExpenseQuickAdd.vue, which calls exchangeRateService.getRate()
 * once at save time) — this composable only persists what it's given, it
 * never computes or recalculates a rate itself. That's what keeps a
 * trip's historical totals stable even if live rates move later.
 */
export function useExpenses() {
  const expenses = useState<Expense[]>('expenses', () => [])
  const hydrated = useState('expensesHydrated', () => false)

  // localStorage only exists client-side; hydrate once per app load.
  if (import.meta.client && !hydrated.value) {
    expenses.value = readExpenses()
    hydrated.value = true
  }

  function getExpenses(tripId: string): Expense[] {
    return expenses.value.filter(e => e.tripId === tripId)
  }

  function addExpense(input: AddExpenseInput): Expense {
    const expense: Expense = {
      id: generateId(),
      tripId: input.tripId,
      amountForeign: input.amountForeign,
      currencyForeign: input.currencyForeign,
      rateUsed: input.rateUsed,
      amountHome: input.amountHome,
      category: input.category,
      paymentMethod: input.paymentMethod,
      date: input.date,
      note: input.note,
      rateIsCached: input.rateIsCached
    }
    expenses.value = [expense, ...expenses.value]
    writeExpenses(expenses.value)
    return expense
  }

  function deleteExpense(id: string): void {
    expenses.value = expenses.value.filter(e => e.id !== id)
    writeExpenses(expenses.value)
  }

  // Wholesale replace — backs Settings' 匯入備份 (Stage 6). Caller is
  // responsible for validating shape and confirming with the user before
  // calling this; it does no validation itself and overwrites unconditionally.
  function replaceExpenses(newExpenses: Expense[]): void {
    expenses.value = newExpenses
    writeExpenses(expenses.value)
  }

  /**
   * Edits an existing expense. `amountHome` is NEVER a param and is always
   * re-derived as `amountForeign * rateUsed` below — it can't drift out of
   * sync with those two no matter what the caller passes. `rateUsed` only
   * changes when the caller explicitly supplies a new one (the amount-
   * currency toggle's doing, not a side effect of editing anything else);
   * omit it and it falls straight through from the existing record,
   * exactly as frozen at creation time.
   */
  function updateExpense(id: string, updates: UpdateExpenseInput): Expense | null {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index === -1) return null
    const existing = expenses.value[index]

    const amountForeign = updates.amountForeign ?? existing.amountForeign
    const currencyForeign = updates.currencyForeign ?? existing.currencyForeign
    const rateUsed = updates.rateUsed ?? existing.rateUsed
    const rateIsCached = updates.rateIsCached ?? existing.rateIsCached
    const category = updates.category ?? existing.category
    const paymentMethod = updates.paymentMethod ?? existing.paymentMethod
    const date = updates.date ?? existing.date
    const note = 'note' in updates ? updates.note : existing.note

    const updated: Expense = {
      id: existing.id,
      tripId: existing.tripId,
      amountForeign,
      currencyForeign,
      rateUsed,
      amountHome: amountForeign * rateUsed, // always re-derived, never independently settable
      category,
      paymentMethod,
      date,
      note,
      rateIsCached
    }

    const next = [...expenses.value]
    next[index] = updated
    expenses.value = next
    writeExpenses(expenses.value)
    return updated
  }

  return { expenses, getExpenses, addExpense, deleteExpense, replaceExpenses, updateExpense }
}
