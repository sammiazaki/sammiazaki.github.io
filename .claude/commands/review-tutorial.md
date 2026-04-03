---
description: Review a tutorial component for correctness, completeness, and quality
user-invocable: true
---

# Review Tutorial

Review a tutorial for bugs, missing pieces, and quality issues.

## Input
The user may provide a tutorial slug or file path as `$ARGUMENTS`. If not provided, check which tutorial files have been recently modified (via `git diff` or `git status`), or ask the user which tutorial to review.

## Steps

### 1. Locate the tutorial
- Find the tutorial component in `src/tutorials/<slug>/`
- Read the full component file
- Read `src/tutorials/registry.js` to check its entry

### 2. Registry check
Verify the registry entry has all required fields:
- [ ] `slug` matches the folder name
- [ ] `title` is present
- [ ] `description` is present and descriptive
- [ ] `date` is a valid ISO date
- [ ] `tags` array is non-empty
- [ ] `component` lazy import path is correct and resolves to the actual file

### 3. Step completeness
- [ ] Count the items in the `LESSONS` array
- [ ] Verify there is a `step === N` block for every index (0 through lessons.length - 1)
- [ ] No missing or duplicate step indices

### 4. QuizCard validation
For each QuizCard:
- [ ] `correctIndex` is within bounds of the `options` array (0 to options.length - 1)
- [ ] `explanation` is present and non-empty
- [ ] Options are distinct (no duplicates)

### 5. StatCard formula validation
For each StatCard with a `formula` prop:
- [ ] The LaTeX in `formula` is syntactically valid KaTeX
- [ ] The formula accurately describes the metric shown by the StatCard's `label`
- [ ] All StatCards displaying mathematical metrics have a `formula` prop

### 6. KaTeX validation
For each `<Tex>` usage:
- [ ] The LaTeX string is syntactically valid (check for unmatched braces, unknown commands)
- [ ] `display` prop is used for block equations, omitted for inline

### 7. Component imports
- [ ] All imported components from `@/components/tutorial` are actually used
- [ ] No unused imports
- [ ] No missing imports (components used but not imported)

### 8. Build check
- Run `npx vite build --logLevel error` to verify the tutorial compiles without errors

### 9. Content quality (advisory)
Flag but don't block:
- Steps with no interactive elements (all text, no sliders/charts/quizzes)
- Very long steps that might benefit from splitting
- InfoBox variants that seem mismatched (e.g., "success" variant for a warning)
- Generic/abstract labels in charts and prose (e.g., "Treated"/"Untreated", "X", "Y") where the tutorial has a concrete running example that should be used instead (e.g., "Seminar"/"No seminar", "Prior GPA", "assessment score")
- SVG charts missing `max-w-md` constraint on their wrapper div (charts should NOT span full content width)
- Chart titles using anything larger than `text-[10px] text-slate-400` (titles should be small and subtle)
- Grid lines using `strokeWidth` > 0.5 (should be `strokeWidth={0.5}`)
- `CardContent` or `StepContent` not using `space-y-4` spacing

## Output
Return a structured report:

```
## Tutorial Review: <title>

### Pass / Fail
<overall status>

### Issues Found
<numbered list of issues, with severity: error/warning/suggestion>

### Summary
<1-2 sentence overall assessment>
```

Be specific — include line numbers and exact values for any issues found.
