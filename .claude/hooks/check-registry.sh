#!/bin/bash

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check tutorial component files
if [[ ! "$FILE_PATH" =~ /src/tutorials/[^/]+/.*\.jsx$ ]]; then
  exit 0
fi

# Extract slug from directory name (src/tutorials/<slug>/Component.jsx)
SLUG=$(echo "$FILE_PATH" | sed -n 's|.*/src/tutorials/\([^/]*\)/.*|\1|p')

if [ -z "$SLUG" ]; then
  exit 0
fi

REGISTRY="$CLAUDE_PROJECT_DIR/src/tutorials/registry.js"

if ! grep -q "\"$SLUG\"" "$REGISTRY" 2>/dev/null; then
  echo "Warning: tutorial slug \"$SLUG\" not found in registry.js. Remember to add it to src/tutorials/registry.js."
fi

exit 0
