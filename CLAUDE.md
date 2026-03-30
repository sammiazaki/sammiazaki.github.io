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

**TutorialShell pattern:** Tutorials use `TutorialShell` (from `src/components/tutorial/`) which provides step-based navigation with a progress sidebar. The shell takes a `lessons` array (step titles) and a render-prop `children(step)` that receives the current step index. Shared building blocks exported from `src/components/tutorial/index.js`: `StepContent`, `QuizCard`, `StatCard`, `InfoBox`, `LabeledSlider`, `Tex` (KaTeX wrapper).

**Adding a new tutorial:** Create `src/tutorials/<slug>/<Name>Tutorial.jsx` using the TutorialShell pattern, then add an entry to `registry.js`.

## Key conventions

- Path alias: `@/` maps to `src/` (configured in `vite.config.js`)
- UI primitives in `src/components/ui/` are shadcn/ui-style wrappers around Radix UI
- Math rendering via KaTeX through the `Tex` component
- Animations via framer-motion
