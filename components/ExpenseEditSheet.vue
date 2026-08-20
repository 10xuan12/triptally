<script setup lang="ts">
import type { Expense, ExpenseCategory, PaymentMethod } from '~/types'
import { CATEGORY_META, PAYMENT_META } from '~/types/constants'
import { getRate } from '~/services/exchangeRateService'

const props = defineProps<{
  expense: Expense
  tripCurrency: string
  homeCurrency: string
}>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const { updateExpense } = useExpenses()

const amountText = ref(String(props.expense.amountForeign))
const amountValue = computed(() => {
  const n = parseFloat(amountText.value)
  return Number.isFinite(n) && n > 0 ? n : 0
})
const category = ref<ExpenseCategory>(props.expense.category)
const paymentMethod = ref<PaymentMethod>(props.expense.paymentMethod)
const date = ref(props.expense.date)
const note = ref(props.expense.note ?? '')
const saving = ref(false)
const saveError = ref('')

// Which currency the amount is in — initialized from how this expense was
// actually recorded, not assumed to be tripCurrency (it may have been
// logged in homeCurrency, e.g. a flight paid before departure).
const initialMode: 'trip' | 'home' = props.expense.currencyForeign === props.homeCurrency ? 'home' : 'trip'
const amountCurrencyMode = ref<'trip' | 'home'>(initialMode)

// The rate to use while in 'trip' mode. If this expense was already in
// trip currency, its own rateUsed IS that historical rate — reuse it
// as-is, no fetch. Only when the user actively switches INTO trip mode
// from an expense that was never in trip currency (so no historical trip
// rate exists to reuse) do we fetch one — and even then, only once; it's
// cached here for the rest of this edit, not refetched per keystroke.
const tripRateInfo = ref<{ rate: number; isCached: boolean } | null>(
  initialMode === 'trip' ? { rate: props.expense.rateUsed, isCached: props.expense.rateIsCached } : null
)
const rateError = ref('')
const loadingRate = ref(false)

async function ensureTripRate() {
  if (tripRateInfo.value || loadingRate.value) return
  loadingRate.value = true
  rateError.value = ''
  try {
    tripRateInfo.value = await getRate(props.tripCurrency, props.homeCurrency)
  } catch (err) {
    rateError.value = err instanceof Error ? err.message : '無法取得匯率，請檢查網路連線'
  } finally {
    loadingRate.value = false
  }
}

watch(amountCurrencyMode, (mode) => {
  if (mode === 'trip') ensureTripRate()
})

// Preview only — the actual write happens inside updateExpense(), which
// re-derives amountHome from whichever rate is actually used. Never a live
// re-fetch just because the amount changed: editing it while staying in
// the same currency mode must not let a newer exchange rate creep into a
// historical record. See composables/useExpenses.ts.
const previewHomeAmount = computed(() => {
  if (amountValue.value <= 0) return 0
  if (amountCurrencyMode.value === 'home') return amountValue.value
  if (!tripRateInfo.value) return 0
  return amountValue.value * tripRateInfo.value.rate
})

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

const canSave = computed(() =>
  amountValue.value > 0 &&
  (amountCurrencyMode.value === 'home' || !!tripRateInfo.value) &&
  !saving.value
)

function handleSave() {
  if (!canSave.value) return
  const isHome = amountCurrencyMode.value === 'home'
  if (!isHome && !tripRateInfo.value) return
  saving.value = true
  saveError.value = ''
  try {
    updateExpense(props.expense.id, {
      amountForeign: amountValue.value,
      currencyForeign: isHome ? props.homeCurrency : props.tripCurrency,
      rateUsed: isHome ? 1 : tripRateInfo.value!.rate,
      rateIsCached: isHome ? false : tripRateInfo.value!.isCached,
      category: category.value,
      paymentMethod: paymentMethod.value,
      date: date.value,
      note: note.value.trim() || undefined
    })
    emit('saved')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : '更新失敗，請再試一次'
  } finally {
    saving.value = false
  }
}

