<script setup lang="ts">
import type { Trip } from '~/types'

const props = defineProps<{ trip: Trip }>()

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
  if (startDate) return `${formatMonthDay(startDate)} 起`
  return `至 ${formatMonthDay(endDate as string)}`
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
const isOverBudget = computed(() => hasBudget.value && budgetRemaining.value < 0)
</script>

<template>
  <NuxtLink :to="`/trips/${trip.id}`" class="ticket p-5 pt-5 block">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-display text-lg font-semibold text-ink truncate">{{ trip.name }}</p>
        <p class="font-mono text-xs text-muted mt-1 tracking-wide">
          {{ trip.tripCurrency }} → {{ trip.homeCurrency }}
        </p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-display text-xl font-bold text-ink">{{ formatMoney(totalSpent) }}</p>
        <p class="font-mono text-xs text-muted mt-0.5">{{ trip.homeCurrency }}</p>
      </div>
    </div>
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-line">
      <p class="font-mono text-xs text-muted">
        {{ dateRange ?? '日期未設定' }}
      </p>
      <p
        v-if="hasBudget"
        class="font-mono text-xs"
        :class="isOverBudget ? 'text-danger font-semibold' : 'text-muted'"
      >
        {{ isOverBudget ? '超出' : '剩餘' }} {{ formatMoney(Math.abs(budgetRemaining)) }}
      </p>
    </div>
  </NuxtLink>
</template>
