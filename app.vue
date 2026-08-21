<template>
  <div class="min-h-screen bg-paper flex justify-center">
    <div class="w-full max-w-md min-h-screen bg-paper relative">
      <NuxtPage />
    </div>
  </div>
  <Transition name="splash-fade">
    <SplashScreen v-if="!isAppReady" />
  </Transition>
</template>

<script setup lang="ts">
// Loading/Splash gating — see README.md. Shown from cold start until the
// app's initial data (trips, hydrated from localStorage) is ready, then
// fades out. `useTrips()`'s localStorage read is synchronous, so the only
// real waiting here is however long mounting itself takes; a failsafe
// timer still dismisses the splash if that ever changes, so a slow/stuck
// init can never trap the user on it.
const { isAppReady, markReady } = useAppReady()
let failsafeTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  useTrips()
  markReady()
  failsafeTimer = setTimeout(markReady, 9000)
})

onUnmounted(() => {
  if (failsafeTimer) clearTimeout(failsafeTimer)
})
</script>

<style scoped>
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 180ms ease-out;
}
.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}
</style>