// Same keyboard-safety fix as ExpenseQuickAdd.vue — see that file's comment
// for the full explanation (iOS doesn't shrink the layout viewport for the
// on-screen keyboard, so a fixed sheet needs to track visualViewport itself
// or its lower fields/the save button end up hidden underneath it).
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
      <button type="button" aria-label="取消" class="text-muted text-2xl leading-none" @click="emit('cancel')">
        &times;
      </button>
      <p class="font-mono text-xs text-muted uppercase tracking-widest">編輯花費</p>
      <span class="w-6" aria-hidden="true" />
    </header>

    <form class="px-5 flex-1 flex flex-col gap-4 pb-6 overflow-y-auto min-h-0" @submit.prevent="handleSave">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="font-body text-xs font-medium text-muted">金額</label>
          <div class="flex gap-1.5">
            <button
              type="button"
              class="font-mono text-xs rounded-lg px-2.5 py-1 border"
              :class="amountCurrencyMode === 'trip' ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'"
              @click="amountCurrencyMode = 'trip'"
            >
              {{ tripCurrency }}
            </button>
            <button
              type="button"
              class="font-mono text-xs rounded-lg px-2.5 py-1 border"
              :class="amountCurrencyMode === 'home' ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'"
              @click="amountCurrencyMode = 'home'"
            >
              {{ homeCurrency }}
            </button>
          </div>
        </div>
        <input
          v-model="amountText"
          type="text"
          inputmode="decimal"
          class="w-full font-display text-5xl font-semibold text-ink bg-transparent outline-none border-b-2 border-line focus:border-pine pb-2"
        >
        <p v-if="amountCurrencyMode === 'trip'" class="font-mono text-sm text-muted mt-2 min-h-[1.25em]">
          <template v-if="amountValue > 0 && tripRateInfo">
            {{ tripCurrency }} {{ formatNumber(amountValue) }} ≈ {{ homeCurrency }} {{ formatNumber(previewHomeAmount) }}
          </template>
        </p>
        <template v-if="amountCurrencyMode === 'trip'">
          <p v-if="rateError" class="font-body text-xs text-danger mt-1">{{ rateError }}</p>
          <p v-else-if="loadingRate" class="font-mono text-xs text-muted mt-1">正在取得匯率…</p>
          <p v-else-if="tripRateInfo" class="font-mono text-xs text-muted mt-1">
            {{ initialMode === 'trip' ? '匯率沿用建立時凍結的值，不會重新計算' : '已取得目前匯率並凍結，往後編輯不會再變動' }}
          </p>
        </template>
      </div>

      <div>
        <p class="font-body text-xs font-medium text-muted mb-2">分類</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(meta, key) in CATEGORY_META"
            :key="key"
            type="button"
            class="font-body text-sm rounded-lg px-3 py-1.5 border"
            :class="category === key ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'"
            @click="category = key as ExpenseCategory"
          >
            {{ meta.label }}
          </button>
        </div>
      </div>

      <div>
        <p class="font-body text-xs font-medium text-muted mb-2">付款方式</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(meta, key) in PAYMENT_META"
            :key="key"
            type="button"
            class="font-body text-sm rounded-lg px-3 py-1.5 border"
            :class="paymentMethod === key ? 'bg-pine text-white border-pine' : 'bg-pine/10 text-pine border-pine/20'"
            @click="paymentMethod = key as PaymentMethod"
          >
            {{ meta.label }}
          </button>
        </div>
      </div>

      <div>
        <label class="font-body text-xs font-medium text-muted block mb-2">日期</label>
        <input
          v-model="date"
          type="date"
          class="w-full font-mono border border-line rounded-lg px-3 py-2 bg-card text-ink"
        >
      </div>

      <div>
        <label class="font-body text-xs font-medium text-muted block mb-2">備註</label>
        <input
          v-model="note"
          type="text"
          placeholder="備註（選填）"
          class="w-full font-body border border-line rounded-lg px-3 py-2 bg-card text-ink"
        >
      </div>

      <p v-if="saveError" class="font-body text-xs text-danger text-center" role="status">
        {{ saveError }}
      </p>

      <div class="mt-auto pt-2 shrink-0">
        <button
          type="submit"
          :disabled="!canSave"
          class="w-full font-body text-base font-semibold text-white bg-pine rounded-lg py-4 disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          儲存
        </button>
      </div>
    </form>
  </div>
</template>
