<script setup lang="ts">
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { Expense, ExpenseCategory } from '~/types'
import { CATEGORY_META, PAYMENT_META, CATEGORY_COLORS } from '~/types/constants'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const route = useRoute()
const tripId = computed(() => route.params.id as string)

const { trips } = useTrips()
const trip = computed(() => trips.value.find(t => t.id === tripId.value) ?? null)

// The floating quick-add entry point, same as the home page's — scoped
// directly to this trip (a single-element array skips ExpenseQuickAdd's
// own trip-picker step). This is what makes the dashboard's "updates
// immediately, no reload" acceptance check actually exercisable: add an
// expense right here and watch the totals/chart/list update live, since
// they all read the same shared useExpenses() state.
const showQuickAdd = ref(false)

const { expenses: allExpenses, deleteExpense } = useExpenses()
const expenses = computed(() => allExpenses.value.filter(e => e.tripId === tripId.value))

// --- Edit trip (name/dates/budget — TripEditForm.vue itself refuses to
// touch currency) ---
const showEditTrip = ref(false)
function handleTripSaved() {
  showEditTrip.value = false
}
function handleTripDeleted() {
  // The trip (and, via useTrips' cascade, every expense under it) is
  // already gone from the store at this point — just leave the page.
  navigateTo('/')
}

// --- Edit / delete a single expense from the list. Tapping a row expands
// it in place to reveal the two actions, rather than a swipe gesture —
// simpler to get right on mobile and avoids the classic "was that a swipe
// or a scroll" ambiguity a hand-rolled swipe-to-reveal would introduce. ---
const expandedExpenseId = ref<string | null>(null)
function toggleExpanded(id: string) {
  expandedExpenseId.value = expandedExpenseId.value === id ? null : id
}

const editingExpense = ref<Expense | null>(null)
function openEditExpense(e: Expense) {
  editingExpense.value = e
  expandedExpenseId.value = null
}
function closeEditExpense() {
  editingExpense.value = null
}

function confirmDeleteExpense(e: Expense) {
  // eslint-disable-next-line no-alert -- deliberate native dialog, mirrors Stage 6's import confirm
  const confirmed = window.confirm('確定要刪除這筆花費紀錄嗎？')
  if (!confirmed) return
  deleteExpense(e.id)
  expandedExpenseId.value = null
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatDateLabel(d: string): string {
  const [, m, day] = d.split('-')
  return `${m}/${day}`
}

// --- Total spent ---
const totalSpent = computed(() => expenses.value.reduce((sum, e) => sum + e.amountHome, 0))

// --- Budget vs remaining — only meaningful (and only rendered) when the
// trip actually has a budget; a trip created without one shows no bar at
// all rather than an empty/zero one. ---
const hasBudget = computed(() => typeof trip.value?.budget === 'number' && trip.value.budget > 0)
const budgetRemaining = computed(() => (trip.value?.budget ?? 0) - totalSpent.value)
const budgetPercent = computed(() => {
  if (!hasBudget.value) return 0
  return Math.min(100, (totalSpent.value / (trip.value!.budget as number)) * 100)
})
const isOverBudget = computed(() => hasBudget.value && budgetRemaining.value < 0)

// --- Average spend per day: trip length if start+end are set, otherwise
// the number of distinct dates that actually have an expense. ---
const avgPerDay = computed(() => {
  if (expenses.value.length === 0) return 0
  const { startDate, endDate } = trip.value ?? {}
  let days: number
  if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime()
    days = Math.max(1, Math.round(ms / 86400000) + 1)
  } else {
    days = new Set(expenses.value.map(e => e.date)).size
  }
  return totalSpent.value / Math.max(1, days)
})

// --- Category breakdown chart ---
const categoryEntries = computed(() => {
  const totals = {} as Record<ExpenseCategory, number>
  for (const e of expenses.value) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amountHome
  }
  return (Object.entries(totals) as [ExpenseCategory, number][])
    .sort((a, b) => b[1] - a[1])
})

const chartData = computed(() => ({
  labels: categoryEntries.value.map(([cat]) => CATEGORY_META[cat].label),
  datasets: [{
    data: categoryEntries.value.map(([, amt]) => amt),
    // Fixed per-category shade (not reassigned by rank) so a category
    // keeps the same color across every trip and every visit.
    backgroundColor: categoryEntries.value.map(([cat]) => CATEGORY_COLORS[cat]),
    borderRadius: 4,
    borderSkipped: 'start' as const, // rounded at the data end, square at the baseline
    barThickness: 20,
    categoryPercentage: 0.7,
    barPercentage: 0.9
  }]
}))

