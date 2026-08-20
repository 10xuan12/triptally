<script setup lang="ts">
import { fetchRates, getCachedRates } from '~/services/exchangeRateService'

const emit = defineEmits<{
  created: [tripId: string]
  cancel: []
}>()

const { t } = useI18n()
const { createTrip } = useTrips()

const name = ref('')
const tripCurrency = ref('')
const homeCurrency = ref('TWD')
const startDate = ref('')
const endDate = ref('')
const budget = ref<number | null>(null)
const saving = ref(false)
const saveError = ref('')

// Currency options come from the exchange-rate API's own rates object
// (never a hardcoded list, per BUILD_BRIEF). USD is used purely as the
// reference base to enumerate ISO codes — it's unrelated to the trip's
// actual currencies.
const CURRENCY_LIST_BASE = 'USD'
const FALLBACK_CODES = ['TWD', 'THB', 'USD', 'JPY', 'EUR', 'GBP', 'CNY', 'KRW', 'HKD', 'SGD']
const currencyCodes = ref<string[]>([])

onMounted(async () => {
  const cached = getCachedRates(CURRENCY_LIST_BASE)
  if (cached) {
    currencyCodes.value = Object.keys(cached.rates).sort()
    return
  }
  try {
    const snapshot = await fetchRates(CURRENCY_LIST_BASE)
    currencyCodes.value = Object.keys(snapshot.rates).sort()
  } catch {
    // Offline on first-ever use, nothing cached yet — don't block trip
    // creation, just offer a small starter list.
    currencyCodes.value = FALLBACK_CODES
  }
})

const canSave = computed(() =>
  name.value.trim().length > 0 && !!tripCurrency.value && !!homeCurrency.value && !saving.value
)

function handleSave() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    const trip = createTrip({
      name: name.value,
      tripCurrency: tripCurrency.value,
      homeCurrency: homeCurrency.value,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      budget: budget.value ?? undefined
    })
    emit('created', trip.id)
  } catch (err) {
    // A save that silently does nothing is indistinguishable from a frozen
    // button — surface it instead of letting it vanish into the console
    // (which real users, especially on a phone with no devtools attached,
    // will never see).
    saveError.value = err instanceof Error ? err.message : t('tripForm.createFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex flex-col h-full min-h-0" @submit.prevent="handleSave">
    <div class="flex-1 overflow-y-auto flex flex-col gap-5">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="font-body text-[13px] font-semibold text-ink">{{ $t('tripForm.name') }}</label>
          <span class="font-body text-[11px] font-medium text-muted">{{ $t('common.required') }}</span>
        </div>
        <input
          v-model="name"
          type="text"
          autofocus
          :placeholder="$t('tripForm.namePlaceholder')"
          class="w-full font-body border border-line rounded-input px-3.5 py-3.5 bg-card text-ink outline-none focus:border-pine"
        >
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="font-body text-[13px] font-semibold text-ink">{{ $t('tripForm.tripCurrency') }}</label>
          <span class="font-body text-[11px] font-medium text-muted">{{ $t('common.required') }}</span>
        </div>
        <CurrencySelect
          v-model="tripCurrency"
          :label="null"
          :placeholder="$t('tripForm.tripCurrencyPlaceholder')"
          :options="currencyCodes"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="font-body text-[13px] font-semibold text-ink">{{ $t('tripForm.homeCurrency') }}</label>
          <span class="font-body text-[11px] font-medium text-muted">{{ $t('common.required') }}</span>
        </div>
        <CurrencySelect
          v-model="homeCurrency"
          :label="null"
          :placeholder="$t('tripForm.homeCurrencyPlaceholder')"
          :options="currencyCodes"
        />
      </div>

      <details>
        <summary class="font-body text-sm font-semibold text-ink cursor-pointer select-none py-1">
          {{ $t('tripForm.moreOptions') }}
        </summary>
        <div class="mt-4 flex flex-col gap-4">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.startDate') }}</label>
              <input
                v-model="startDate"
                type="date"
                class="w-full font-mono text-sm border border-line rounded-input px-3 py-2.5 bg-card text-ink"
              >
            </div>
            <div class="flex-1">
              <label class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.endDate') }}</label>
              <input
                v-model="endDate"
                type="date"
                class="w-full font-mono text-sm border border-line rounded-input px-3 py-2.5 bg-card text-ink"
              >
            </div>
          </div>
          <div>
            <label class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.budget') }}</label>
            <input
              v-model.number="budget"
              type="number"
              min="0"
              :placeholder="$t('tripForm.budgetPlaceholder')"
              class="w-full font-mono border border-line rounded-input px-3 py-2.5 bg-card text-ink"
            >
          </div>
        </div>
      </details>

      <p v-if="saveError" class="font-body text-xs text-danger text-center">
        {{ saveError }}
      </p>
    </div>

    <div class="pt-4 border-t border-line shrink-0 flex gap-3">
      <button
        type="button"
        class="flex-1 font-body text-sm font-semibold text-ink border border-line rounded-input py-3.5"
        @click="emit('cancel')"
      >
        {{ $t('common.cancel') }}
      </button>
      <button
        type="submit"
        :disabled="!canSave"
        class="flex-1 font-body text-sm font-semibold text-white bg-pine rounded-input py-3.5 disabled:opacity-40"
      >
        {{ $t('tripForm.createTitle') }}
      </button>
    </div>
  </form>
</template>
