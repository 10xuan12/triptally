<script setup lang="ts">
import type { Trip, ExpenseCategory, PaymentMethod } from '~/types'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '~/types/constants'
import { getRate } from '~/services/exchangeRateService'

// The core interaction of the whole app: amount → category → payment →
// save, reachable with no scrolling, in well under 10 seconds. After
// saving, the form resets and stays open on the same trip so the next
// expense can be logged immediately — see handleSave().

const props = defineProps<{ trips: Trip[] }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const { addExpense } = useExpenses()

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// If there's only one trip, skip straight to the form — no picker step,
// per BUILD_BRIEF: "don't add friction if there's only one active trip".
const selectedTripId = ref<string | null>(props.trips.length === 1 ? props.trips[0].id : null)
const selectedTrip = computed(() => props.trips.find(t => t.id === selectedTripId.value) ?? null)

const amountInputEl = ref<HTMLInputElement | null>(null)
const amountText = ref('')
const amountValue = computed(() => {
  const n = parseFloat(amountText.value)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const category = ref<ExpenseCategory | null>(null)
const paymentMethod = ref<PaymentMethod | null>(null)
const date = ref(todayISO())
// Optional — collapsed behind a "+ 加備註" link by default so it never
// competes with the required fields; never part of canSave.
const note = ref('')
const showNoteInput = ref(false)
const saving = ref(false)
const savedMessage = ref('')
const saveError = ref('')

// Which currency the amount above is entered in. Real trips often need
// entries in the home currency too — pre-booked flights/hotels paid before
// departure, in home-currency card statements — where a trip→home rate
// isn't just unnecessary, it'd be wrong to apply one to an amount that was
// never actually in the trip currency.
const amountCurrencyMode = ref<'trip' | 'home'>('trip')

// Rate is fetched once per selected trip (not per keystroke) and reused
// for every expense saved in this session, per BUILD_BRIEF Stage 4 §3.
// Only meaningful in 'trip' mode — home-currency entries are always a
// trivial 1:1, no fetch involved at all.
const rateInfo = ref<{ rate: number; isCached: boolean; fetchedAt: string } | null>(null)
const rateError = ref('')

async function loadRate(trip: Trip) {
  rateError.value = ''
  rateInfo.value = null
  try {
    rateInfo.value = await getRate(trip.tripCurrency, trip.homeCurrency)
  } catch (err) {
    // No live rate AND no cache anywhere for this pair yet (first-ever
    // use, offline) — nothing to freeze into the expense, so Save stays
    // disabled with a clear reason. Everyday offline use is unaffected:
    // once any cache exists, getRate() already falls back to it and
    // never reaches this branch.
    rateError.value = err instanceof Error ? err.message : t('quickAdd.rateError')
  }
}

// Fetched regardless of which mode is currently active, so the rate is
// already sitting there ready the moment the user switches to 'trip' mode.
watch(selectedTrip, (trip) => {
  if (trip) loadRate(trip)
}, { immediate: true })

const previewHomeAmount = computed(() => {
  if (amountValue.value <= 0) return 0
  if (amountCurrencyMode.value === 'home') return amountValue.value
  if (!rateInfo.value) return 0
  return amountValue.value * rateInfo.value.rate
})

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

const canSave = computed(() =>
  !!selectedTrip.value &&
  amountValue.value > 0 &&
  !!category.value &&
  !!paymentMethod.value &&
  (amountCurrencyMode.value === 'home' || !!rateInfo.value) &&
  !saving.value
)

function resetForNextExpense() {
  amountText.value = ''
  category.value = null
  paymentMethod.value = null
  date.value = todayISO()
  note.value = ''
  showNoteInput.value = false
  amountCurrencyMode.value = 'trip'
  // Deliberately keep selectedTrip + rateInfo as-is — re-picking the trip
  // or re-fetching the rate for every single expense would add exactly
  // the friction Stage 4 is trying to eliminate.
}

async function handleSave() {
  if (!canSave.value || !selectedTrip.value) return
  const isHome = amountCurrencyMode.value === 'home'
  if (!isHome && !rateInfo.value) return
  saving.value = true
  saveError.value = ''
  try {
    addExpense({
      tripId: selectedTrip.value.id,
      amountForeign: amountValue.value,
      currencyForeign: isHome ? selectedTrip.value.homeCurrency : selectedTrip.value.tripCurrency,
      rateUsed: isHome ? 1 : rateInfo.value!.rate,
      amountHome: isHome ? amountValue.value : amountValue.value * rateInfo.value!.rate,
      category: category.value!,
      paymentMethod: paymentMethod.value!,
      date: date.value,
      note: note.value.trim() || undefined,
      rateIsCached: isHome ? false : rateInfo.value!.isCached
    })
    savedMessage.value = t('quickAdd.saved')
    resetForNextExpense()
    setTimeout(() => { savedMessage.value = '' }, 1500)
    await nextTick()
    amountInputEl.value?.focus()
  } catch (err) {
    // Same principle as TripCreateForm.vue: a save that silently does
    // nothing is indistinguishable from a frozen button — surface it.
    saveError.value = err instanceof Error ? err.message : t('quickAdd.saveFailed')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('close')
}

// Same issue as the create-trip sheet (pages/index.vue): this view is
// `fixed inset-0`, and the amount input's `autofocus` means the on-screen
// keyboard opens essentially immediately on mount. iOS Safari (and Android
// in "overlay" keyboard mode) doesn't shrink the layout viewport for the
// keyboard, so `inset-0`/`min-h-screen` stay anchored to the full,
// keyboard-covered screen — the 分類/付款方式/日期 fields and the 儲存
// button end up rendered underneath the keyboard: present in the DOM,
// invisible, untappable. Track the visual viewport and resize this view's
// box to match it, same fix as the create-trip sheet.
const viewportStyle = ref<{ top: string; height: string }>({ top: '0px', height: '100vh' })

function updateViewportStyle() {
  const vv = window.visualViewport
  if (!vv) return
  viewportStyle.value = { top: `${vv.offsetTop}px`, height: `${vv.height}px` }
}

onMounted(() => {
  updateViewportStyle()
  window.visualViewport?.addEventListener('resize', updateViewportStyle)
  window.visualViewport?.addEventListener('scroll', updateViewportStyle)
})
onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', updateViewportStyle)
  window.visualViewport?.removeEventListener('scroll', updateViewportStyle)
})
</script>

<template>
  <div class="fixed inset-x-0 z-30 bg-paper flex flex-col" :style="viewportStyle">
    <header class="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
      <button type="button" :aria-label="$t('common.close')" class="text-muted text-2xl leading-none" @click="handleClose">&times;</button>
      <p v-if="selectedTrip" class="font-mono text-xs text-muted uppercase tracking-widest">{{ selectedTrip.name }}</p>
      <span class="w-6" aria-hidden="true" />
    </header>
    <div v-if="!selectedTrip" class="px-5 flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
      <p class="font-body text-sm text-muted mb-1">{{ $t('quickAdd.selectTrip') }}</p>
      <button v-for="trip in trips" :key="trip.id" type="button" class="ticket p-4 pt-4 text-left" @click="selectedTripId = trip.id">
        <p class="font-display text-base font-semibold text-ink">{{ trip.name }}</p>
        <p class="font-mono text-xs text-muted mt-1">{{ trip.tripCurrency }} → {{ trip.homeCurrency }}</p>
      </button>
      <p v-if="trips.length === 0" class="font-body text-sm text-muted">{{ $t('quickAdd.noTrips') }}</p>
    </div>
    <form v-else class="px-5 flex-1 flex flex-col gap-4 pb-6 overflow-y-auto min-h-0" @submit.prevent="handleSave">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-body text-xs font-medium text-muted">{{ $t('quickAdd.amount') }}</label>
          <div class="flex gap-1.5">
            <button type="button" class="font-mono text-xs rounded-lg px-2.5 py-1 border" :class="amountCurrencyMode === 'trip' ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'" @click="amountCurrencyMode = 'trip'">{{ selectedTrip.tripCurrency }}</button>
            <button type="button" class="font-mono text-xs rounded-lg px-2.5 py-1 border" :class="amountCurrencyMode === 'home' ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'" @click="amountCurrencyMode = 'home'">{{ selectedTrip.homeCurrency }}</button>
          </div>
        </div>
        <input ref="amountInputEl" v-model="amountText" type="text" inputmode="decimal" autofocus placeholder="0" class="w-full font-display text-5xl font-semibold text-ink bg-transparent outline-none border-b-2 border-line focus:border-pine pb-2">
        <p v-if="amountCurrencyMode === 'trip'" class="font-mono text-sm text-muted mt-2 min-h-[1.25em]">
          <template v-if="amountValue > 0 && rateInfo">{{ selectedTrip.tripCurrency }} {{ formatNumber(amountValue) }} ≈ {{ selectedTrip.homeCurrency }} {{ formatNumber(previewHomeAmount) }}</template>
        </p>
        <p v-if="amountCurrencyMode === 'trip' && rateError" class="font-body text-xs text-danger mt-1">{{ rateError }}</p>
        <p v-else-if="amountCurrencyMode === 'trip' && rateInfo?.isCached" class="font-mono text-xs text-muted mt-1">{{ $t('quickAdd.cachedRate') }} · {{ formatTime(rateInfo.fetchedAt) }}</p>
      </div>
      <div>
        <p class="font-body text-xs font-medium text-muted mb-2">{{ $t('quickAdd.category') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="key in EXPENSE_CATEGORIES" :key="key" type="button" class="font-body text-sm rounded-lg px-3 py-1.5 border" :class="category === key ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'" @click="category = key">{{ $t(`category.${key}`) }}</button>
        </div>
      </div>
      <div>
        <p class="font-body text-xs font-medium text-muted mb-2">{{ $t('quickAdd.paymentMethod') }}</p>
        <div class="flex flex-wrap gap-2">
          <button v-for="key in PAYMENT_METHODS" :key="key" type="button" class="font-body text-sm rounded-lg px-3 py-1.5 border" :class="paymentMethod === key ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'" @click="paymentMethod = key">{{ $t(`payment.${key}`) }}</button>
        </div>
      </div>
      <div>
        <label class="font-body text-xs font-medium text-muted block mb-2">{{ $t('quickAdd.date') }}</label>
        <input v-model="date" type="date" class="w-full font-mono border border-line rounded-lg px-3 py-2 bg-card text-ink">
      </div>
      <div>
        <button v-if="!showNoteInput" type="button" class="font-body text-xs text-pine" @click="showNoteInput = true">{{ $t('quickAdd.addNote') }}</button>
        <input v-else v-model="note" type="text" :placeholder="$t('quickAdd.notePlaceholder')" class="w-full font-body border border-line rounded-lg px-3 py-2 bg-card text-ink">
      </div>
      <p v-if="savedMessage" class="font-body text-xs text-pine text-center" role="status">{{ savedMessage }}</p>
      <p v-if="saveError" class="font-body text-xs text-danger text-center" role="status">{{ saveError }}</p>
      <div class="mt-auto pt-2 shrink-0">
        <button type="submit" :disabled="!canSave" class="w-full font-body text-base font-semibold text-white bg-pine rounded-lg py-4 disabled:opacity-40 active:scale-[0.98] transition-transform">{{ $t('common.save') }}</button>
      </div>
    </form>
  </div>
</template>