const chartHeight = computed(() => Math.max(120, categoryEntries.value.length * 44))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { right: 12 } },
  plugins: {
    legend: { display: false }, // every bar is already direct-labeled on the axis
    tooltip: {
      backgroundColor: '#141816',
      titleFont: { family: '"IBM Plex Sans"', size: 12 },
      bodyFont: { family: '"IBM Plex Mono"', size: 13, weight: 'bold' as const },
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        title: () => '',
        label: (ctx: { label: string; parsed: { x: number } }) =>
          `${ctx.label}　NT$ ${formatMoney(ctx.parsed.x)}`
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: '#E5E7E3' }, // hairline, one step off the paper surface
      border: { display: false },
      ticks: {
        font: { family: '"IBM Plex Mono"', size: 10 },
        color: '#8A8F89',
        callback: (v: number | string) => formatMoney(Number(v))
      }
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        font: { family: '"IBM Plex Sans"', size: 12 },
        color: '#141816'
      }
    }
  }
}

// --- Expense list, grouped by date, most recent first ---
const groupedByDate = computed(() => {
  const groups = new Map<string, typeof expenses.value>()
  for (const e of expenses.value) {
    if (!groups.has(e.date)) groups.set(e.date, [])
    groups.get(e.date)!.push(e)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items,
      dayTotal: items.reduce((sum, e) => sum + e.amountHome, 0)
    }))
})

// Same keyboard-safety fix as the create-trip sheet on pages/index.vue —
// see that file's comment for the full explanation. Used by the
// edit-trip sheet below.
const sheetViewportStyle = ref<{ top: string; height: string }>({ top: '0px', height: '100vh' })
const sheetMaxHeight = ref('90vh')

function updateSheetViewport() {
  const vv = window.visualViewport
  if (!vv) return
  sheetViewportStyle.value = { top: `${vv.offsetTop}px`, height: `${vv.height}px` }
  sheetMaxHeight.value = `${Math.round(vv.height * 0.9)}px`
}

onMounted(() => {
  updateSheetViewport()
  window.visualViewport?.addEventListener('resize', updateSheetViewport)
  window.visualViewport?.addEventListener('scroll', updateSheetViewport)
})
onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', updateSheetViewport)
  window.visualViewport?.removeEventListener('scroll', updateSheetViewport)
})
</script>

