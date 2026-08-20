<script setup lang="ts">
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { Expense, ExpenseCategory } from '~/types'
import { CATEGORY_COLORS } from '~/types/constants'

ChartJS.register(ArcElement, Tooltip)

const { t } = useI18n()
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
  const confirmed = window.confirm(t('expenseEdit.deleteConfirm'))
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

const todayIso = new Date().toISOString().slice(0, 10)

// --- Trip-length day counter ("第 3/5 天") — only meaningful when both
// dates are set; shared by the header subtitle and the "行程進度" stat
// tile inside the analysis card. Shown regardless of whether the trip is
// currently ongoing, past, or upcoming — clamped to the [1, total] range. ---
const tripDayCount = computed(() => {
  const { startDate, endDate } = trip.value ?? {}
  if (!startDate || !endDate) return null
  const totalDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
  const elapsed = Math.round((new Date(todayIso).getTime() - new Date(startDate).getTime()) / 86400000) + 1
  const current = Math.min(Math.max(elapsed, 1), totalDays)
  return { current, total: totalDays }
})

// Header subtitle — "8/12 – 8/16 · 第 3/5 天". Only rendered when both
// dates are set (same gate as tripDayCount above); a trip with no dates,
// or only one of the two, shows no subtitle line at all.
const dateRangeLabel = computed(() => {
  const { startDate, endDate } = trip.value ?? {}
  if (!startDate || !endDate) return null
  return `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`
})

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

