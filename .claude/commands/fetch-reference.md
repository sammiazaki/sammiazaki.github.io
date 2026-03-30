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
Based on the content, suggest what would work well as interactive elements in our TutorialShell format:
- Sliders (what parameters should the user control?)
- Visualizations (what SVG charts would show the concept?)
- Quiz questions (what misconceptions could we test?)

### Proposed Step Structure
Map the content to 5-7 tutorial steps suitable for our TutorialShell component, with a title and brief description for each step.

## Output Format
Return the outline as clean markdown. Be thorough — this outline drives the entire tutorial authoring process. Include all formulas in LaTeX notation.
