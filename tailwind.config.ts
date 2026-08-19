import type { Config } from 'tailwindcss'

// Design direction: "精簡現代工具" (lean modern tool) — near-white surfaces,
// near-black text, one deep pine accent, minimal ornament. Superseded the
// earlier warm "Departure Board" travel-journal direction (dashed ticket
// edges, emoji, pill buttons, sage/cream palette).
export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './composables/**/*.{js,ts}',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#141816',      // primary text, dark surfaces
        paper: '#FAFAF9',    // page background — near-white
        card: '#FFFFFF',     // card surfaces on top of paper
        pine: '#1F4536',     // primary action / accent (the "+" button, totals, categories, links)
        danger: '#D92D20',   // alert / negative status only (over-budget, delete) — not yet applied to any component
        muted: '#8A8F89',    // secondary text — neutral cool grey, deliberately far from ink for clear hierarchy
        line: '#E5E7E3'      // hairline borders — necessary separators only, not decorative
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'], // numbers, totals, headings
        body: ['"IBM Plex Sans"', 'sans-serif'],     // UI text
        mono: ['"IBM Plex Mono"', 'monospace']       // rates, timestamps, receipts
      },
      borderRadius: {
        card: '18px'
      }
    }
  }
}
