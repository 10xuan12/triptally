// Remembers the user's language choice across visits. @nuxtjs/i18n's own
// `detectBrowserLanguage` defaults to a cookie — this app keeps everything
// else in localStorage (trips, expenses, settings), so the language choice
// follows the same convention rather than introducing a cookie just for
// this. Runs as a client plugin, before the app mounts, so there's no
// flash of the default locale before switching.
const STORAGE_KEY = 'locale'

export default defineNuxtPlugin((nuxtApp) => {
  // useI18n() requires a component setup context (it's a Vue composable
  // internally using inject()), which a plugin's top-level callback isn't —
  // so this reads the i18n instance off nuxtApp instead, same object,
  // different access point.
  const i18n = nuxtApp.$i18n as {
    locale: { value: string }
    locales: { value: Array<string | { code: string }> }
    setLocale: (code: string) => void
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  const match = i18n.locales.value.find(l => (typeof l === 'string' ? l : l.code) === saved)
  if (match && saved !== i18n.locale.value) {
    i18n.setLocale(typeof match === 'string' ? match : match.code)
  }
})
