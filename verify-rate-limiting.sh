#!/bin/bash

# Rate Limiting Verification Script
# Usage: ./verify-rate-limiting.sh [base_url]
# Example: ./verify-rate-limiting.sh https://your-app.vercel.app

BASE_URL=${1:-"http://localhost:3000"}

echo "🔒 Rate Limiting Verification"
echo "============================="
echo "🌐 Testing: $BASE_URL"
echo "📅 Started: $(date)"
echo ""

# Test health endpoint (60 requests/minute limit)
echo "🧪 Testing /api/health endpoint (60 req/min limit)..."
echo "Making 5 rapid requests to check rate limiting headers:"

for i in {1..5}; do
    echo "Request #$i:"
    response=$(curl -s -w "HTTP_CODE:%{http_code}\n" -H "Accept: application/json" "$BASE_URL/api/health" 2>/dev/null)
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
        echo "  ✅ Status: $http_code (OK)"
    elif [ "$http_code" = "429" ]; then
        echo "  🚫 Status: $http_code (Rate Limited)"
        break
    else
        echo "  ⚠️  Status: $http_code (Other)"
    fi
    
    # Small delay
    sleep 0.1
done

echo ""

# Test authentication endpoint (10 requests/minute limit)
echo "🧪 Testing /api/auth/signin endpoint (10 req/min limit)..."
echo "Making 3 rapid requests with invalid credentials:"

for i in {1..3}; do
    echo "Request #$i:"
    response=$(curl -s -w "HTTP_CODE:%{http_code}\n" \
        -H "Content-Type: application/json" \
        -X POST \
        -d '{"email":"test@example.com","password":"invalid"}' \
        "$BASE_URL/api/auth/signin" 2>/dev/null)
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "401" ]; then
        echo "  ✅ Status: $http_code (Unauthorized - Expected)"
    elif [ "$http_code" = "429" ]; then
        echo "  🚫 Status: $http_code (Rate Limited)"
        break
    else
        echo "  ⚠️  Status: $http_code (Other)"
    fi
    
    # Small delay
    sleep 0.1
done

echo ""

# Test with detailed headers to verify rate limiting information
echo "🧪 Checking rate limiting headers on /api/health:"
curl -s -I "$BASE_URL/api/health" | grep -E "(ratelimit|retry)" || echo "No rate limiting headers found (check implementation)"

echo ""

echo "🏁 Verification Complete"
echo ""
echo "📋 Expected Behavior:"
echo "  • Status 200: Normal operation"
echo "  • Status 429: Rate limit exceeded (good!)"
echo "  • Headers should include X-RateLimit-* information"
echo ""
echo "⚠️  Note: If no rate limiting is triggered, limits may not be exceeded yet."
echo "   Run the script multiple times rapidly or increase request counts."