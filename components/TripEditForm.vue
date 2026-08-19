<script setup lang="ts">
import type { Trip } from '~/types'

const props = defineProps<{ trip: Trip }>()
const emit = defineEmits<{ saved: []; cancel: []; deleted: [] }>()

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
    saveError.value = err instanceof Error ? err.message : '更新失敗，請再試一次'
  } finally {
    saving.value = false
  }
}

function handleDelete() {
  // eslint-disable-next-line no-alert -- deliberate native dialog, mirrors Stage 6's import confirm
  const confirmed = window.confirm('這會刪除整個行程與其中所有花費紀錄，無法復原，確定要刪除嗎？')
  if (!confirmed) return
  deleteTrip(props.trip.id) // cascades to every expense under this trip — see useTrips.ts
  emit('deleted')
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSave">
    <div>
      <label class="font-body text-xs font-medium text-muted block mb-1">行程名稱</label>
      <input
        v-model="name"
        type="text"
        class="w-full font-body border border-line rounded-lg px-3 py-2.5 bg-card text-ink outline-none focus:border-pine"
      >
    </div>

    <!-- Currency is intentionally NOT editable here — existing expenses'
         amountHome is frozen against these two currencies, so changing
         either after the fact would silently invalidate every past
         conversion. Shown as plain read-only text, not a disabled input,
         so there's no control to even attempt to edit. -->
    <div class="flex gap-3">
      <div class="flex-1">
        <p class="font-body text-xs font-medium text-muted block mb-1">旅行幣別</p>
        <p class="w-full font-mono border border-line rounded-lg px-3 py-2.5 bg-line/40 text-muted">
          {{ trip.tripCurrency }}
        </p>
      </div>
      <div class="flex-1">
        <p class="font-body text-xs font-medium text-muted block mb-1">本國幣別</p>
        <p class="w-full font-mono border border-line rounded-lg px-3 py-2.5 bg-line/40 text-muted">
          {{ trip.homeCurrency }}
        </p>
      </div>
    </div>

    <div class="flex gap-3">
      <div class="flex-1">
        <label class="font-body text-xs font-medium text-muted block mb-1">開始日期</label>
        <input
          v-model="startDate"
          type="date"
          class="w-full font-mono text-sm border border-line rounded-lg px-3 py-2 bg-card text-ink"
        >
      </div>
      <div class="flex-1">
        <label class="font-body text-xs font-medium text-muted block mb-1">結束日期</label>
        <input
          v-model="endDate"
          type="date"
          class="w-full font-mono text-sm border border-line rounded-lg px-3 py-2 bg-card text-ink"
        >
      </div>
    </div>

    <div>
      <label class="font-body text-xs font-medium text-muted block mb-1">預算（本國幣別）</label>
      <input
        v-model.number="budget"
        type="number"
        min="0"
        placeholder="選填"
        class="w-full font-mono border border-line rounded-lg px-3 py-2 bg-card text-ink"
      >
    </div>

    <p v-if="saveError" class="font-body text-xs text-danger text-center" role="status">
      {{ saveError }}
    </p>

    <div class="flex gap-3 mt-2">
      <button
        type="button"
        class="flex-1 font-body text-sm font-medium text-muted border border-line rounded-lg px-4 py-3"
        @click="emit('cancel')"
      >
        取消
      </button>
      <button
        type="submit"
        :disabled="!canSave"
        class="flex-1 font-body text-sm font-semibold text-white bg-pine rounded-lg px-4 py-3 disabled:opacity-40"
      >
        儲存
      </button>
    </div>

    <button
      type="button"
      class="font-body text-xs text-danger text-center mt-2"
      @click="handleDelete"
    >
      刪除整個行程
    </button>
  </form>
</template>
