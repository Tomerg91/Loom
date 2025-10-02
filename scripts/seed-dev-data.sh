#!/bin/bash

# Seed development data for coach dashboard testing
# This script creates test users and sessions for development

set -e

echo "🌱 Seeding development data..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  echo "Please set it in your .env.local file or export it:"
  echo "  export DATABASE_URL='your_database_url'"
  exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "📊 Running seed SQL..."
psql "$DATABASE_URL" -f supabase/seed.sql

echo ""
echo "✅ Development data seeded successfully!"
echo ""
echo "📝 Test credentials:"
echo "  Coach: coach@example.com"
echo "  Clients: client1@example.com, client2@example.com, client3@example.com"
echo ""
echo "⚠️  Note: You must create these users in Supabase Auth first!"
echo "   Go to: https://supabase.com/dashboard → Authentication → Users"
echo "   Or sign up through your app's signup flow"
echo ""
