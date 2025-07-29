#!/bin/bash

# E2E Test Runner Script
# This script sets up the environment and runs E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[E2E]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[E2E]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[E2E]${NC} $1"
}

print_error() {
    echo -e "${RED}[E2E]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local timeout=${2:-60}
    local count=0
    
    print_status "Waiting for service at $url..."
    
    while [ $count -lt $timeout ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "Service is ready at $url"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    print_error "Service at $url failed to start within ${timeout}s"
    return 1
}

# Default values
RUN_SETUP=true
RUN_TEARDOWN=true
START_SUPABASE=true
START_APP=true
TEST_PATTERN=""
BROWSER="chromium"
DEBUG=false
HEADLESS=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-setup)
            RUN_SETUP=false
            shift
            ;;
        --no-teardown)
            RUN_TEARDOWN=false
            shift
            ;;
        --no-supabase)
            START_SUPABASE=false
            shift
            ;;
        --no-app)
            START_APP=false
            shift
            ;;
        --pattern)
            TEST_PATTERN="$2"
            shift 2
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --debug)
            DEBUG=true
            HEADLESS=false
            shift
            ;;
        --headed)
            HEADLESS=false
            shift
            ;;
        --ui)
            DEBUG=true
            HEADLESS=false
            shift
            ;;
        --help)
            echo "E2E Test Runner"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-setup      Skip test setup"
            echo "  --no-teardown   Skip test teardown"
            echo "  --no-supabase   Don't start local Supabase"
            echo "  --no-app        Don't start the application"
            echo "  --pattern TEXT  Run tests matching pattern"
            echo "  --browser NAME  Browser to use (chromium, firefox, webkit)"
            echo "  --debug         Run in debug mode"
            echo "  --headed        Run with browser UI visible"
            echo "  --ui            Run with Playwright UI"
            echo "  --help          Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                           # Run all tests"
            echo "  $0 --pattern auth            # Run auth tests only"
            echo "  $0 --debug --browser firefox # Debug with Firefox"
            echo "  $0 --no-setup --no-teardown  # Run tests without setup/teardown"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "Starting E2E test run..."

# Check prerequisites
if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    print_error "Not in project directory (package.json not found)"
    exit 1
fi

# Load test environment variables
if [ -f ".env.test" ]; then
    print_status "Loading test environment variables..."
    export $(cat .env.test | xargs)
else
    print_warning "No .env.test file found, using defaults"
fi

# Check if Playwright is installed
if ! npm list @playwright/test >/dev/null 2>&1; then
    print_error "Playwright is not installed. Run: npm install"
    exit 1
fi

# Start Supabase if requested
if [ "$START_SUPABASE" = true ]; then
    if command_exists supabase; then
        print_status "Starting local Supabase..."
        if ! supabase status >/dev/null 2>&1; then
            supabase start
            if [ $? -ne 0 ]; then
                print_error "Failed to start Supabase"
                exit 1
            fi
        else
            print_success "Supabase is already running"
        fi
        
        # Wait for Supabase to be ready
        wait_for_service "http://127.0.0.1:54321/rest/v1/" 30
    else
        print_warning "Supabase CLI not found, assuming external database"
    fi
fi

# Install Playwright browsers if needed
print_status "Ensuring Playwright browsers are installed..."
npx playwright install --with-deps

# Start the application if requested
APP_PID=""
if [ "$START_APP" = true ]; then
    if ! port_in_use 3000; then
        print_status "Starting development server..."
        npm run dev &
        APP_PID=$!
        
        # Wait for app to be ready
        wait_for_service "http://localhost:3000" 60
    else
        print_success "Application is already running on port 3000"
    fi
fi

# Function to cleanup on exit
cleanup() {
    if [ -n "$APP_PID" ]; then
        print_status "Stopping development server..."
        kill $APP_PID 2>/dev/null || true
    fi
    
    if [ "$RUN_TEARDOWN" = true ]; then
        print_status "Running test teardown..."
        # Teardown will be handled by global teardown
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Build test command
TEST_CMD="npx playwright test"

if [ -n "$TEST_PATTERN" ]; then
    TEST_CMD="$TEST_CMD --grep=\"$TEST_PATTERN\""
fi

if [ "$BROWSER" != "chromium" ]; then
    TEST_CMD="$TEST_CMD --project=$BROWSER"
fi

if [ "$DEBUG" = true ]; then
    TEST_CMD="$TEST_CMD --debug"
elif [ "$HEADLESS" = false ]; then
    TEST_CMD="$TEST_CMD --headed"
fi

# Set test environment variables
export NODE_ENV=test
export TEST_MODE=true
export PLAYWRIGHT_TEST=true

if [ "$DEBUG" = true ]; then
    export TEST_DEBUG=true
    export PWDEBUG=1
fi

# Run the tests
print_status "Running E2E tests..."
print_status "Command: $TEST_CMD"

eval $TEST_CMD
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "All E2E tests passed!"
else
    print_error "Some E2E tests failed (exit code: $TEST_EXIT_CODE)"
fi

# Generate test report
if [ -d "playwright-report" ]; then
    print_status "Test report generated at: playwright-report/index.html"
    if command_exists open; then
        print_status "Opening test report..."
        open playwright-report/index.html
    fi
fi

exit $TEST_EXIT_CODE