#!/bin/bash

# Accessibility Testing Script for Loom App
# This script runs all accessibility tests and checks

set -e

echo "🔍 Running Accessibility Tests for Loom App..."
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run accessibility unit tests
echo -e "${YELLOW}📋 Running accessibility unit tests...${NC}"
npm test -- --testNamePattern="Accessibility Tests" --silent

# Check for common accessibility issues in code
echo -e "${YELLOW}🔍 Checking for common accessibility issues...${NC}"

# Check for missing alt text
echo "Checking for missing alt text..."
MISSING_ALT=$(grep -r "alt=\"\"" src/ || true)
if [ -n "$MISSING_ALT" ]; then
    echo -e "${RED}⚠️  Warning: Found empty alt attributes (decorative images should use alt='' with role='presentation'):${NC}"
    echo "$MISSING_ALT"
fi

# Check for missing labels
echo "Checking for missing form labels..."
MISSING_LABELS=$(grep -r "<input" src/ | grep -v "aria-label\|<label" || true)
if [ -n "$MISSING_LABELS" ]; then
    echo -e "${RED}⚠️  Warning: Found inputs without labels:${NC}"
    echo "$MISSING_LABELS"
fi

# Check for missing ARIA attributes on buttons
echo "Checking for button accessibility..."
BUTTON_ISSUES=$(grep -r "<button" src/ | grep -v "aria-label\|aria-pressed\|aria-expanded" | head -5 || true)
if [ -n "$BUTTON_ISSUES" ]; then
    echo -e "${YELLOW}ℹ️  Info: Some buttons could benefit from ARIA attributes:${NC}"
    echo "$BUTTON_ISSUES"
fi

# Check for heading structure
echo "Checking heading structure..."
HEADING_STRUCTURE=$(grep -r "<h[1-6]" src/ | wc -l || true)
echo "Found $HEADING_STRUCTURE heading elements"

# Check for skip links
echo "Checking for skip links..."
SKIP_LINKS=$(grep -r "skip-link\|Skip to" src/ || true)
if [ -n "$SKIP_LINKS" ]; then
    echo -e "${GREEN}✅ Skip links found${NC}"
else
    echo -e "${RED}❌ No skip links found${NC}"
fi

# Check for role attributes
echo "Checking for ARIA roles..."
ROLE_COUNT=$(grep -r "role=" src/ | wc -l || true)
echo "Found $ROLE_COUNT role attributes"

# Check for aria-live regions
echo "Checking for live regions..."
LIVE_REGIONS=$(grep -r "aria-live\|role=\"alert\"" src/ || true)
if [ -n "$LIVE_REGIONS" ]; then
    echo -e "${GREEN}✅ Live regions found${NC}"
else
    echo -e "${YELLOW}⚠️  Consider adding aria-live regions for dynamic content${NC}"
fi

echo ""
echo -e "${GREEN}✅ Accessibility check complete!${NC}"
echo ""
echo "💡 Next steps:"
echo "1. Run manual testing with screen readers (NVDA, JAWS, VoiceOver)"
echo "2. Test keyboard navigation on all pages"
echo "3. Verify color contrast ratios"
echo "4. Test with browser accessibility tools"
echo "5. Consider using automated tools like axe-core"
echo ""
echo "📚 Resources:"
echo "- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/"
echo "- WebAIM Screen Reader Testing: https://webaim.org/articles/screenreader_testing/"
echo "- Accessibility Testing Tools: https://www.w3.org/WAI/test-evaluate/tools/"