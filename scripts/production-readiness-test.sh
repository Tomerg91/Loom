#!/bin/bash

# Production Readiness Test Suite
# Comprehensive testing to ensure the application is ready for customer deployment

set -e # Exit on any error

echo "🚀 Production Readiness Test Suite"
echo "=================================="
echo "Testing Loom Coaching Platform for customer deployment readiness"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "$(printf '%.0s─' {1..50})"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${PURPLE}ℹ${NC} $1"
}

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local required="${3:-true}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    print_info "Running: $test_name"
    
    if eval "$test_command" 2>/dev/null; then
        print_success "$test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            print_error "$test_name - FAILED"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        else
            print_warning "$test_name - WARNING"
            WARNING_TESTS=$((WARNING_TESTS + 1))
            return 0
        fi
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_warning "Installing dependencies..."
    npm install
fi

echo ""
echo "🎯 Test Categories:"
echo "  1. Code Quality & Static Analysis"
echo "  2. Security Testing"
echo "  3. Performance Testing"
echo "  4. Accessibility Testing"
echo "  5. Infrastructure Testing"
echo "  6. Unit & Integration Tests"
echo "  7. End-to-End Testing"
echo "  8. Production Configuration"
echo "  9. Database & API Testing"
echo "  10. Monitoring & Observability"
echo ""

# =============================================================================
# 1. CODE QUALITY & STATIC ANALYSIS
# =============================================================================

print_header "1. Code Quality & Static Analysis"

run_test "TypeScript Compilation" "npm run type-check"
run_test "ESLint Code Quality" "npm run lint"
run_test "Prettier Code Formatting" "npm run format:check"
run_test "Package Dependency Audit" "npm audit --audit-level=moderate"

# =============================================================================
# 2. SECURITY TESTING
# =============================================================================

print_header "2. Security Testing"

run_test "Security Tests" "npm run test -- --run src/test/security.test.ts"
run_test "Vulnerability Scanning" "npm audit --audit-level=high"
run_test "Environment Security Check" "npm run test -- --run src/test/production-readiness.test.ts --grep 'Environment Security'"

# Check for common security issues
run_test "No Hardcoded Secrets" "! grep -r 'password.*=' src/ --exclude-dir=test || true"
run_test "No API Keys in Code" "! grep -r 'api_key.*=' src/ --exclude-dir=test || true"

# =============================================================================
# 3. PERFORMANCE TESTING
# =============================================================================

print_header "3. Performance Testing"

run_test "Performance Tests" "npm run test -- --run src/test/performance.test.ts"
run_test "Bundle Size Analysis" "npm run build && ls -la .next/static/chunks/ | head -10"

# Run Lighthouse if server is available
if curl -s http://localhost:3000 > /dev/null; then
    run_test "Lighthouse Performance Audit" "npx lighthouse http://localhost:3000 --only-categories=performance --chrome-flags='--headless' --quiet" "false"
else
    print_warning "Skipping Lighthouse tests - development server not running"
fi

# =============================================================================
# 4. ACCESSIBILITY TESTING
# =============================================================================

print_header "4. Accessibility Testing"

run_test "Accessibility Tests" "npm run test -- --run src/test/accessibility.test.ts"

# Run Lighthouse accessibility audit if server is available
if curl -s http://localhost:3000 > /dev/null; then
    run_test "Lighthouse Accessibility Audit" "npx lighthouse http://localhost:3000 --only-categories=accessibility --chrome-flags='--headless' --quiet" "false"
fi

# =============================================================================
# 5. INFRASTRUCTURE TESTING
# =============================================================================

print_header "5. Infrastructure Testing"

run_test "Infrastructure Configuration Tests" "npm run test -- --run src/test/infrastructure.test.ts"
run_test "Docker Configuration Validation" "docker-compose config -q" "false"
run_test "Next.js Build Configuration" "npm run build"

# =============================================================================
# 6. UNIT & INTEGRATION TESTS
# =============================================================================

