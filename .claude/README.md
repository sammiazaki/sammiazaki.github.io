# Claude Code Setup

This directory contains agents, skills (slash commands), and hooks that automate the tutorial authoring workflow.

## Agents

Agents are specialized sub-processes you can ask Claude to use, or that Claude will pick automatically when the task matches. You don't invoke them directly — just describe what you need and Claude dispatches the right one.

| Agent | Model | What it does |
|---|---|---|
| **tutorial-scaffolder** | Sonnet | Creates a new tutorial folder, writes the component scaffold following the TutorialShell pattern, and registers it in `registry.js`. Use when starting a new tutorial from scratch. |
| **content-writer** | Sonnet | Fills in step content — explanations, InfoBoxes, formulas, StatCards (with `formula` hover tooltips), and narrative flow. Give it an outline or reference and it writes the prose. |
| **viz-designer** | Sonnet | Builds inline SVG chart components (histograms, density plots, scatter charts). Produces pure-SVG React components matching the project's visual style. Charts are constrained to `max-w-md` width with subtle `text-[10px]` titles. |
| **quiz-writer** | Sonnet | Reads finished tutorial content and generates QuizCard entries targeting common misconceptions. Produces 3-4 questions per tutorial. |
| **math-checker** | Opus | Audits tutorials for mathematical correctness — LaTeX syntax, formula accuracy, simulation-formula consistency, statistical claims, and StatCard `formula` props. |

### Typical workflow

```
1. /fetch-reference <url>          # Extract outline from a reference article
2. Ask Claude to scaffold           # → tutorial-scaffolder agent
3. Ask Claude to write content      # → content-writer agent
4. Ask Claude to build charts       # → viz-designer agent
5. Ask Claude to add quiz           # → quiz-writer agent
6. Ask Claude to check the math     # → math-checker agent
7. /review-tutorial <slug>          # Final validation pass
```

You can run steps 3-5 in parallel by asking Claude to launch multiple agents at once.

## Slash Commands (Skills)

Type these directly in the Claude Code prompt:

| Command | What it does |
|---|---|
| `/fetch-reference <url>` | Fetches a blog post or article and extracts a structured tutorial outline: narrative arc, concepts, formulas, suggested interactive elements, and a proposed step structure. |
| `/review-tutorial [slug]` | Runs a full validation pass on a tutorial: registry entry, step completeness, QuizCard correctness, KaTeX syntax, StatCard formulas, imports, build check, and content quality. |

## Hooks

Hooks run automatically — you don't invoke them. They guard against common mistakes.

### Pre-commit build check
**Trigger:** Before any `git commit` command
**What it does:** Runs `npx vite build` and **blocks the commit** if the build fails.
**File:** `.claude/hooks/pre-commit-build.sh`

### Registry reminder
**Trigger:** After any `Write` to a file matching `src/tutorials/<slug>/*.jsx`
**What it does:** Checks if the tutorial's slug exists in `registry.js`. Prints a warning if it's missing — doesn't block.
**File:** `.claude/hooks/check-registry.sh`

## Permissions

Pre-approved commands are listed in `.claude/settings.local.json`. These include git operations, npm/vite commands, Playwright browser tools, and specific web domains (Substack, GitHub, npm, Anthropic API docs, Matheus Facure's causality handbook) so Claude can fetch reference material without prompting each time.

## Style conventions

See `CLAUDE.md` at the repo root for the full SVG chart style guide — chart sizing (`max-w-md`), color palette, stroke widths, spacing classes, and component patterns that all tutorials must follow.
