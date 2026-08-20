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
// everywhere it appears. Kept exactly as originally tuned for contrast
// against the paper surface — unrelated to this pass's palette/ornament
// changes, left untouched per instruction.
// The paper surface is very pale, so a truly light tint of pine reads as
// almost invisible against it (checked: ~1.2:1 contrast at 88% lightness).
// Narrowed the ramp's top end so even the lightest bar stays visibly
// present; the darkest step still clears normal text-contrast levels.
// Every bar also carries a direct category label + hover/tap tooltip + the
// expense list below as a relief channel, per the contrast-vs-surface rule
// for marks with a visible-labels fallback.
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: 'hsl(161, 38%, 72%)',
  accommodation: 'hsl(161, 40%, 60%)',
  transport: 'hsl(161, 42%, 48%)',
  shopping: 'hsl(161, 44%, 38%)',
  activities: 'hsl(161, 46%, 29%)',
  entertainment: 'hsl(161, 48%, 21%)',
  other: 'hsl(161, 50%, 13%)'
}
