# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make dev        # Start dev server (installs deps first, opens browser)
make build      # Production build to dist/
make preview    # Build + preview production locally
npm run dev     # Dev server without auto-install
```

No test runner or linter is configured.

## Architecture

Personal website for Sam Miazaki, deployed to GitHub Pages. React 18 + Vite SPA using HashRouter, styled with Tailwind CSS.

**Routing:** `HashRouter` in `App.jsx` — all pages nest under `BlogLayout` (sticky nav + footer). The site has two sections: a landing page and **Noodlelab**, an interactive statistics/causal-inference tutorial hub.

**Tutorial system:** Each tutorial lives in `src/tutorials/<slug>/` as a single component file. Tutorials are registered in `src/tutorials/registry.js` with metadata (slug, title, description, date, tags, optional source) and a `lazy()` import. `TutorialPage.jsx` resolves the slug from the URL and renders the matching component inside a `<Suspense>` boundary.

**TutorialShell pattern:** Tutorials use `TutorialShell` (from `src/components/tutorial/`) which provides step-based navigation with a progress sidebar. The shell takes a `lessons` array (step titles) and a render-prop `children(step)` that receives the current step index. Shared building blocks exported from `src/components/tutorial/index.js`: `StepContent`, `QuizCard`, `StatCard` (supports optional `formula` prop — a LaTeX string shown as a hover tooltip), `InfoBox`, `LabeledSlider`, `Tex` (KaTeX wrapper).

**Adding a new tutorial:** Create `src/tutorials/<slug>/<Name>Tutorial.jsx` using the TutorialShell pattern, then add an entry to `registry.js`.

## Key conventions

- Path alias: `@/` maps to `src/` (configured in `vite.config.js`)
- UI primitives in `src/components/ui/` are shadcn/ui-style wrappers around Radix UI
- Math rendering via KaTeX through the `Tex` component
- Animations via framer-motion

## SVG chart style guide

All inline SVG charts in tutorials must follow these conventions for visual consistency:

### Sizing and layout
- **Charts go in a side-by-side grid with controls** — use `grid gap-6 md:grid-cols-[0.9fr_1.1fr]` on CardContent, with text/sliders/stats on the left column and charts on the right. Charts should NOT take a full-width row on their own.
- Standard viewBox: `W=460, H=180–200` for single charts
- Padding object: `PAD = { top: 14–20, right: 15–20, bottom: 28–36, left: 15–52 }`
- Use `className="w-full"` on the `<svg>` element (responsive within the grid column)

### Chart titles
- Use `text-[10px] text-slate-400` — small and subtle, not prominent
- No `uppercase`, no `tracking-wide`, no `font-medium`

### Colors
- Primary: `#1e293b` (slate-800), Secondary: `#94a3b8` (slate-400)
- Axes: `#cbd5e1` (slate-200), Grid lines: `#f1f5f9` (slate-50)
- Success/reference: `#10b981` (emerald-500), Warning: `#f59e0b` (amber-500)
- Tick labels: `text-[10px] fill-slate-500`, Legend: `text-[9px] fill-slate-600`

### Stroke widths
- Grid lines: `strokeWidth={0.5}`
- Axes: `strokeWidth={1}` (default)
- Data lines/curves: `strokeWidth={1.5–2.5}`
- Dashed lines: `strokeDasharray="6,3"` or `"4,2"`

### Bar/histogram opacity
- Bars: `opacity={0.55}` (primary) or `opacity={0.55}` (secondary)

### Step content spacing
- `<StepContent className="space-y-4">` — always pass `space-y-4`
- `<CardContent className="space-y-4 text-slate-700">` — consistent inner spacing
- StatCard grids: `grid gap-3 md:grid-cols-2` or `md:grid-cols-3`
- Quiz step: `<StepContent className="grid gap-4 md:grid-cols-2">` with QuizCards directly (no Card wrapper)
