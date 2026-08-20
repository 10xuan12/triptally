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
  <form class="flex flex-col gap-4" @submit.prevent="handleSave">
    <div>
      <label class="font-body text-xs font-medium text-muted block mb-1">{{ $t('tripForm.name') }}</label>
      <input
        v-model="name"
        type="text"
        autofocus
        :placeholder="$t('tripForm.namePlaceholder')"
        class="w-full font-body border border-line rounded-lg px-3 py-2.5 bg-card text-ink outline-none focus:border-pine"
      >
    </div>

    <CurrencySelect
      v-model="tripCurrency"
      :label="$t('tripForm.tripCurrency')"
      :placeholder="$t('tripForm.tripCurrencyPlaceholder')"
      :options="currencyCodes"
    />

    <CurrencySelect
      v-model="homeCurrency"
      :label="$t('tripForm.homeCurrency')"
      :placeholder="$t('tripForm.homeCurrencyPlaceholder')"
      :options="currencyCodes"
    />

    <details>
      <summary class="font-body text-sm text-pine cursor-pointer select-none">
        {{ $t('tripForm.moreOptions') }}
      </summary>
      <div class="mt-3 flex flex-col gap-3">
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="font-body text-xs font-medium text-muted block mb-1">{{ $t('tripForm.startDate') }}</label>
            <input
              v-model="startDate"
              type="date"
              class="w-full font-mono text-sm border border-line rounded-lg px-3 py-2 bg-card text-ink"
            >
          </div>
          <div class="flex-1">
            <label class="font-body text-xs font-medium text-muted block mb-1">{{ $t('tripForm.endDate') }}</label>
            <input
              v-model="endDate"
              type="date"
              class="w-full font-mono text-sm border border-line rounded-lg px-3 py-2 bg-card text-ink"
            >
          </div>
        </div>
        <div>
          <label class="font-body text-xs font-medium text-muted block mb-1">{{ $t('tripForm.budget') }}</label>
          <input
            v-model.number="budget"
            type="number"
            min="0"
            :placeholder="$t('tripForm.budgetPlaceholder')"
            class="w-full font-mono border border-line rounded-lg px-3 py-2 bg-card text-ink"
          >
        </div>
      </div>
    </details>

    <p v-if="saveError" class="font-body text-xs text-danger text-center" role="status">
      {{ saveError }}
    </p>

    <div class="flex gap-3 mt-2">
      <button
        type="button"
        class="flex-1 font-body text-sm font-medium text-muted border border-line rounded-lg px-4 py-3"
        @click="emit('cancel')"
      >
        {{ $t('common.cancel') }}
      </button>
      <button
        type="submit"
        :disabled="!canSave"
        class="flex-1 font-body text-sm font-semibold text-white bg-pine rounded-lg px-4 py-3 disabled:opacity-40"
      >
        {{ $t('tripForm.createTitle') }}
      </button>
    </div>
  </form>
</template>
