#!/bin/bash
set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if [[ ! "$COMMAND" =~ git\ commit ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Only build when something that affects the bundle has changed.
# Pure-text edits (CLAUDE.md, .claude/*, README.md, docs, hooks) skip the build.
RELEVANT_PATTERN='\.(jsx?|tsx?|css|html|json|mjs|cjs)$'
if ! git diff --cached --name-only | grep -qE "$RELEVANT_PATTERN"; then
  exit 0
fi

if npx vite build --logLevel error > /dev/null 2>&1; then
  exit 0
else
  echo '{"decision":"block","reason":"Vite build failed. Fix build errors before committing."}'
  exit 2
fi