// Doughnut over a plain pie — on a narrow mobile viewport a ring's arc
// lengths are easier to compare at a glance than a pie's radii meeting at
// a shared center, and the open middle keeps the whole section visually
// lighter. Colors are the same fixed pine ramp as before (never chart.js's
// default palette) — a category keeps the same shade across every trip.
const chartData = computed(() => ({
  labels: categoryEntries.value.map(([cat]) => t(`category.${cat}`)),
  datasets: [{
    data: categoryEntries.value.map(([, amt]) => amt),
    backgroundColor: categoryEntries.value.map(([cat]) => CATEGORY_COLORS[cat]),
    borderColor: '#FFFFFF', // card — visible gap between slices
    borderWidth: 2,
    hoverOffset: 4
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    // Built-in legend is disabled in favor of the custom text legend below
    // the chart — same swatch colors, but with amounts and layout that
    // match the rest of the page instead of chart.js's own legend styling.
    legend: { display: false },
    tooltip: {
      backgroundColor: '#141816',
      titleFont: { family: '"Public Sans"', size: 12 },
      bodyFont: { family: '"IBM Plex Mono"', size: 13, weight: 'bold' as const },
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        title: () => '',
        label: (ctx: { label: string; parsed: number }) =>
          `${ctx.label}　NT$ ${formatMoney(ctx.parsed)}`
      }
    }
  }
}

// --- Progressive disclosure: the category pie + its stat tiles are tucked
// behind a "查看花費分析" toggle, collapsed by default — this is IA
// direction 1c from the redesign doc. The expense list stays always
// visible below it, unlike 1a/1b which show the analysis inline. ---
const showAnalysis = ref(false)

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
      <NuxtLink to="/" :aria-label="$t('common.back')" class="text-ink text-2xl leading-none shrink-0">
        &larr;
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <p class="font-display text-lg font-semibold text-ink truncate">
          {{ trip?.name ?? $t('dashboard.defaultTripName') }}
        </p>
        <p v-if="dateRangeLabel && tripDayCount" class="font-mono text-xs text-muted tracking-wide">
          {{ dateRangeLabel }} · {{ $t('dashboard.dayOf', { current: tripDayCount.current, total: tripDayCount.total }) }}
        </p>
      </div>
      <button
        v-if="trip"
        type="button"
        class="font-body text-xs font-medium text-muted shrink-0"
        @click="showEditTrip = true"
      >
        {{ $t('common.edit') }}
      </button>
    </header>

    <div v-if="!trip" class="ticket p-6 pt-6 text-center">
      <p class="font-body text-sm text-muted">{{ $t('dashboard.notFound') }}</p>
    </div>

    <template v-else>
      <!-- Total spent — big number, with "剩 X" inline on the same row
           (only when a budget is set) and a thin progress bar underneath. -->
      <section>
        <p class="font-body text-xs font-medium text-muted uppercase tracking-wide mb-1">
          {{ $t('dashboard.totalSpent', { currency: trip.homeCurrency }) }}
        </p>
        <div class="flex items-end justify-between gap-3">
          <p class="font-mono text-4xl font-bold text-ink">{{ formatMoney(totalSpent) }}</p>
          <p v-if="hasBudget" class="font-mono text-[13px] font-semibold pb-1" :class="isOverBudget ? 'text-danger' : 'text-muted'">
            {{ isOverBudget ? $t('home.overBudget') : $t('home.remaining') }} {{ formatMoney(Math.abs(budgetRemaining)) }}
          </p>
        </div>
        <div v-if="hasBudget" class="h-1.5 rounded-full bg-line overflow-hidden mt-3">
          <div
            class="h-full rounded-full transition-all"
            :class="isOverBudget ? 'bg-danger' : 'bg-pine'"
            :style="{ width: budgetPercent + '%' }"
          />
        </div>
      </section>

      <!-- Progressive disclosure: collapsed by default, tap to reveal the
           日均花費/行程進度 stat tiles + category pie + legend. -->
      <section class="mt-4 border border-line rounded-xl overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between px-4 py-3.5 bg-card"
          @click="showAnalysis = !showAnalysis"
        >
          <span class="font-body text-sm font-semibold text-ink">{{ $t('dashboard.spendingAnalysis') }}</span>
          <span
            class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent transition-transform"
            :class="showAnalysis ? 'border-b-[6px] border-b-muted' : 'border-t-[6px] border-t-muted'"
          />
        </button>
        <div v-if="showAnalysis" class="px-4 pb-4 pt-1 border-t border-line bg-card">
          <div class="flex gap-3 my-3.5">
            <div class="flex-1 bg-paper border border-line rounded-input p-3">
              <p class="font-body text-[11px] font-medium text-muted uppercase">{{ $t('dashboard.avgPerDay') }}</p>
              <p class="font-mono text-base font-bold text-ink mt-0.5">{{ formatMoney(avgPerDay) }} <span class="font-body text-[11px] font-normal text-muted">{{ trip.homeCurrency }}{{ $t('dashboard.perDay') }}</span></p>
            </div>
            <div v-if="tripDayCount" class="flex-1 bg-paper border border-line rounded-input p-3">
              <p class="font-body text-[11px] font-medium text-muted uppercase">{{ $t('dashboard.dayProgress') }}</p>
              <p class="font-mono text-base font-bold text-ink mt-0.5">{{ $t('dashboard.dayOf', { current: tripDayCount.current, total: tripDayCount.total }) }}</p>
            </div>
          </div>

          <p v-if="categoryEntries.length === 0" class="font-body text-sm text-muted text-center py-4">
            {{ $t('dashboard.noExpenses') }}
          </p>
          <div v-else class="flex gap-4 items-center">
            <!-- The center readout is a plain absolutely-positioned overlay,
                 not a chart.js plugin — same technique as the rest of the
                 app's hand-styled surfaces, and it stays perfectly centered
                 regardless of chart re-renders. -->
            <div class="relative shrink-0" style="width: 96px; height: 96px;">
              <Doughnut :data="chartData" :options="chartOptions" />
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p class="font-mono text-sm font-bold text-ink leading-tight">{{ formatMoney(totalSpent) }}</p>
                <p class="font-body text-[10px] text-muted leading-tight">{{ trip.homeCurrency }}</p>
              </div>
            </div>
            <ul class="flex-1 flex flex-col gap-1.5 min-w-0">
              <li
                v-for="[cat, amt] in categoryEntries"
                :key="cat"
                class="flex items-center gap-2 text-xs"
              >
                <span
                  class="w-2 h-2 rounded-sm shrink-0"
                  :style="{ backgroundColor: CATEGORY_COLORS[cat] }"
                  aria-hidden="true"
                />
                <span class="font-body text-ink flex-1 truncate">{{ $t(`category.${cat}`) }}</span>
                <span class="font-mono text-muted shrink-0">{{ formatMoney(amt) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Expense list, grouped by date — always visible, not tucked
           behind the analysis toggle. -->
      <section class="mt-7">
        <p class="font-body text-sm font-semibold text-ink mb-3.5">{{ $t('dashboard.expenseList') }}</p>
        <p v-if="groupedByDate.length === 0" class="font-body text-sm text-muted text-center py-6">
          {{ $t('dashboard.noExpenses') }}
        </p>
        <div v-for="group in groupedByDate" :key="group.date" class="mb-6">
          <div class="bg-line/40 rounded-lg px-3.5 py-2.5 flex items-center justify-between">
            <p class="font-mono text-[13px] font-bold text-ink">{{ formatDateLabel(group.date) }}</p>
            <p class="font-mono text-[13px] font-semibold text-ink">{{ formatMoney(group.dayTotal) }} {{ trip.homeCurrency }}</p>
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
                  <p class="font-body text-base font-medium text-ink">
                    {{ $t(`category.${e.category}`) }}
                  </p>
                  <p v-if="e.note" class="font-body text-sm text-muted mt-0.5">
                    {{ e.note }}
                  </p>
                  <p class="font-body text-xs text-muted mt-0.5">
                    {{ $t(`payment.${e.paymentMethod}`) }}
                    <span v-if="e.rateIsCached">{{ $t('dashboard.cachedRateSuffix') }}</span>
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-mono text-base font-semibold text-ink">
                    {{ trip.homeCurrency }} {{ formatMoney(e.amountHome) }}
                  </p>
                  <!-- Already in home currency — showing it again as
                       "TWD 5000 / TWD 5000" would be pure noise. -->
                  <p v-if="e.currencyForeign !== trip.homeCurrency" class="font-mono text-sm text-muted mt-0.5">
                    {{ e.currencyForeign }} {{ formatMoney(e.amountForeign) }}
                  </p>
                </div>
              </button>
              <div v-if="expandedExpenseId === e.id" class="flex gap-3 pb-3">
                <button
                  type="button"
                  class="flex-1 font-body text-xs font-semibold text-ink border border-line rounded-input py-2"
                  @click="openEditExpense(e)"
                >
                  {{ $t('common.edit') }}
                </button>
                <button
                  type="button"
                  class="flex-1 font-body text-xs font-semibold text-danger border border-danger rounded-input py-2"
                  @click="confirmDeleteExpense(e)"
                >
                  {{ $t('common.delete') }}
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
        :aria-label="$t('home.quickAdd')"
        class="fixed bottom-6 right-6 w-14 h-14 rounded-hero bg-pine text-white
               font-display text-2xl leading-none shadow-[0_8px_20px_-6px_rgba(31,69,54,0.6)]
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

      <!-- Edit-trip sheet — fixed-height flex column so the field list
           scrolls internally while Save/Delete stay pinned, matching the
           create-trip sheet's structure. -->
      <div
        v-if="showEditTrip"
        class="fixed inset-x-0 z-20 flex items-end justify-center bg-ink/40"
        :style="sheetViewportStyle"
        @click.self="showEditTrip = false"
      >
        <div
          class="w-full max-w-md bg-paper rounded-t-2xl flex flex-col"
          :style="{ maxHeight: sheetMaxHeight }"
        >
          <div class="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
            <h2 class="font-display text-xl font-semibold text-ink">{{ $t('tripForm.editTitle') }}</h2>
            <button
              type="button"
              :aria-label="$t('common.close')"
              class="text-muted text-2xl leading-none"
              @click="showEditTrip = false"
            >
              &times;
            </button>
          </div>
          <TripEditForm
            class="flex-1 min-h-0 px-5 pb-5"
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
