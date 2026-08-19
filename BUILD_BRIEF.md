# TripTally — Build Brief (Selina AI Studio internal product)

A mobile-first PWA for international travelers: convert currency and log an
expense in under 10 seconds, per trip, fully offline-capable after first load.
No backend, no login, $0 infrastructure. First real user is the Founder,
traveling to Thailand in October — that trip is the validation deadline.

Stack: Nuxt 3 + Vue 3 + TypeScript + `@nuxtjs/tailwindcss` + Chart.js (added
in Stage 5). Data lives entirely in the browser (localStorage). Deployed to
Vercel later, not part of this brief.

Work through the stages below **in order, one at a time**. After each stage,
stop, run `npm run dev`, and let the Founder verify in the browser before
moving to the next stage. Do not skip ahead or merge stages.

---

## Non-negotiable rules (apply to every stage)

1. **No backend, no login, no external database.** All persistence is
   localStorage, wrapped in composables — never read/write localStorage
   directly from a component.
2. **Historical exchange rates are frozen at entry time.** When an `Expense`
   is saved, its `rateUsed` and `amountHome` are computed once and never
   recalculated later, even if the live rate changes. This is the single
   most important business rule in the app — do not "helpfully" make it
   reactive to live rates.
3. **Exchange rate source:** `https://open.er-api.com/v6/latest/{BASE}`
   (free, no API key required). Confirmed to return `TWD`, `THB`, and 160+
   other ISO codes in its `rates` object. Wrap every call behind
   `services/exchangeRateService.ts` — no component or page should call
   `fetch` on this URL directly.
4. **Trip creation is minimal on purpose.** Only `name`, `tripCurrency`,
   `homeCurrency` are required. `startDate`, `endDate`, `budget` are
   optional and should not block trip creation or be shown as mandatory
   fields in the default form state.
5. **Quick expense entry is the core UX metric.** From tapping the floating
   `+` button to a saved expense should be achievable in 5–10 seconds:
   numeric input first, one-tap category, one-tap payment method, date
   defaults to today. After saving, stay on the entry screen (don't
   navigate away) so the next expense can be logged immediately.
6. **Offline must not block saving.** If the exchange-rate fetch fails, fall
   back to the most recent cached rate for that currency pair and mark the
   expense `rateIsCached: true`. Never block a save on network failure.
7. **No AI features.** Do not add AI-generated anything to this MVP.
8. **Keep dependencies minimal.** Don't install a package unless a stage
   below explicitly calls for it.

---

## Design tokens — follow exactly, do not substitute

Direction: **"Departure Board"** — grounded in airport split-flap displays
and paper boarding passes/ticket stubs. Explicitly avoid generic AI-default
palettes (cream+serif+terracotta, near-black+neon accent, newspaper
hairline layout).

