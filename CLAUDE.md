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

**Simulation pattern:** Tutorials with statistical content use a seeded PRNG (`mulberry32` + `boxMuller` for Gaussian noise) to generate reproducible datasets (typically N=50–600 observations). Data generation functions accept parameters that can be wired to sliders. Compute derived estimates (OLS, FE, etc.) via `useMemo` keyed to the reactive parameters. See `src/tutorials/doubly-robust/` or `src/tutorials/panel-data/` for examples.

## Key conventions

- Path alias: `@/` maps to `src/` (configured in `vite.config.js`)
- UI primitives in `src/components/ui/` are shadcn/ui-style wrappers around Radix UI
- Math rendering via KaTeX through the `Tex` component — use `<Tex math="..." />` for inline and `<Tex math="..." display />` or `<Tex math="..." block />` for display mode. The `math` prop takes the LaTeX string; `display` and `block` are interchangeable boolean props for centered/large rendering.
- Animations via framer-motion

## Tutorial pedagogy guidelines

- **Math first, then charts.** Every key concept needs a proper derivation with display-mode formulas. Show the algebra step by step (e.g., write the model, write its time-average, subtract to cancel the confounder). Formulas should use `<Tex math="..." display />`.
- **Concrete numbers in every formula.** After showing the general form, plug in actual values from the running example. Use template literals to make numbers reactive: `<Tex math={\`\\bar{Y}_i = ${fmt(mean, 1)}\`} />`.
- **Interactivity only when it demonstrates a point.** A slider is justified when moving it reveals a non-obvious insight (e.g., "bias grows with confounding strength"). A static worked example with concrete numbers is often better. Before adding a slider, identify the specific insight it reveals.
- **Hand calculations are the primary teaching tool.** Step-by-step arithmetic (e.g., "Scores: 72, 80, 80. Mean = 77.3. Demeaned: −5.3, +2.7, +2.7") is more valuable than a chart or simulation alone. Simulations support hand calculations, not the other way around.
- **Charts must never sit alone in a full-width row.** Always pair with text, controls, or another chart using the side-by-side grid.

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
