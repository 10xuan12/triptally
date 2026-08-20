import type { ExpenseCategory, PaymentMethod } from './index'

// Fixed key lists, in display order — used both to iterate all
// categories/payment methods (e.g. the chip pickers) and as the i18n
// lookup key (`t('category.' + key)`, `t('payment.' + key)`). Labels
// themselves live in i18n/locales/*.json, not here — there's no
// English/Chinese label field on these anymore since the same key needs
// to resolve to whichever language is active.
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food', 'accommodation', 'transport', 'shopping', 'activities', 'entertainment', 'other'
]

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash', 'credit_card', 'debit_card', 'other'
]

// Category-chart colors — a monochrome tint/shade ramp of `pine` (same hue
// family as tailwind.config.ts's pine token), light to dark. Deliberately
// not chart.js's default rainbow palette, and deliberately not `danger`
// (formerly `oxblood`) — that color is reserved for over-budget / alert
// states, not a plain category breakdown. One fixed shade per category
// (not assigned by sort position) so a category keeps the same color
// everywhere it appears.
// Recalibrated for the 2026-08 visual reset to the exact 6-step ramp from
// the redesign doc (#1F4536 pine itself as the darkest step, lightening
// from there); a 7th, darker step was extrapolated beyond pine for the
// 7th category ("other") since the source ramp only needed 6. Still the
// same design intent as before this pass — reused, not reinvented.
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#D8E1DC',
  accommodation: '#AEC5BC',
  transport: '#7D9A8D',
  shopping: '#4C6E5F',
  activities: '#35594A',
  entertainment: '#1F4536',
  other: '#122A21'
}
