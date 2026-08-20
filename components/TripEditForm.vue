<script setup lang="ts">
import type { Trip } from '~/types'

const props = defineProps<{ trip: Trip }>()
const emit = defineEmits<{ saved: []; cancel: []; deleted: [] }>()

const { t } = useI18n()
const { updateTrip, deleteTrip } = useTrips()

const name = ref(props.trip.name)
const startDate = ref(props.trip.startDate ?? '')
const endDate = ref(props.trip.endDate ?? '')
const budget = ref<number | null>(props.trip.budget ?? null)
const saving = ref(false)
const saveError = ref('')

const canSave = computed(() => name.value.trim().length > 0 && !saving.value)

function handleSave() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    updateTrip(props.trip.id, {
      name: name.value,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      budget: budget.value ?? undefined
    })
    emit('saved')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : t('tripForm.updateFailed')
  } finally {
    saving.value = false
  }
}

function handleDelete() {
  // eslint-disable-next-line no-alert -- deliberate native dialog, mirrors Stage 6's import confirm
  const confirmed = window.confirm(t('tripForm.deleteConfirm'))
  if (!confirmed) return
  deleteTrip(props.trip.id) // cascades to every expense under this trip — see useTrips.ts
  emit('deleted')
}
</script>

<template>
  <form class="flex flex-col h-full min-h-0" @submit.prevent="handleSave">
    <div class="flex-1 overflow-y-auto flex flex-col gap-5">
      <div>
        <label class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.name') }}</label>
        <input
          v-model="name"
          type="text"
          class="w-full font-body border border-line rounded-input px-3.5 py-3.5 bg-card text-ink outline-none focus:border-pine"
        >
      </div>

      <!-- Currency is intentionally NOT editable here — existing expenses'
           amountHome is frozen against these two currencies, so changing
           either after the fact would silently invalidate every past
           conversion. Shown as plain read-only text, not a disabled input,
           so there's no control to even attempt to edit. -->
      <div class="flex gap-3">
        <div class="flex-1">
          <p class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.tripCurrency') }}</p>
          <p class="w-full font-mono border border-line rounded-input px-3.5 py-3.5 bg-line/40 text-muted">
            {{ trip.tripCurrency }}
          </p>
        </div>
        <div class="flex-1">
          <p class="font-body text-[13px] font-semibold text-ink block mb-1.5">{{ $t('tripForm.homeCurrency') }}</p>
          <p class="w-full font-mono border border-line rounded-input px-3.5 py-3.5 bg-line/40 text-muted">
            {{ trip.homeCurrency }}
          </p>
        </div>
      </div>

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

      <p v-if="saveError" class="font-body text-xs text-danger text-center">
        {{ saveError }}
      </p>

      <button
        type="button"
        class="font-body text-xs text-danger text-center"
        @click="handleDelete"
      >
        {{ $t('tripForm.deleteTrip') }}
      </button>
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
        {{ $t('common.save') }}
      </button>
    </div>
  </form>
</template>
