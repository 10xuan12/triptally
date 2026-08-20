import type { Config } from 'tailwindcss'

// Design direction: "精簡現代工具" (lean modern tool), Wise/Revolut-style
// fintech-tool feel — near-white surfaces, near-black text, one deep pine
// accent, minimal ornament. This is the 2026-08 visual reset (see the
// "TripTally 視覺重整" design doc): same five color tokens as before, but
// Space Grotesk + IBM Plex Sans are dropped in favor of a single UI
// typeface (Public Sans) so headings and body text read as one family;
// IBM Plex Mono stays for every number (amounts, rates, dates). Corner
// radii are tightened and made consistent (10–16px everywhere, no pills/
// full-round except thin progress-bar tracks) — see main.css and each
// component for the specific scale in use.
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
        // `display` and `body` both resolve to Public Sans now — kept as
        // two separate keys (rather than renaming every `font-display`/
        // `font-body` usage across the app) so this file is the only place
        // that needed to change to adopt the new type direction.
        display: ['"Public Sans"', 'sans-serif'],
        body: ['"Public Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']       // rates, timestamps, all figures
      },
      borderRadius: {
        card: '14px',   // trip cards, list-style cards (was 18px)
        hero: '16px',   // FAB, hero total-spent card, largest surfaces
        input: '10px'   // text inputs, segmented tabs, small stat tiles
      }
    }
  }
}
