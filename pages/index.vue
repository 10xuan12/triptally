<script setup lang="ts">
const { trips } = useTrips()
const showCreate = ref(false)
const showQuickAdd = ref(false)

function handleCreated() {
  showCreate.value = false
}

// The create-trip sheet is a `fixed inset-0` overlay bottom-anchored via
// `items-end`. On mobile, `inset-0`/`vh` sizing is computed against the
// *layout* viewport, which iOS Safari (and Android in "overlay" keyboard
// mode) does NOT shrink when the on-screen keyboard opens — only
// `window.visualViewport` reports the actually-visible area. Left alone,
// the sheet keeps anchoring to the full, keyboard-covered screen, so its
// lower half (the currency dropdown, the 建立行程 submit button) renders
// underneath the keyboard: present in the DOM, invisible, untappable.
// Track the visual viewport and reposition/resize the sheet's containing
// box to match it, so "bottom of the sheet" always means "bottom of what's
// actually visible."
const sheetViewportStyle = ref<{ top: string; height: string }>({ top: '0px', height: '100vh' })
// Cap the sheet's own height at 90% of the *visible* area too (not just
// reposition its wrapper) — content taller than that scrolls internally
// via the existing `overflow-y-auto` instead of pushing the submit button
// past the bottom of what's actually on-screen.
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

function handleQuickAddClick() {
  if (trips.value.length === 0) {
    // Nothing to log against yet — nudge straight into trip creation
    // instead of opening an empty quick-add screen.
    showCreate.value = true
    return
  }
  showQuickAdd.value = true
}
</script>

<template>
  <div class="px-5 pt-8 pb-28">
    <!-- Header -->
    <header class="mb-8 flex items-start justify-between">
      <div>
        <p class="font-mono text-xs tracking-widest text-muted uppercase">{{ $t('app.brand') }}</p>
        <h1 class="font-display text-3xl font-semibold text-ink mt-1">{{ $t('app.title') }}</h1>
        <p class="font-body text-sm text-muted mt-1">{{ $t('app.tagline') }}</p>
      </div>
      <NuxtLink to="/settings" :aria-label="$t('settings.title')" class="font-body text-xs text-muted mt-2">
        {{ $t('home.settingsLink') }}
      </NuxtLink>
    </header>

    <!-- Trip list -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-body text-sm font-medium text-muted">{{ $t('home.yourTrips') }}</h2>
        <button
          v-if="trips.length"
          type="button"
          class="font-body text-xs font-medium text-pine border border-pine rounded-lg px-3 py-1.5"
          @click="showCreate = true"
        >
          {{ $t('home.addTrip') }}
        </button>
      </div>

      <div v-if="trips.length === 0" class="ticket p-6 pt-6 flex flex-col items-center text-center gap-2">
        <p class="font-body text-sm text-ink font-medium">{{ $t('home.noTrips') }}</p>
        <p class="font-body text-xs text-muted">
          {{ $t('home.noTripsHint') }}
        </p>
        <button
          type="button"
          class="mt-3 font-body text-sm font-medium text-pine border border-pine rounded-lg px-4 py-2"
          @click="showCreate = true"
        >
          {{ $t('home.createTrip') }}
        </button>
      </div>

      <div v-else class="flex flex-col gap-3">
        <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
      </div>
    </section>

    <!-- Floating quick-add button — always in thumb reach, per the UX
         decision: recording an expense must never require scrolling
         to find the primary action. -->
    <button
      type="button"
      :aria-label="$t('home.quickAdd')"
      class="fixed bottom-6 right-6 w-14 h-14 rounded-hero bg-pine text-white
             font-display text-2xl leading-none shadow-[0_8px_20px_-6px_rgba(31,69,54,0.6)]
             flex items-center justify-center active:scale-95 transition-transform"
      @click="handleQuickAddClick"
    >
      +
    </button>

    <ExpenseQuickAdd v-if="showQuickAdd" :trips="trips" @close="showQuickAdd = false" />

    <!-- Create-trip sheet — a fixed-height flex column so the field list
         scrolls internally while the Create button stays pinned at the
         bottom of the sheet, per the redesign's "save/create button is
         always anchored to the bottom of the screen" rule. -->
    <div
      v-if="showCreate"
      class="fixed inset-x-0 z-20 flex items-end justify-center bg-ink/40"
      :style="sheetViewportStyle"
      @click.self="showCreate = false"
    >
      <div
        class="w-full max-w-md bg-paper rounded-t-2xl flex flex-col"
        :style="{ maxHeight: sheetMaxHeight }"
      >
        <div class="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 class="font-display text-xl font-semibold text-ink">{{ $t('tripForm.createTitle') }}</h2>
          <button
            type="button"
            :aria-label="$t('common.close')"
            class="text-muted text-2xl leading-none"
            @click="showCreate = false"
          >
            &times;
          </button>
        </div>
        <TripCreateForm class="flex-1 min-h-0 px-5 pb-5" @created="handleCreated" @cancel="showCreate = false" />
      </div>
    </div>
  </div>
</template>
