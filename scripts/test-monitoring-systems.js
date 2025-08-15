#!/usr/bin/env node

/**
 * Production Monitoring Systems Test Suite
 * 
 * This script tests all monitoring systems and verifies configurations:
 * - Health check endpoints
 * - Performance monitoring APIs
 * - Business metrics collection
 * - Alert system configuration
 * - Error tracking (Sentry)
 * - Dashboard accessibility
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  maxRetries: 3,
  endpoints: {
    health: '/api/health',
    performanceMetrics: '/api/monitoring/performance',
    businessMetrics: '/api/monitoring/business-metrics',
    adminDashboard: '/admin',
  },
  expectedResponses: {
    health: {
      status: [200, 503], // 503 is acceptable if system is unhealthy but responsive
      requiredFields: ['status', 'timestamp', 'checks', 'performance'],
    },
    performanceMetrics: {
      status: [200],
      requiredFields: ['webVitals', 'customMetrics', 'performanceScore'],
    },
    businessMetrics: {
      status: [200],
      requiredFields: ['metrics'],
    },
  },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Monitoring-Test-Suite/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: TEST_CONFIG.timeout,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data,
            responseTime: Date.now() - startTime,
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            responseTime: Date.now() - startTime,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    const startTime = Date.now();
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test runner helper
async function runTest(testName, testFunction) {
  console.log(`\\n${colors.blue}🧪 Running: ${testName}${colors.reset}`);
  
  try {
    const result = await testFunction();
    
    if (result.status === 'pass') {
      console.log(`${colors.green}✅ ${testName}: PASSED${colors.reset}`);
      if (result.message) console.log(`   ${result.message}`);
      testResults.passed++;
    } else if (result.status === 'warning') {
      console.log(`${colors.yellow}⚠️  ${testName}: WARNING${colors.reset}`);
      if (result.message) console.log(`   ${result.message}`);
      testResults.warnings++;
    } else {
      console.log(`${colors.red}❌ ${testName}: FAILED${colors.reset}`);
      if (result.message) console.log(`   ${result.message}`);
      testResults.failed++;
    }
    
    testResults.tests.push({
      name: testName,
      status: result.status,
      message: result.message,
      details: result.details,
    });
    
  } catch (error) {
    console.log(`${colors.red}❌ ${testName}: ERROR${colors.reset}`);
    console.log(`   ${error.message}`);
    testResults.failed++;
    testResults.tests.push({
      name: testName,
      status: 'error',
      message: error.message,
    });
  }
}

// Individual test functions
async function testHealthEndpoint() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.health}`;
  const response = await makeRequest(url);
  
  const expectedStatus = TEST_CONFIG.expectedResponses.health.status;
  const requiredFields = TEST_CONFIG.expectedResponses.health.requiredFields;
  
  if (!expectedStatus.includes(response.status)) {
    return {
      status: 'fail',
      message: `Expected status ${expectedStatus.join(' or ')}, got ${response.status}`,
      details: { response },
    };
  }
  
  if (response.parseError) {
    return {
      status: 'fail',
      message: `Failed to parse JSON response: ${response.parseError}`,
      details: { response },
    };
  }
  
  const missingFields = requiredFields.filter(field => !(field in response.data));
  if (missingFields.length > 0) {
    return {
      status: 'fail',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      details: { response },
    };
  }
  
  // Check if all subsystem checks are present
  const expectedChecks = ['database', 'external_services', 'system', 'environment', 'cache'];
  const missingChecks = expectedChecks.filter(check => !(check in response.data.checks));
  
  if (missingChecks.length > 0) {
    return {
      status: 'warning',
      message: `Missing health checks: ${missingChecks.join(', ')}`,
      details: { response },
    };
  }
  
  return {
    status: 'pass',
    message: `Health endpoint responsive (${response.responseTime}ms), status: ${response.data.status}`,
    details: { response },
  };
}

async function testPerformanceMetricsEndpoint() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.performanceMetrics}`;
  
  // Test GET endpoint
  const getResponse = await makeRequest(url);
  
  if (getResponse.status !== 200) {
    return {
      status: 'fail',
      message: `GET request failed with status ${getResponse.status}`,
      details: { getResponse },
    };
  }
  
  // Test POST endpoint with sample metrics
  const sampleMetrics = {
    metrics: [
      {
        metric: 'LCP',
        value: 2500,
        rating: 'good',
        timestamp: Date.now(),
        url: 'http://localhost:3000/test',
        sessionId: 'test-session',
      },
    ],
  };
  
  const postResponse = await makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: sampleMetrics,
  });
  
  if (postResponse.status !== 200) {
    return {
      status: 'warning',
      message: `POST request failed with status ${postResponse.status}`,
      details: { getResponse, postResponse },
    };
  }
  
  return {
    status: 'pass',
    message: `Performance metrics endpoint working (GET: ${getResponse.responseTime}ms, POST: ${postResponse.responseTime}ms)`,
    details: { getResponse, postResponse },
  };
}

async function testBusinessMetricsEndpoint() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.businessMetrics}`;
  const response = await makeRequest(url);
  
  if (response.status !== 200) {
    return {
      status: 'fail',
      message: `Request failed with status ${response.status}`,
      details: { response },
    };
  }
  
  if (response.parseError) {
    return {
      status: 'fail',
      message: `Failed to parse JSON response: ${response.parseError}`,
      details: { response },
    };
  }
  
  const requiredSections = ['user_engagement', 'session_metrics', 'file_metrics', 'auth_metrics'];
  const missingSections = requiredSections.filter(section => 
    !(section in (response.data.metrics || {}))
  );
  
  if (missingSections.length > 0) {
    return {
      status: 'warning',
      message: `Missing business metric sections: ${missingSections.join(', ')}`,
      details: { response },
    };
  }
  
  return {
    status: 'pass',
    message: `Business metrics endpoint working (${response.responseTime}ms)`,
    details: { response },
  };
}

async function testSentryConfiguration() {
  // Check if Sentry DSN is configured
  const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!sentryDsn) {
    return {
      status: 'warning',
      message: 'Sentry DSN not configured (SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN)',
    };
  }
  
  // Validate DSN format
  const dsnPattern = /^https:\\/\\/[a-f0-9]+@[a-z0-9.-]+\\/[0-9]+$/;
  if (!dsnPattern.test(sentryDsn)) {
    return {
      status: 'warning',
      message: 'Sentry DSN format appears invalid',
    };
  }
  
  return {
    status: 'pass',
    message: 'Sentry DSN configured and format appears valid',
  };
}

async function testEnvironmentConfiguration() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const optionalEnvVars = [
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
    'SLACK_WEBHOOK_URL',
    'ALERT_EMAIL_WEBHOOK',
  ];
  
  const missingRequired = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const missingOptional = optionalEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingRequired.length > 0) {
    return {
      status: 'fail',
      message: `Missing required environment variables: ${missingRequired.join(', ')}`,
    };
  }
  
  let message = 'All required environment variables configured';
  if (missingOptional.length > 0) {
    message += `. Optional variables not configured: ${missingOptional.join(', ')}`;
  }
  
  return {
    status: missingOptional.length > 2 ? 'warning' : 'pass',
    message,
  };
}

async function testAlertingSystem() {
  // Test alert manager functionality
  try {
    // This would normally import the alert manager, but for the script we'll simulate
    const alertingConfigured = !!(
      process.env.SENTRY_DSN || 
      process.env.SLACK_WEBHOOK_URL || 
      process.env.ALERT_EMAIL_WEBHOOK
    );
    
    if (!alertingConfigured) {
      return {
        status: 'warning',
        message: 'No alerting channels configured (Sentry, Slack, or Email webhooks)',
      };
    }
    
    return {
      status: 'pass',
      message: 'Alert system configuration detected',
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Alert system test failed: ${error.message}`,
    };
  }
}

async function testWebVitalsIntegration() {
  // Test if web vitals monitoring is properly integrated
  try {
    const url = `${TEST_CONFIG.baseUrl}`;
    const response = await makeRequest(url);
    
    if (response.status !== 200) {
      return {
        status: 'warning',
        message: `Main page not accessible (status: ${response.status})`,
      };
    }
    
    // Check if the response contains references to web vitals
    const hasWebVitals = response.data.includes('web-vitals') || 
                        response.data.includes('WebVitalsMonitor');
    
    return {
      status: hasWebVitals ? 'pass' : 'warning',
      message: hasWebVitals ? 
        'Web vitals integration detected in main page' : 
        'Web vitals integration not detected (may be bundled)',
    };
  } catch (error) {
    return {
      status: 'warning',
      message: `Could not test web vitals integration: ${error.message}`,
    };
  }
}

async function testAdminDashboardAccess() {
  const url = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.adminDashboard}`;
  
  try {
    const response = await makeRequest(url);
    
    // Admin dashboard might require authentication, so 401/403 is acceptable
    const acceptableStatuses = [200, 401, 403];
    
    if (!acceptableStatuses.includes(response.status)) {
      return {
        status: 'warning',
        message: `Admin dashboard returned unexpected status: ${response.status}`,
      };
    }
    
    return {
      status: 'pass',
      message: `Admin dashboard accessible (status: ${response.status})`,
    };
  } catch (error) {
    return {
      status: 'warning',
      message: `Could not access admin dashboard: ${error.message}`,
    };
  }
}

// Load testing function
async function testLoadHandling() {
  console.log(`\\n${colors.cyan}🔄 Running load test...${colors.reset}`);
  
  const healthUrl = `${TEST_CONFIG.baseUrl}${TEST_CONFIG.endpoints.health}`;
  const concurrentRequests = 10;
  const requests = Array(concurrentRequests).fill().map(() => makeRequest(healthUrl));
  
  const startTime = Date.now();
  const results = await Promise.allSettled(requests);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
  const failed = results.length - successful;
  
  if (failed > concurrentRequests * 0.1) { // More than 10% failure rate
    return {
      status: 'warning',
      message: `Load test failed: ${failed}/${concurrentRequests} requests failed`,
      details: { successful, failed, duration: endTime - startTime },
    };
  }
  
  return {
    status: 'pass',
    message: `Load test passed: ${successful}/${concurrentRequests} requests successful in ${endTime - startTime}ms`,
    details: { successful, failed, duration: endTime - startTime },
  };
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.magenta}🚀 Starting Monitoring Systems Test Suite${colors.reset}`);
  console.log(`${colors.white}Testing against: ${TEST_CONFIG.baseUrl}${colors.reset}`);
  
  // Core functionality tests
  await runTest('Health Check Endpoint', testHealthEndpoint);
  await runTest('Performance Metrics Endpoint', testPerformanceMetricsEndpoint);
  await runTest('Business Metrics Endpoint', testBusinessMetricsEndpoint);
  
  // Configuration tests
  await runTest('Sentry Configuration', testSentryConfiguration);
  await runTest('Environment Configuration', testEnvironmentConfiguration);
  await runTest('Alerting System', testAlertingSystem);
  
  // Integration tests
  await runTest('Web Vitals Integration', testWebVitalsIntegration);
  await runTest('Admin Dashboard Access', testAdminDashboardAccess);
  
  // Performance tests
  await runTest('Load Handling', testLoadHandling);
  
  // Generate summary report
  generateSummaryReport();
}

function generateSummaryReport() {
  console.log(`\\n${colors.magenta}📊 Test Summary Report${colors.reset}`);
  console.log(`${colors.white}===============================================${colors.reset}`);
  
  const total = testResults.passed + testResults.failed + testResults.warnings;
  const passRate = ((testResults.passed / total) * 100).toFixed(1);
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${testResults.warnings}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  // Detailed results
  console.log(`\\n${colors.white}Detailed Results:${colors.reset}`);
  testResults.tests.forEach(test => {
    const statusIcon = test.status === 'pass' ? '✅' : 
                     test.status === 'warning' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${test.name}: ${test.message || test.status}`);
  });
  
  // Recommendations
  console.log(`\\n${colors.cyan}🔧 Recommendations:${colors.reset}`);
  
  if (testResults.failed > 0) {
    console.log(`${colors.red}• Fix failed tests before deploying to production${colors.reset}`);
  }
  
  if (testResults.warnings > 0) {
    console.log(`${colors.yellow}• Review warnings for optimal monitoring setup${colors.reset}`);
  }
  
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log(`${colors.yellow}• Configure Sentry DSN for production error tracking${colors.reset}`);
  }
  
  if (!process.env.SLACK_WEBHOOK_URL && !process.env.ALERT_EMAIL_WEBHOOK) {
    console.log(`${colors.yellow}• Configure alerting channels (Slack/Email) for production notifications${colors.reset}`);
  }
  
  console.log(`${colors.green}• Monitor the /api/health endpoint for continuous health checks${colors.reset}`);
  console.log(`${colors.green}• Set up external monitoring to call health checks every 1-5 minutes${colors.reset}`);
  console.log(`${colors.green}• Review monitoring dashboard regularly at /admin${colors.reset}`);
  
  // Exit with appropriate code
  const exitCode = testResults.failed > 0 ? 1 : 0;
  console.log(`\\n${colors.white}Test suite completed with exit code: ${exitCode}${colors.reset}`);
  
  // Save results to file
  saveTestResults();
  
  process.exit(exitCode);
}

function saveTestResults() {
  const fs = require('fs');
  const path = require('path');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed + testResults.warnings,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      passRate: ((testResults.passed / (testResults.passed + testResults.failed + testResults.warnings)) * 100).toFixed(1),
    },
    tests: testResults.tests,
    environment: {
      baseUrl: TEST_CONFIG.baseUrl,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
  
  const reportPath = path.join(process.cwd(), 'monitoring-test-report.json');
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\\n${colors.blue}📄 Test report saved to: ${reportPath}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not save test report: ${error.message}${colors.reset}`);
  }
}

// Run the test suite
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`${colors.red}💥 Test suite crashed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults,
  TEST_CONFIG,
};"
}]