**Colors** (already in `tailwind.config.ts` if Stage 1 zip was used — verify,
don't regenerate):
- `ink` `#16211C` — primary text, dark surfaces
- `paper` `#FAF8F3` — page background (pale sage-grey, not cream)
- `card` `#FFFFFF` — card surfaces on top of paper
- `pine` `#1E4B3D` — primary action / accent color (the `+` button, big
  totals, category chips, links). Use light tints for general-state UI like
  category/tag chips — e.g. unselected `bg-pine/10 text-pine`, selected
  `bg-pine text-white` — rather than a solid fill everywhere.
- `oxblood` `#7A2E2E` — reserved for alert / negative status only (errors,
  destructive actions, over-budget warnings). Do not use for ordinary
  accents, chips, or links — nothing in Stage 1–4 uses it yet.
- `muted` `#6B7570` — secondary text
- `line` `#E3DFD6` — hairline borders, dashed "tear line" edges

**Fonts** (loaded via Google Fonts link tag in `nuxt.config.ts`):
- `font-display` → Space Grotesk (numbers, totals, headings — good tabular
  figures for currency amounts)
- `font-body` → IBM Plex Sans (UI text)
- `font-mono` → IBM Plex Mono (rates, timestamps, receipt-style data)

**Signature element:** the `.ticket` utility class (already defined in
`assets/css/main.css`) — a card with a dashed line 64px from the top,
echoing a boarding-pass stub. Reuse this consistently for trip cards and
expense rows instead of inventing new card styles per screen.

---

## Stage 1 — Project scaffold ✅ already done

Already scaffolded (see attached zip): `package.json`, `nuxt.config.ts`,
`tailwind.config.ts`, `assets/css/main.css`, `types/index.ts`,
`types/constants.ts`, `app.vue`, `pages/index.vue` (placeholder empty
state), `.gitignore`.

**Your task:** unzip into the project folder, run `npm install`, run
`npm run dev`, confirm it renders at `localhost:3000` with the fonts/colors
showing correctly and no console errors. Do not regenerate these files
unless something is actually broken — extend them in later stages instead.

---

## Stage 2 — Exchange rate service

Create `services/exchangeRateService.ts`:

- `fetchRates(base: CurrencyCode): Promise<ExchangeRateSnapshot>` — calls
  `https://open.er-api.com/v6/latest/{base}`, parses the response, and on
  success writes an `ExchangeRateSnapshot` to localStorage keyed by
  `rates:{base}`.
- `getCachedRates(base: CurrencyCode): ExchangeRateSnapshot | null` — reads
  from localStorage, returns `null` if none exists.
- `getRate(base: CurrencyCode, target: CurrencyCode): Promise<{ rate: number; isCached: boolean; fetchedAt: string }>`
  — tries `fetchRates` first; on network failure, falls back to
  `getCachedRates`; if neither is available, throw a clear error the UI can
  catch and show as "無法取得匯率，請檢查網路連線".
- Use the `ExchangeRateSnapshot` type already defined in `types/index.ts`.

**Acceptance:** in the browser console, calling
`getRate('THB', 'TWD')` returns a plausible rate. Turning off network and
calling it again (after one prior successful call) still resolves using the
cache, with `isCached: true`.

---

## Stage 3 — Trip management

1. Create `composables/useTrips.ts` — localStorage-backed CRUD:
   `getTrips()`, `createTrip(input)`, `deleteTrip(id)`. Store all trips as a
   single JSON array under one localStorage key (e.g. `trips`).
2. Create `components/TripCreateForm.vue` — fields: name (text input),
   trip currency (searchable select, options populated **dynamically** from
   the last fetched rates object, not a hardcoded list), home currency
   (same, defaulting to `TWD`), and a collapsed "更多選項" disclosure that
   reveals optional start date / end date / budget. Required fields only:
   name + both currencies.
3. Create `components/TripCard.vue` using the `.ticket` style — shows trip
   name, currency pair, and (if set) date range.
4. Wire `pages/index.vue`: replace the placeholder empty state with a real
   list from `useTrips()`, plus the create flow (modal or dedicated route,
   your choice — optimize for minimal taps).

**Acceptance:** creating a trip (name + 2 currencies only) takes under 15
seconds, appears immediately in the list as a `.ticket` card, and survives
a page reload.

---

## Stage 4 — Quick expense entry (the core feature — get this right)

1. Create `composables/useExpenses.ts` — localStorage-backed CRUD scoped by
   `tripId`: `getExpenses(tripId)`, `addExpense(input)`,
   `deleteExpense(id)`.
2. Create the quick-add flow — `components/ExpenseQuickAdd.vue`, opened by
   the floating `+` button already in `pages/index.vue` (route it to the
   correct trip if only one trip exists; if multiple, ask which trip
   first — but don't add friction if there's only one active trip).
3. Flow, in order, each step reachable with one tap/type — no scrolling
   required to reach Save:
   - Large numeric input for the amount (trip currency), auto-focused.
   - Live preview below the input: `฿450 ≈ NT$XXX`, updating as the user
     types, computed via `exchangeRateService.getRate()` (debounce or cache
     the rate for the session so this doesn't refetch per keystroke).
   - One-tap category chips (from `CATEGORY_META`).
   - One-tap payment method chips (from `PAYMENT_META`).
   - Date, defaulting to today, editable but not required to touch.
   - Save button.
4. On Save: freeze `rateUsed`/`amountHome` per rule #2 above, persist via
   `useExpenses().addExpense()`, then **reset the form and stay on the same
   screen** so the next expense can be entered immediately — do not
   navigate to the dashboard.
5. If the rate fetch fails, show a small inline indicator ("使用快取匯率
   · [time]") rather than blocking the save.

**Acceptance:** with a trip already created, logging an expense (amount →
category → payment → save) takes under ~10 seconds of actual interaction,
and the very next expense can be started without any extra navigation.

---

## Stage 5 — Trip dashboard

1. Install `chart.js` and `vue-chartjs` (first new dependencies since
   Stage 1 — nothing else needs installing for this stage).
2. Create a trip detail page/view showing, from `useExpenses(tripId)`:
   - Total spent (home currency, large `font-display` number).
   - Budget vs. remaining, only rendered if the trip has a budget set —
     don't show an empty/zero progress bar when no budget was given.
   - Average spend per day (total ÷ number of distinct dates with an
     expense, or ÷ trip length if start/end dates are set).
   - Category breakdown — one simple chart (pie or horizontal bar,
     whichever reads better at mobile width). Don't add multiple chart
     types for the same data.
   - Expense list grouped by date, most recent first, each row showing
     amount in both currencies, category, payment method.

**Acceptance:** the dashboard updates immediately (no reload needed) when a
new expense is added from Stage 4's quick-add flow.

---

## Stage 6 — Backup (export / import)

1. Add a Settings section/page with two actions:
   - **匯出備份** — serialize all app data (all trips + all expenses) from
     localStorage into one JSON object, trigger a browser download via a
     `Blob` + temporary `<a download>` link, filename
     `triptally-backup-{YYYY-MM-DD}.json`.
   - **匯入備份** — a file input that reads a previously exported JSON file,
     validates its shape against the `Trip`/`Expense` types before writing
     anything, and on success replaces current localStorage data. Show a
     confirmation dialog before overwriting ("這會覆蓋目前的所有資料，確定要
     匯入嗎？").
2. Keep this entirely client-side — no server round-trip.

**Acceptance:** export → manually clear localStorage (via DevTools) →
import the exported file → all trips and expenses are restored exactly as
they were.

---

## Working notes for Claude Code

- Run `npm run dev` and check `localhost:3000` after every stage before
  moving on.
- Don't refactor earlier stages' files unless a later stage explicitly
  requires it — keep changes scoped to the current stage.
- If a stage's acceptance criterion fails, fix it before starting the next
  stage rather than carrying the bug forward.
- Design tokens and the `.ticket` signature style are fixed — don't
  introduce a second card style or a different accent color partway
  through.
