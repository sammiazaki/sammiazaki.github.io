---
description: Fetch a reference URL and extract its pedagogical structure into a tutorial outline
user-invocable: true
---

# Fetch Reference

The user wants to analyze a reference post/article to prepare for writing an interactive tutorial.

## Input
The user provides a URL (passed as `$ARGUMENTS`). If no URL is provided, ask for one.

## Steps

1. **Fetch the page** using WebFetch on the URL: `$ARGUMENTS`

2. **Extract and return a structured outline** with these sections:

### Narrative Arc
- What story or motivating example does the author use?
- How do they hook the reader?

### Concepts Covered (in order)
For each concept:
- **Name**: one-line label
- **Core idea**: 1-2 sentence summary
- **Key formulas**: any math (write in LaTeX notation for our Tex component)
- **Visualizations used**: what plots/charts illustrate this concept?

### Data / Examples
- What dataset or simulation does the author use?
- What are the key parameters and variables?

### Common Pitfalls Discussed
- List any warnings, gotchas, or "what can go wrong" sections

### Suggested Interactive Elements
Based on the content, suggest what would work well as interactive elements in our TutorialShell format. Remember: interactivity is only justified when it reveals a non-obvious insight. A static worked example is often better.
- Sliders (only when moving the slider changes the lesson — e.g., "bias grows with confounding strength")
- Toggles (for binary A/B comparisons — e.g., raw vs. demeaned, entity FE vs. TWFE)
- Visualizations (what SVG charts would show the concept? Always paired side-by-side with controls/text, never full-width)
- Quiz questions (what misconceptions could we test?)

### Simulation Design
- Suggest a data-generating process: what variables, what confounding structure, what treatment assignment mechanism
- Recommend N (sample size) and key parameters
- Identify 1-2 "focal" units to pin with fixed values for hand-calculation worked examples

### Proposed Step Structure
Map the content to 5-7 tutorial steps suitable for our TutorialShell component, with a title and brief description for each step.

## Output Format
Return the outline as clean markdown. Be thorough — this outline drives the entire tutorial authoring process. Include ALL formulas in LaTeX notation — these are critical since the user values mathematical rigor. For each key derivation, show the full step-by-step algebra (not just the final result). Every formula will be rendered with `<Tex math="..." display />` in the tutorial.
