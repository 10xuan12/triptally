// Tracks whether the app has finished cold-start initialization (trips
// hydrated from localStorage) — app.vue reads this to know when to
// dismiss the Loading/Splash screen. See README.md's Loading/Splash
// handoff spec. Shared across every caller via useState, same pattern
// as useTrips()/useExpenses().
export function useAppReady() {
  const isAppReady = useState('isAppReady', () => false)

  function markReady() {
    isAppReady.value = true
  }

  return { isAppReady, markReady }
}
