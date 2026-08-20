// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-17',
  devtools: { enabled: true },

  // Pure SPA — all data lives in localStorage (client-only), there's no SEO
  // requirement, and SSR here only bought us hydration mismatches: the
  // server always renders against an empty/default store (it has no access
  // to the browser's localStorage), so any page that already has trips or
  // expenses re-renders differently on the client the instant it hydrates.
  // Confirmed hitting this in ExpenseQuickAdd.vue during mobile testing.
  ssr: false,

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n'],

  // zh-TW is the default (this is a Traditional-Chinese-first product);
  // en is the only other locale offered. `strategy: 'no_prefix'` keeps
  // routes as plain `/`, `/trips/:id`, `/settings` — this is SSR:false with
  // no SEO need, so there's no reason for locale-prefixed URLs. Language
  // persistence is handled by hand in plugins/i18n-persist.client.ts
  // (localStorage, per product decision) rather than this module's default
  // cookie-based detection, so browser-language auto-detection is off too.
  i18n: {
    locales: [
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ],
    langDir: 'locales/',
    defaultLocale: 'zh-TW',
    strategy: 'no_prefix',
    detectBrowserLanguage: false
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'TripTally',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content' },
        { name: 'theme-color', content: '#141816' },
        { name: 'description', content: '出國旅行的快速記帳與匯率換算 — 花一次錢，記一次帳，5 秒完成。' },
        // iOS "Add to Home Screen" — launches without Safari's chrome, like
        // a standalone app. iOS/Safari-only; no equivalent needed for
        // Android here per product decision. No service worker / offline
        // cache added — that's explicitly out of scope for this pass.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // 'default': light, opaque status bar with dark icons/text — matches
        // the app's light `paper` background. 'black-translucent' would
        // overlay white icons directly on our light header with no scrim,
        // unreadable.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'TripTally' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap'
        },
        // 180x180, solid pine background, no alpha — iOS applies its own
        // rounded-corner mask, so this stays a plain full-bleed square.
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  typescript: {
    strict: true
  }
})