<template>
  <div class="px-5 pt-8 pb-28">
    <header class="flex items-center gap-3 mb-6">
      <NuxtLink to="/" aria-label="返回" class="text-ink text-2xl leading-none">
        &larr;
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <p class="font-display text-lg font-semibold text-ink truncate">
          {{ trip?.name ?? '行程' }}
        </p>
        <p v-if="trip" class="font-mono text-xs text-muted tracking-wide">
          {{ trip.tripCurrency }} → {{ trip.homeCurrency }}
        </p>
      </div>
      <button
        v-if="trip"
        type="button"
        class="font-body text-xs text-muted shrink-0"
        @click="showEditTrip = true"
      >
        編輯
      </button>
    </header>

    <div v-if="!trip" class="ticket p-6 pt-6 text-center">
      <p class="font-body text-sm text-muted">找不到這趟行程。</p>
    </div>

    <template v-else>
      <!-- Total spent — the headline number: heaviest weight the display
           face offers (700 is Space Grotesk's ceiling — already the
           weight being loaded, nothing heavier exists to load), one size
           step up from the rest of the page's figures. -->
      <section class="mb-8">
        <p class="font-body text-xs font-medium text-muted mb-1">總花費（{{ trip.homeCurrency }}）</p>
        <p class="font-display text-5xl font-bold text-ink">{{ formatMoney(totalSpent) }}</p>
      </section>

      <!-- Budget vs remaining — omitted entirely when no budget is set.
           Sections below are separated by a hairline + spacing rather than
           individual bordered boxes. -->
      <section v-if="hasBudget" class="mb-8 pt-8 border-t border-line">
        <div class="flex items-baseline justify-between mb-2">
          <p class="font-body text-xs font-medium text-muted">預算</p>
          <p class="font-mono text-xs text-muted">
            {{ formatMoney(trip.budget as number) }} {{ trip.homeCurrency }}
          </p>
        </div>
        <div class="h-2 rounded-full bg-pine/10 overflow-hidden">
          <div
            class="h-full rounded-full bg-pine transition-all"
            :style="{ width: budgetPercent + '%' }"
          />
        </div>
        <p class="font-mono text-xs mt-2" :class="isOverBudget ? 'text-danger font-semibold' : 'text-muted'">
          {{ isOverBudget ? '已超出' : '剩餘' }}
          {{ formatMoney(Math.abs(budgetRemaining)) }} {{ trip.homeCurrency }}
        </p>
      </section>

      <!-- Average spend per day -->
      <section class="mb-8 pt-8 border-t border-line">
        <p class="font-body text-xs font-medium text-muted mb-1">日均花費</p>
        <p class="font-display text-xl font-semibold text-ink">
          {{ formatMoney(avgPerDay) }} <span class="font-body text-xs font-normal text-muted">{{ trip.homeCurrency }}/天</span>
        </p>
      </section>

      <!-- Category breakdown -->
      <section class="mb-8 pt-8 border-t border-line">
        <p class="font-body text-xs font-medium text-muted mb-4">分類佔比</p>
        <p v-if="categoryEntries.length === 0" class="font-body text-sm text-muted text-center py-6">
          尚無花費紀錄
        </p>
        <div v-else :style="{ height: chartHeight + 'px' }">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </section>

      <!-- Expense list, grouped by date -->
      <section class="pt-8 border-t border-line">
        <p class="font-body text-xs font-medium text-muted mb-4">花費紀錄</p>
        <p v-if="groupedByDate.length === 0" class="font-body text-sm text-muted text-center py-6">
          尚無花費紀錄
        </p>
        <div v-for="group in groupedByDate" :key="group.date" class="mb-6">
          <div class="flex items-baseline justify-between mb-1">
            <p class="font-mono text-xs text-muted">{{ formatDateLabel(group.date) }}</p>
            <p class="font-mono text-xs text-muted">{{ formatMoney(group.dayTotal) }} {{ trip.homeCurrency }}</p>
          </div>
          <div class="flex flex-col divide-y divide-line">
            <div v-for="e in group.items" :key="e.id">
              <!-- Tap the row to reveal 編輯/刪除 — simpler and more
                   reliable on mobile than a hand-rolled swipe gesture. -->
              <button
                type="button"
                class="w-full py-3 flex items-center justify-between gap-3 text-left"
                @click="toggleExpanded(e.id)"
              >
                <div class="min-w-0">
                  <p class="font-body text-sm text-ink">
                    {{ CATEGORY_META[e.category].label }}
                  </p>
                  <p v-if="e.note" class="font-body text-xs text-muted mt-0.5">
                    {{ e.note }}
                  </p>
                  <p class="font-mono text-xs text-muted mt-0.5">
                    {{ PAYMENT_META[e.paymentMethod].label }}
                    <span v-if="e.rateIsCached"> · 快取匯率</span>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-mono text-sm font-semibold text-ink">
                    {{ trip.homeCurrency }} {{ formatMoney(e.amountHome) }}
                  </p>
                  <p class="font-mono text-xs text-muted mt-0.5">
                    {{ trip.tripCurrency }} {{ formatMoney(e.amountForeign) }}
                  </p>
                </div>
              </button>
              <div v-if="expandedExpenseId === e.id" class="flex gap-3 pb-3">
                <button
                  type="button"
                  class="flex-1 font-body text-xs font-medium text-ink border border-line rounded-lg py-2"
                  @click="openEditExpense(e)"
                >
                  編輯
                </button>
                <button
                  type="button"
                  class="flex-1 font-body text-xs font-medium text-danger border border-danger rounded-lg py-2"
                  @click="confirmDeleteExpense(e)"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Floating quick-add button, same as the home page's — scoped
           directly to this trip so it skips the trip-picker step. -->
      <button
        type="button"
        aria-label="快速記帳"
        class="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-pine text-white
               font-display text-3xl leading-none shadow-lg
               flex items-center justify-center active:scale-95 transition-transform"
        @click="showQuickAdd = true"
      >
        +
      </button>

      <ExpenseQuickAdd v-if="showQuickAdd" :trips="[trip]" @close="showQuickAdd = false" />

      <ExpenseEditSheet
        v-if="editingExpense"
        :expense="editingExpense"
        :trip-currency="trip.tripCurrency"
        :home-currency="trip.homeCurrency"
        @saved="closeEditExpense"
        @cancel="closeEditExpense"
      />

      <!-- Edit-trip sheet -->
      <div
        v-if="showEditTrip"
        class="fixed inset-x-0 z-20 flex items-end justify-center bg-ink/40"
        :style="sheetViewportStyle"
        @click.self="showEditTrip = false"
      >
        <div
          class="w-full max-w-md bg-paper rounded-t-2xl p-5 pb-8 overflow-y-auto"
          :style="{ maxHeight: sheetMaxHeight }"
        >
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-display text-xl font-semibold text-ink">編輯行程</h2>
            <button
              type="button"
              aria-label="關閉"
              class="text-muted text-2xl leading-none"
              @click="showEditTrip = false"
            >
              &times;
            </button>
          </div>
          <TripEditForm
            :trip="trip"
            @saved="handleTripSaved"
            @cancel="showEditTrip = false"
            @deleted="handleTripDeleted"
          />
        </div>
      </div>
    </template>
  </div>
</template>
