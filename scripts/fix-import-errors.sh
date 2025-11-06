#!/bin/bash
# Fix import syntax errors where logger import was inserted incorrectly

for file in src/components/coach/add-session-modal.tsx \
            src/components/providers/analytics-provider.tsx; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    # Read the file, fix the pattern, write back
    sed -i '/^import {$/{
      N
      s/import {\nimport { logger from/import { logger from\nimport {/
    }' "$file"
  fi
done

echo "Done!"
