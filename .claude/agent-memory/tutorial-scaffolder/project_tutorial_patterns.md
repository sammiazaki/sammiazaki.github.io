---
name: Tutorial system patterns
description: TutorialShell props interface, registry format, folder structure, and import conventions for the Noodlelab tutorial system
type: project
---

## Folder structure

Each tutorial lives at `src/tutorials/<slug>/<PascalCase>Tutorial.jsx` — one file per tutorial, no subdirectory files or CSS modules.

## TutorialShell props

```jsx
<TutorialShell
  title="Human-readable title"
  description="One-sentence description"
  intro={<>JSX intro paragraphs</>}  // shown above the step content
  lessons={LESSONS}                   // string[] of step titles
>
  {(step) => (
    <>
      {step === 0 && <StepContent>...</StepContent>}
      {step === 1 && <StepContent>...</StepContent>}
      {/* ... */}
    </>
  )}
</TutorialShell>
```

`LESSONS` is a `const string[]` declared just above the default export function.

## Import pattern

All shared building blocks come from `@/components/tutorial` (barrel export):

```js
import {
  TutorialShell,
  StepContent,
  QuizCard,
  StatCard,
  InfoBox,
  LabeledSlider,
  Tex,
} from "@/components/tutorial";
```

Path alias `@/` maps to `src/`.

## Registry entry format (registry.js)

```js
{
  slug: "kebab-case-slug",
  title: "Human Readable Title",
  description: "One-sentence description.",
  date: "YYYY-MM-DD",
  tags: ["tag1", "tag2"],
  source: {                          // optional — omit if no reference
    title: "Title of source",
    author: "Author Name",
    url: "https://...",
  },
  component: lazy(() => import("./slug/ComponentTutorial.jsx")),
}
```

Entries are appended chronologically (newest last). The `distributions` entry has no `source` field, showing it is optional.

**Why:** Consistency is enforced across all tutorials so TutorialPage.jsx and the registry resolver work without modification.

**How to apply:** Always follow this exact shape when scaffolding. Never add extra top-level fields unless they appear in existing entries.
