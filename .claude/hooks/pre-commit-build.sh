#!/bin/bash
set -e

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if [[ ! "$COMMAND" =~ git\ commit ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

if npx vite build --logLevel error > /dev/null 2>&1; then
  exit 0
else
  echo '{"decision":"block","reason":"Vite build failed. Fix build errors before committing."}'
  exit 2
fi
