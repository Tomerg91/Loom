#!/bin/bash

# Supabase Configuration Verification Script
# Purpose: Verify that Supabase API keys are correctly configured
# Usage: ./scripts/verify-supabase-config.sh

set -e

echo "🔍 Supabase Configuration Verification"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ ERROR: .env.local file not found"
    echo "Please create .env.local with Supabase credentials"
    exit 1
fi

echo "✅ .env.local file found"
echo ""

# Extract environment variables
source .env.local

echo "📋 Configuration Check:"
echo "------------------------"

# Check SUPABASE_URL
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi
echo "✅ NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."

# Check ANON_KEY format
if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
    exit 1
fi

ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${ANON_KEY:0:20}..."

# Check key format
if [[ $ANON_KEY == sb_pb_* ]]; then
    echo "   ✅ Format: New Publishable Key (sb_pb_...)"
elif [[ $ANON_KEY == eyJ* ]]; then
    echo "   ⚠️  Format: Legacy JWT Key (may be disabled)"
    echo "   ℹ️  You may need to update to new publishable key format"
else
    echo "   ❓ Format: Unknown format - please verify with Supabase Dashboard"
fi

echo ""

# Check SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set (optional for development)"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi

echo ""
echo "🧪 Testing Supabase Connectivity"
echo "--------------------------------"

# Create a temporary test file
TEST_FILE=$(mktemp)
trap "rm -f $TEST_FILE" EXIT

cat > "$TEST_FILE" << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection with a simple health check
async function testConnection() {
  try {
    // Try to get session (this tests if the client initializes correctly)
    const { data, error } = await supabase.auth.getSession();

    if (error && error.message.includes('Legacy API keys')) {
      console.error('❌ Legacy API keys are disabled on your Supabase project');
      console.error('   Please update to new publishable keys');
      process.exit(1);
    }

    if (error && error.message.includes('Invalid API key')) {
      console.error('❌ Invalid API key format or credentials');
      console.error('   Error: ' + error.message);
      process.exit(1);
    }

    console.log('✅ Supabase client connected successfully');
    console.log('✅ API key format is valid');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }
}

testConnection();
EOF

# Run the test
echo "Testing Supabase connection..."
if node "$TEST_FILE"; then
    echo ""
    echo "✅ All checks passed!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Restart your dev server: npm run dev"
    echo "2. Test authentication: http://localhost:3000/en/auth/signin"
    echo "3. Try signing up with a test account"
    echo "4. Run Task 2.3 verification"
else
    echo ""
    echo "❌ Connection test failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Verify NEXT_PUBLIC_SUPABASE_URL is correct"
    echo "2. Check if using new publishable key format (sb_pb_...)"
    echo "3. See docs/SUPABASE_API_KEY_UPDATE_GUIDE.md for details"
    exit 1
fi
