#!/bin/bash
#
# Script to replace console.* calls with logger.* calls in CLIENT-SIDE code
# Targets: src/components/**, src/hooks/**, src/modules/**, src/lib/services/**
#

set -e

LOGGER_IMPORT="import { logger } from '@/lib/logger';"

echo "🔄 Replacing console.* calls with logger.* in client-side code..."

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

  # Skip files that should keep console.* (error boundaries, monitoring)
  if [[ "$file" =~ "error-boundary" ]] || [[ "$file" =~ "production-error-boundary" ]]; then
    echo "  ⏭️  Skipping error boundary: $file"
    return
  fi

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

# Process components
echo "📁 Processing components..."
find src/components -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

# Process hooks
echo "📁 Processing hooks..."
find src/hooks -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

# Process modules
echo "📁 Processing modules..."
find src/modules -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/services
echo "📁 Processing services..."
find src/lib/services -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/queries
echo "📁 Processing queries..."
find src/lib/queries -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/monitoring
echo "📁 Processing monitoring..."
find src/lib/monitoring -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/security
echo "📁 Processing security..."
find src/lib/security -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/performance
echo "📁 Processing performance..."
find src/lib/performance -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/realtime
echo "📁 Processing realtime..."
find src/lib/realtime -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

# Process lib/notifications
echo "📁 Processing notifications..."
find src/lib/notifications -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  replace_console_calls "$file"
done

echo "✨ Console replacement complete!"
echo "ℹ️  Note: Error boundaries kept console.* for error display"
echo "ℹ️  Review changes and test thoroughly"
