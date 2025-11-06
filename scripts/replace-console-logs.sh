#!/bin/bash
#
# Script to replace console.* calls with logger.* calls
# Targets: src/app/api/**, src/lib/database/**, src/lib/auth/**
#

set -e

LOGGER_IMPORT="import { logger } from '@/lib/logger';"

echo "🔄 Replacing console.* calls with logger.* in server-side code..."

# Function to add logger import if not present
add_logger_import() {
  local file="$1"

  # Check if logger is already imported
  if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
    # Find the last import statement
    last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
      # Insert logger import after the last import
      sed -i "${last_import_line}a\\${LOGGER_IMPORT}" "$file"
      echo "  ✅ Added logger import to $file"
    fi
  fi
}

# Function to replace console calls
replace_console_calls() {
  local file="$1"
  local changed=false

  # Replace console.error with logger.error
  if grep -q "console\.error(" "$file"; then
    sed -i "s/console\.error(/logger.error(/g" "$file"
    changed=true
  fi

  # Replace console.warn with logger.warn
  if grep -q "console\.warn(" "$file"; then
    sed -i "s/console\.warn(/logger.warn(/g" "$file"
    changed=true
  fi

  # Replace console.info with logger.info
  if grep -q "console\.info(" "$file"; then
    sed -i "s/console\.info(/logger.info(/g" "$file"
    changed=true
  fi

  # Replace console.log with logger.debug
  if grep -q "console\.log(" "$file"; then
    sed -i "s/console\.log(/logger.debug(/g" "$file"
    changed=true
  fi

  if [ "$changed" = true ]; then
    echo "  ✅ Replaced console calls in $file"
    add_logger_import "$file"
  fi
}

# Process API routes
echo "📁 Processing API routes..."
find src/app/api -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

# Process database services
echo "📁 Processing database services..."
find src/lib/database -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

# Process auth services
echo "📁 Processing auth services..."
find src/lib/auth -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

echo "✨ Console replacement complete!"
echo "ℹ️  Note: Review changes manually and test thoroughly"
echo "ℹ️  Client-side code (components, hooks) still needs manual review"
