import type { ExpenseCategory, PaymentMethod } from './index'

// Plain text labels only — no emoji/icon field. "精簡現代工具" direction
// drops the icon-per-category treatment; category/payment chips carry
// identity through a pine tint background instead (see components using
// these maps).
export const CATEGORY_META: Record<ExpenseCategory, { label: string }> = {
  food: { label: '飲食' },
  accommodation: { label: '住宿' },
  transport: { label: '交通' },
  shopping: { label: '購物' },
  activities: { label: '活動' },
  entertainment: { label: '娛樂' },
  other: { label: '其他' }
}

export const PAYMENT_META: Record<PaymentMethod, { label: string }> = {
  cash: { label: '現金' },
  credit_card: { label: '信用卡' },
  debit_card: { label: '金融卡' },
  other: { label: '其他' }
}

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
