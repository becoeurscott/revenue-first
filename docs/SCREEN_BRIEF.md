# FirstRevenue — screen-building brief

Frontend-only prototype. Vite + React 19 + TypeScript + Tailwind v4 + react-router-dom v7 + zustand + lucide-react.
NO backend, NO network calls, NO new dependencies. All data is fictitious and lives in `src/data`. All state lives in `src/store/useApp.ts` (persisted to localStorage).

Product: a guided 30-day program that helps beginners earn their first money online. Two paths: `clipping` (Short-Form Clipping) and `gbp` (Google Business Profiles). Philosophy: "Less theory. More action." Every screen answers: Where am I? What do I do next? How close am I to my goal?

## Hard rules
- TypeScript only. `verbatimModuleSyntax` is on → `import type { X }` for types. `noUnusedLocals/Parameters` are on. No enums.
- Each page is a **default export** in `src/pages/<Name>.tsx` (routes are already wired in `src/App.tsx` — read it, do not edit it).
- Import with the `@/` alias (`@/components/ui/Button`).
- **Read these before writing**: `src/index.css` (design tokens → Tailwind utilities), `src/data/types.ts`, `src/store/useApp.ts`, `src/store/selectors.ts`, and every component you use in `src/components/**`. Use the existing components; do not re-implement buttons/cards/sheets/etc. If you need a new reusable piece, put it in `src/components/domain/<Name>.tsx`.
- Never hard-code mock data in pages: import from `src/data/*`. Never write hex colors in pages: use token utilities.
- Every visible button must do something real: navigate, open a Sheet, mutate the store, or `toast(...)`. No dead buttons, no "coming soon", no lorem ipsum.
- Do not edit files you don't own (shared components, store, data, App.tsx, index.css). If something is missing in the store, work around it with existing actions and tell me in your final report.
- Do not run the dev server. Verify with `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "<your files>"` and fix all errors in your files.

## Design language
Dark-first, premium consumer app (not an "AI dashboard"). Minimal, generous spacing (8px system), large rounded cards, strong typography, gradients used sparingly (primary CTAs, progress, hero/achievement moments, selected states).
- Surfaces: `bg-bg`, `bg-bg-raised`, `bg-bg-sunken`, `bg-surface`, `bg-surface-2`, `bg-surface-3`; borders `border-line`, `border-line-strong`.
- Text: `text-ink`, `text-ink-soft`, `text-muted`, `text-faint`. Brand: `text-brand-300/400`, `bg-brand-500/15`, utilities `bg-brand-gradient`, `text-brand-gradient`. Status: `success`, `warning`, `danger`, `info` (e.g. `text-success`, `bg-success/12`).
- Radius: `rounded-sm|md|lg|xl|2xl` (10/14/18/24/32px). Shadows: `shadow-card`, `shadow-glow`, `shadow-glow-sm`.
- Motion: `animate-fade-up`, `animate-fade-in`, `animate-scale-in`, `animate-pop`, `animate-float`; wrap lists in `stagger` to cascade children. Keep it fast and subtle.
- Numbers: add `tabular`. Big numbers: `text-2xl/3xl font-extrabold tracking-tight`.
- Type scale: page title via `<Page>`; section titles `text-[17px] font-bold`; body `text-[15px]`/`text-sm`; meta `text-xs/[13px] text-faint`. Nothing smaller than 11px.
- Touch targets ≥ 44px (`min-h-11`, `size-11`). No horizontal overflow at 360px. Mobile first; use `sm:`/`lg:` grids for tablet/desktop (content area is max-w-5xl; on desktop prefer 2–3 column grids over stretched single columns).
- Accessibility: semantic elements, labels on icon buttons (`IconButton label=`), `aria-*` where relevant, visible focus is global.

## Component kit (read the files for exact props)
- `@/components/layout/Page` — `<Page title subtitle? back? actions? large? eyebrow?>`: screen scaffold with sticky top bar. Top-level tabs use `large`; detail screens use `back`.
- `@/components/ui/Button` — `Button` (variant primary|secondary|ghost|danger|success; size sm|md|lg; `full`, `loading`, `icon`, `iconRight`), `IconButton` (`label`, `active`).
- `@/components/ui/Card` — `Card` (variant default|interactive|selected|locked|completed|hero), `LinkCard`, `SectionHeader` (title, to?, action?), `ListGroup` + `ListRow` (settings-style rows).
- `@/components/ui/Badge` — `Badge` (tone neutral|brand|success|warning|danger|info), `Avatar` (name, size).
- `@/components/ui/Progress` — `ProgressRing` (value 0–1, size, stroke, label, children), `ProgressBar` (value 0–1, label, tone).
- `@/components/ui/Sheet` — `Sheet` (bottom sheet on mobile / modal on desktop: open, onClose, title, description?, footer?), `ConfirmDialog`.
- `@/components/ui/Toast` — `toast('msg')`, `toast.success|error|info|warning`.
- `@/components/ui/Inputs` — `TextField`, `TextArea`, `SelectField` (label, value, onChange, options: string[]), `SearchBar`, `Toggle`.
- `@/components/ui/Chips` — `FilterChips`, `Tabs` (options, value, onChange, label).
- `@/components/ui/StatCard`, `@/components/ui/Skeleton` (`Skeleton`, `CardSkeleton`, `ListSkeleton`), `@/components/ui/EmptyState` (title, description, mood?, action?, compact?), `@/components/ui/Confetti`, `@/components/ui/Heatmap` (activeDays), `@/components/ui/VideoPlayerMock`.
- `@/components/mascot/Mascot` — Penny the brain mascot: `<Mascot mood="happy|thinking|excited|wink|sad|sleepy|love|focused" size say? />`. Interactive (eyes follow pointer, tap reactions). Use her for empty/success/celebration moments — sparingly, one per screen max.
- `@/components/domain/Paywall` — `PremiumGate` (feature, children), `LockedCard`, `PaywallSheet`, `PlanPicker`, `useMockCheckout`.
- `@/components/domain/LessonCard` (`LessonCard` layout tile|row, `LessonThumb`), `@/components/domain/ProspectCard` (`ProspectCard`, `StatusBadge`, `PROSPECT_STATUSES`, `statusTone`), `@/components/domain/ResourceCard` (`ResourceCard`, `resourceIcons`).
- Helpers: `@/lib/cn` (`cn`, `money`, `hueGradient`), `@/lib/date` (`timeAgo`, `formatDate`, `formatTime`, `greeting`, `dayKey`…).
- Store: `useApp((s) => s.x)` for state/actions; selectors `useProgram()`, `useStats()`, `usePremium()`, `useUnreadCount()`, `useDayStatus()`.

## Loading states
Where a screen "fetches" (lists, generators, coach), simulate latency briefly (300–900ms) with `ListSkeleton`/`Skeleton`, then reveal. If `useApp(s => s.settings.offline)` is true, network-like actions (coach reply, generator, checkout) should show an error state/toast with a Retry instead of succeeding.

## Sample user (demo account)
Alex Carter, 24, student, clipping path, Day 7/30, streak 6 (7 after today's mission), 18 prospects, 4 replies, 1 client (Jordan Williams), $150 collected, goal $500. A brand-new signup starts at Day 1 with empty lists — so every list needs a polished empty state.