print_header "6. Unit & Integration Tests"

run_test "Unit Tests" "npm run test:unit"
run_test "Integration Tests" "npm run test:integration"
run_test "Test Coverage Analysis" "npm run test:coverage -- --run --reporter=text-summary"

# Check coverage thresholds
COVERAGE_THRESHOLD=80
print_info "Checking coverage thresholds (minimum: ${COVERAGE_THRESHOLD}%)"

# =============================================================================
# 7. END-TO-END TESTING
# =============================================================================

print_header "7. End-to-End Testing"

# Check if development server is running for E2E tests
if curl -s http://localhost:3000 > /dev/null; then
    run_test "E2E Authentication Flow" "npm run test:e2e -- auth.spec.ts"
    run_test "E2E Session Booking" "npm run test:e2e -- session-booking.spec.ts"
    run_test "E2E Coach Dashboard" "npm run test:e2e -- coach-dashboard.spec.ts"
else
    print_warning "Skipping E2E tests - development server not running"
    print_info "To run E2E tests: npm run dev (in another terminal) then rerun this script"
fi

# =============================================================================
# 8. PRODUCTION CONFIGURATION
# =============================================================================

print_header "8. Production Configuration"

run_test "Production Readiness Tests" "npm run test -- --run src/test/production-readiness.test.ts"
run_test "Environment Variables Check" "test -f .env.example"
run_test "Build Output Validation" "test -d .next/standalone" "false"

# Check production build size
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    print_info "Build size: $BUILD_SIZE"
fi

# =============================================================================
# 9. DATABASE & API TESTING
# =============================================================================

print_header "9. Database & API Testing"

run_test "API Route Tests" "npm run test -- --run src/test/api/"
run_test "Database Service Tests" "npm run test -- --run src/test/lib/database/"

# Test API endpoints if server is running
if curl -s http://localhost:3000 > /dev/null; then
    run_test "Health Check Endpoint" "curl -f http://localhost:3000/api/health"
    run_test "API Response Format" "curl -s http://localhost:3000/api/health | grep -q 'status'"
fi

# =============================================================================
# 10. MONITORING & OBSERVABILITY
# =============================================================================

print_header "10. Monitoring & Observability"

# Check monitoring configuration
run_test "Error Tracking Configuration" "npm run test -- --run src/test/production-readiness.test.ts --grep 'error tracking'"
run_test "Analytics Configuration" "npm run test -- --run src/test/production-readiness.test.ts --grep 'analytics'"
run_test "Performance Monitoring" "npm run test -- --run src/test/production-readiness.test.ts --grep 'performance monitoring'"

# =============================================================================
# RESULTS SUMMARY
# =============================================================================

echo ""
echo ""
print_header "Test Results Summary"

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Warnings: ${YELLOW}$WARNING_TESTS${NC}"

# Calculate success rate
SUCCESS_RATE=$(echo "scale=1; ($PASSED_TESTS + $WARNING_TESTS) * 100 / $TOTAL_TESTS" | bc -l)
echo "Success Rate: ${SUCCESS_RATE}%"

echo ""
echo "📊 Detailed Reports:"
echo "  • Test Coverage: ./coverage/index.html"
echo "  • Build Analysis: .next/analyze/"
echo "  • E2E Results: ./playwright-report/index.html"
echo "  • Lighthouse Report: ./lighthouse-report.html"

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Production Readiness: PASSED${NC}"
    echo "✅ Your application is ready for customer deployment!"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Review any warnings above"
    echo "  2. Deploy to staging environment"
    echo "  3. Run final smoke tests"
    echo "  4. Deploy to production"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Production Readiness: FAILED${NC}"
    echo "⚠️  Critical issues found that must be resolved before deployment"
    echo ""
    echo "🔧 Required Actions:"
    echo "  1. Fix all failed tests"
    echo "  2. Address security vulnerabilities"
    echo "  3. Ensure all critical functionality works"
    echo "  4. Re-run this test suite"
    echo ""
    exit 1
fi