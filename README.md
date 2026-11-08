# TripTally

Offline-first travel expense tracker: convert currency and log an expense in under 10 seconds.
**Live:** https://triptallyxuan.netlify.app/

## The problem

Splitting travel costs across currencies usually ends in a messy group chat and a spreadsheet
nobody updates. Most expense apps want an account, a connection and too many taps.

## What it does

- **Trips with their own currency.** Each trip has a trip currency and a home currency
  (e.g. VND → TWD), with optional dates and budget.
- **Quick add.** Tap `+`, type the amount, one tap for category, one tap for payment method,
  date defaults to today. After saving it stays on the form for the next entry.
- **Spending breakdown.** Daily average, trip progress and a category chart.
- **Two languages.** Traditional Chinese and English (`@nuxtjs/i18n`).
- **Backup.** Export and restore trip data (`utils/backup.ts`).

## Decisions and trade-offs

- **Exchange rates are frozen at entry time.** When an expense is saved, the rate and the
  home-currency amount are stored and never recalculated. Last week's coffee shouldn't change
  price because the rate moved today.
- **Offline never blocks a save.** If the rate request fails, the last cached rate is used and
  the expense is marked `rateIsCached`, so you can keep logging in a taxi with no signal.
- **No back end, no login.** Data lives in the browser (localStorage), accessed only through
  composables (`useTrips`, `useExpenses`). Zero running cost and nothing to sign up for.
  The trade-off: data stays on one device unless you export it.
- **One place for network calls.** Every rate request goes through
  `services/exchangeRateService.ts` (open.er-api.com, free, no API key).

## Stack

Nuxt 3 · Vue 3 · TypeScript · Tailwind CSS · Chart.js · @nuxtjs/i18n · Netlify

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Status

Built for and used on my own trips to Da Nang and Bangkok. Not yet released to other users.
