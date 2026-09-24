# FirstRevenue — frontend prototype

A guided 30-day program that helps beginners earn their first money online. **Frontend only. All data is fictitious.**
No backend, auth, payments or AI API — everything is simulated and persisted in `localStorage`.

```bash
npm install
npm run dev
```

## Two ways in
- **I Already Have an Account → Log In** loads the demo user: Alex Carter, Day 7, 18 prospects, 1 client, $150.
- **Get Started** creates a brand-new account: onboarding → path recommendation → Day 1 with empty states.

`Settings → Prototype controls` lets you jump to any day (incl. Day 30), simulate offline, change subscription state and reset the demo.

## Structure
- `src/index.css` — design tokens (colors, radius, shadows, motion) as a Tailwind v4 theme
- `src/data/` — centralized mock data + mock engines (`recommendPath`, `generateOutreach`, `recommendPrice`, coach replies)
- `src/store/useApp.ts` — single Zustand store (persisted); each action maps 1:1 to a future API call
- `src/store/selectors.ts` — derived state (program, stats, premium)
- `src/components/ui` — primitives · `layout` — shell/nav · `domain` — product components · `mascot` — Penny, the interactive brain mascot
- `src/pages` — one file per route (lazy-loaded), wired in `src/App.tsx`
- `docs/SCREEN_BRIEF.md` — conventions for building new screens
