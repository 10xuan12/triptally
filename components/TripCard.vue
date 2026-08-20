<script setup lang="ts">
import type { Trip } from '~/types'

const props = defineProps<{ trip: Trip }>()

const { t } = useI18n()
const { expenses: allExpenses } = useExpenses()

function formatMonthDay(d: string): string {
  const [, m, day] = d.split('-')
  return `${m}/${day}`
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const dateRange = computed(() => {
  const { startDate, endDate } = props.trip
  if (!startDate && !endDate) return null
  if (startDate && endDate) return `${formatMonthDay(startDate)} – ${formatMonthDay(endDate)}`
  if (startDate) return t('home.dateFrom', { date: formatMonthDay(startDate) })
  return t('home.dateUntil', { date: formatMonthDay(endDate as string) })
})

// Live totals so the trip list is useful at a glance without opening the
// dashboard — reads the same shared useExpenses() state, so this updates
// immediately whenever an expense is added/changed anywhere in the app.
const totalSpent = computed(() =>
  allExpenses.value
    .filter(e => e.tripId === props.trip.id)
    .reduce((sum, e) => sum + e.amountHome, 0)
)
const hasBudget = computed(() => typeof props.trip.budget === 'number' && props.trip.budget > 0)
const budgetRemaining = computed(() => (props.trip.budget ?? 0) - totalSpent.value)
const budgetPercent = computed(() => {
  if (!hasBudget.value) return 0
  return Math.min(100, (totalSpent.value / (props.trip.budget as number)) * 100)
})
const isOverBudget = computed(() => hasBudget.value && budgetRemaining.value < 0)

// Purely presentational — derived from the trip's own dates, no new stored
// field. "Ended"/"Upcoming" only show once a date has actually passed/not
// arrived yet; a trip with no dates at all shows no status pill.
const todayIso = new Date().toISOString().slice(0, 10)
const tripStatus = computed<'ongoing' | 'ended' | 'upcoming' | null>(() => {
  const { startDate, endDate } = props.trip
  if (!startDate && !endDate) return null
  if (endDate && endDate < todayIso) return 'ended'
  if (startDate && startDate > todayIso) return 'upcoming'
  return 'ongoing'
})
const statusLabel = computed(() => {
  if (tripStatus.value === 'ended') return t('home.statusEnded')
  if (tripStatus.value === 'upcoming') return t('home.statusUpcoming')
  if (tripStatus.value === 'ongoing') return t('home.statusOngoing')
  return ''
})
</script>

<template>
  <NuxtLink :to="`/trips/${trip.id}`" class="bg-card border border-line rounded-card p-4 block">
    <div class="flex items-baseline justify-between gap-3">
      <p class="font-display text-[17px] font-semibold text-ink truncate">{{ trip.name }}</p>
      <p class="font-mono text-xs font-semibold text-muted shrink-0">
        {{ trip.tripCurrency }} → {{ trip.homeCurrency }}
      </p>
    </div>
    <p class="font-mono text-[13px] text-muted mt-0.5">
      {{ dateRange ?? t('home.dateNotSet') }}
    </p>

    <div class="mt-3.5">
      <p class="font-body text-[11px] font-medium text-muted uppercase tracking-wide">{{ t('home.spentLabel') }}</p>
      <p class="font-mono text-[26px] font-bold text-ink mt-0.5">{{ formatMoney(totalSpent) }}</p>
    </div>

    <template v-if="hasBudget">
      <div class="h-1.5 rounded-full bg-line overflow-hidden mt-3">
        <div class="h-full rounded-full bg-pine transition-all" :style="{ width: budgetPercent + '%' }" />
      </div>
      <div class="flex items-center justify-between mt-2">
        <p class="font-mono text-[13px] font-medium" :class="isOverBudget ? 'text-danger' : 'text-muted'">
          {{ isOverBudget ? t('home.overBudget') : t('home.remaining') }} {{ formatMoney(Math.abs(budgetRemaining)) }}
        </p>
        <p v-if="statusLabel" class="font-body text-xs text-muted">{{ statusLabel }}</p>
      </div>
    </template>
    <p v-else-if="statusLabel" class="font-body text-xs text-muted mt-3">{{ statusLabel }}</p>
  </NuxtLink>
</template>
