#!/bin/bash

# Test script for Loom Coaching Platform
# This script runs all types of tests in the correct order

set -e # Exit on any error

echo "🧪 Starting comprehensive test suite for Loom Coaching Platform"
echo "============================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
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
echo "📋 Test Plan:"
echo "  1. Lint and type check"
echo "  2. Unit tests"
echo "  3. Integration tests"
echo "  4. Coverage report"
echo "  5. E2E tests (optional)"
echo ""

# 1. Lint and type check
echo "🔍 Step 1: Linting and type checking..."
npm run lint
npm run type-check
print_status "Linting and type checking passed"

# 2. Unit tests
echo ""
echo "🧪 Step 2: Running unit and integration tests..."
npm run test -- --run --reporter=verbose
print_status "Unit and integration tests passed"

# 3. Coverage report
echo ""
echo "📊 Step 3: Generating coverage report..."
npm run test:coverage -- --run --reporter=verbose
print_status "Coverage report generated in ./coverage/"

# 4. E2E tests (only if requested)
if [ "$1" = "--e2e" ] || [ "$1" = "--all" ]; then
    echo ""
    echo "🌐 Step 4: Running E2E tests..."
    
    # Check if development server is running
    if ! curl -s http://localhost:3000 > /dev/null; then
        print_warning "Development server not running. Starting server..."
        npm run dev &
        DEV_PID=$!
        
        # Wait for server to start
        echo "Waiting for server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:3000 > /dev/null; then
                break
            fi
            sleep 1
        done
        
        if ! curl -s http://localhost:3000 > /dev/null; then
            print_error "Failed to start development server"
            kill $DEV_PID 2>/dev/null || true
            exit 1
        fi
    fi
    
    # Run E2E tests
    npm run test:e2e
    print_status "E2E tests passed"
    
    # Clean up if we started the server
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
        print_status "Development server stopped"
    fi
else
    print_warning "Skipping E2E tests. Use --e2e or --all to include them."
fi

# Summary
echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "📈 Test Results Summary:"
echo "  ✓ Linting and type checking"
echo "  ✓ Unit and integration tests"
echo "  ✓ Coverage report generated"

if [ "$1" = "--e2e" ] || [ "$1" = "--all" ]; then
    echo "  ✓ E2E tests"
fi

echo ""
echo "📂 Reports available in:"
echo "  • Coverage: ./coverage/index.html"
echo "  • E2E Results: ./playwright-report/index.html"
echo ""
echo "🚀 Ready for deployment!"