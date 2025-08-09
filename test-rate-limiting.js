#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * Tests various API endpoints to verify rate limiting is working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_ENDPOINTS = [
  {
    path: '/api/health',
    method: 'GET',
    expectedLimit: 60, // 60 requests per minute
    testDescription: 'Health check endpoint rate limiting'
  },
  {
    path: '/api/auth/signin',
    method: 'POST',
    expectedLimit: 10, // 10 attempts per minute
    testDescription: 'Authentication endpoint rate limiting',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  }
];

function makeRequest(endpoint, attempt = 1) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: endpoint.method,
      headers: endpoint.headers || {}
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          attempt
        });
      });
    });

    req.on('error', (error) => {
      reject({ error, attempt });
    });

    if (endpoint.body) {
      req.write(endpoint.body);
    }
    
    req.end();
  });
}

async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing: ${endpoint.testDescription}`);
  console.log(`📍 Endpoint: ${endpoint.method} ${endpoint.path}`);
  console.log(`⏰ Expected limit: ${endpoint.expectedLimit} requests/minute\n`);

  const results = [];
  const startTime = Date.now();
  
  // Test rapid requests to trigger rate limiting
  const requestPromises = [];
  const testRequests = Math.min(endpoint.expectedLimit + 5, 20); // Don't overwhelm in tests

  for (let i = 1; i <= testRequests; i++) {
    requestPromises.push(makeRequest(endpoint, i));
    
    // Small delay to avoid overwhelming the server
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  try {
    const responses = await Promise.allSettled(requestPromises);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        results.push(response);
        
        if (response.statusCode === 429) {
          rateLimitedCount++;
          if (rateLimitedCount === 1) {
            console.log(`🚨 First rate limit hit at request #${response.attempt}`);
            console.log(`📊 Rate limit headers:`, {
              limit: response.headers['x-ratelimit-limit'],
              remaining: response.headers['x-ratelimit-remaining'],
              reset: response.headers['x-ratelimit-reset'],
              retryAfter: response.headers['retry-after']
            });
          }
        } else if (response.statusCode >= 200 && response.statusCode < 300) {
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
        console.log(`❌ Request failed:`, result.reason);
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Successful requests: ${successCount}`);
    console.log(`   🚫 Rate limited (429): ${rateLimitedCount}`);
    console.log(`   ❌ Other errors: ${errorCount}`);
    console.log(`   ⏱️  Total duration: ${duration}ms`);
    
    // Verify rate limiting is working
    if (rateLimitedCount > 0) {
      console.log(`✅ PASS: Rate limiting is working! Blocked ${rateLimitedCount} requests`);
    } else if (successCount === testRequests) {
      console.log(`⚠️  WARNING: No rate limiting detected. This might be expected if under the limit.`);
    } else {
      console.log(`❌ FAIL: Unexpected behavior. Check endpoint configuration.`);
    }

  } catch (error) {
    console.error(`❌ Test failed with error:`, error);
  }
}

async function main() {
  console.log('🔒 Rate Limiting Security Test');
  console.log('===============================');
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`📅 Started at: ${new Date().toISOString()}\n`);

  for (const endpoint of TEST_ENDPOINTS) {
    await testEndpoint(endpoint);
    
    // Wait between endpoint tests to avoid cross-contamination
    console.log('\n⏳ Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🏁 All tests completed!');
  console.log('\n📋 Summary:');
  console.log('- Health endpoint should allow ~60 requests/minute');
  console.log('- Auth endpoint should allow ~10 requests/minute');
  console.log('- Rate limited requests should return 429 status');
  console.log('- Headers should include rate limit information');
  
  console.log('\n⚡ To test more aggressively, increase TEST_REQUESTS or run multiple instances');
}

if (require.main === module) {
  main().catch(console.error);
}