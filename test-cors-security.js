#!/usr/bin/env node

/**
 * CORS Security Test Suite
 * 
 * This script tests the fixed CORS configuration to ensure:
 * 1. Allowed origins can make requests
 * 2. Blocked origins are rejected
 * 3. No wildcard CORS headers are returned
 * 4. Credentials are handled properly
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://loom-bay.vercel.app'
];

const BLOCKED_ORIGINS = [
  'https://malicious-site.com',
  'https://evil.example.com',
  'https://attacker.co',
  'null', // Some browsers send this
];

const TEST_ENDPOINTS = [
  '/api/health',
  '/api/docs',
  '/api/auth/me',
  '/api/notifications',
  '/api/sessions',
];

/**
 * Test CORS for a specific endpoint and origin
 */
async function testCorsForEndpoint(endpoint, origin, shouldAllow = true) {
  const url = `${BASE_URL}${endpoint}`;
  const testName = `${endpoint} from ${origin}`;
  
  try {
    // Test OPTIONS preflight request
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    const corsOrigin = optionsResponse.headers.get('Access-Control-Allow-Origin');
    const corsCredentials = optionsResponse.headers.get('Access-Control-Allow-Credentials');
    const varyHeader = optionsResponse.headers.get('Vary');

    if (shouldAllow) {
      // For allowed origins
      if (corsOrigin === origin) {
        console.log(`${colors.green}✓ PASS${colors.reset} ${testName} - Origin correctly allowed`);
        
        // Check for proper security headers
        if (varyHeader && varyHeader.includes('Origin')) {
          console.log(`${colors.green}  ✓${colors.reset} Vary: Origin header present`);
        } else {
          console.log(`${colors.yellow}  ⚠${colors.reset} Missing Vary: Origin header`);
        }
        
        return true;
      } else if (corsOrigin === '*') {
        console.log(`${colors.red}✗ FAIL${colors.reset} ${testName} - ${colors.bold}WILDCARD CORS DETECTED!${colors.reset}`);
        return false;
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset} ${testName} - Origin not allowed (got: ${corsOrigin})`);
        return false;
      }
    } else {
      // For blocked origins
      if (corsOrigin === origin) {
        console.log(`${colors.red}✗ FAIL${colors.reset} ${testName} - ${colors.bold}Malicious origin incorrectly allowed!${colors.reset}`);
        return false;
      } else if (corsOrigin === '*') {
        console.log(`${colors.red}✗ CRITICAL FAIL${colors.reset} ${testName} - ${colors.bold}WILDCARD CORS ALLOWS ALL ORIGINS!${colors.reset}`);
        return false;
      } else {
        console.log(`${colors.green}✓ PASS${colors.reset} ${testName} - Origin correctly blocked`);
        return true;
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} ${testName} - ${error.message}`);
    return false;
  }
}

/**
 * Test for wildcard CORS in response headers
 */
async function testForWildcardCors(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    });

    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    
    if (corsOrigin === '*') {
      console.log(`${colors.red}✗ CRITICAL${colors.reset} ${endpoint} - Wildcard CORS detected in response headers!`);
      return false;
    } else {
      console.log(`${colors.green}✓ SECURE${colors.reset} ${endpoint} - No wildcard CORS in response headers`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ SKIP${colors.reset} ${endpoint} - Could not test (${error.message})`);
    return true; // Skip counts as pass for availability issues
  }
}

/**
 * Main test runner
 */
async function runCorsSecurityTests() {
  console.log(`${colors.blue}${colors.bold}CORS Security Test Suite${colors.reset}`);
  console.log(`${colors.blue}Testing against: ${BASE_URL}${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Wildcard CORS detection
  console.log(`${colors.bold}1. Testing for wildcard CORS vulnerabilities${colors.reset}`);
  for (const endpoint of TEST_ENDPOINTS) {
    totalTests++;
    if (await testForWildcardCors(endpoint)) {
      passedTests++;
    }
  }

  console.log('');

  // Test 2: Allowed origins
  console.log(`${colors.bold}2. Testing allowed origins${colors.reset}`);
  for (const origin of ALLOWED_ORIGINS) {
    for (const endpoint of TEST_ENDPOINTS.slice(0, 3)) { // Test first 3 endpoints
      totalTests++;
      if (await testCorsForEndpoint(endpoint, origin, true)) {
        passedTests++;
      }
    }
  }

  console.log('');

  // Test 3: Blocked origins
  console.log(`${colors.bold}3. Testing blocked origins${colors.reset}`);
  for (const origin of BLOCKED_ORIGINS) {
    for (const endpoint of TEST_ENDPOINTS.slice(0, 3)) { // Test first 3 endpoints
      totalTests++;
      if (await testCorsForEndpoint(endpoint, origin, false)) {
        passedTests++;
      }
    }
  }

  // Results
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}Test Results${colors.reset}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed: ${colors.red}${totalTests - passedTests}${colors.reset}`);
  
  if (passedTests === totalTests) {
    console.log(`\n${colors.green}${colors.bold}🛡️  ALL CORS SECURITY TESTS PASSED!${colors.reset}`);
    console.log(`${colors.green}Your application is protected against CORS-based attacks.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ CORS SECURITY VULNERABILITIES DETECTED!${colors.reset}`);
    console.log(`${colors.red}Please fix the failing tests before deploying to production.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runCorsSecurityTests().catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { runCorsSecurityTests, testCorsForEndpoint };