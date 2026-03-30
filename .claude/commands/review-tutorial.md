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

### 5. KaTeX validation
For each `<Tex>` usage:
- [ ] The LaTeX string is syntactically valid (check for unmatched braces, unknown commands)
- [ ] `display` prop is used for block equations, omitted for inline

### 6. Component imports
- [ ] All imported components from `@/components/tutorial` are actually used
- [ ] No unused imports
- [ ] No missing imports (components used but not imported)

### 7. Build check
- Run `npx vite build --logLevel error` to verify the tutorial compiles without errors

### 8. Content quality (advisory)
Flag but don't block:
- Steps with no interactive elements (all text, no sliders/charts/quizzes)
- Very long steps that might benefit from splitting
- InfoBox variants that seem mismatched (e.g., "success" variant for a warning)

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
