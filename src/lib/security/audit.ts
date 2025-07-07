// Security audit utilities and vulnerability scanning

export interface SecurityAuditResult {
  score: number; // 0-100
  issues: SecurityIssue[];
  recommendations: string[];
  lastAuditDate: string;
}

export interface SecurityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'input_validation' | 'data_exposure' | 'configuration' | 'dependencies';
  title: string;
  description: string;
  recommendation: string;
  cweId?: string; // Common Weakness Enumeration ID
  affectedComponent?: string;
  riskScore: number; // 0-10
}

// Common vulnerability patterns
export const VULNERABILITY_PATTERNS = {
  // SQL Injection patterns
  sqlInjection: [
    /(\s|^)(select|insert|update|delete|drop|create|alter|exec|union|script)\s/gi,
    /(\s|^)(or|and)\s+\d+\s*=\s*\d+/gi,
    /(\s|^)(or|and)\s+'.*?'\s*=\s*'.*?'/gi,
    /--/g,
    /\/\*/g,
  ],
  
  // XSS patterns
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
  ],
  
  // Path traversal patterns
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
  ],
  
  // Command injection patterns
  commandInjection: [
    /;\s*(cat|ls|pwd|whoami|id|uname)/gi,
    /\|\s*(cat|ls|pwd|whoami|id|uname)/gi,
    /&&\s*(cat|ls|pwd|whoami|id|uname)/gi,
    /`.*`/g,
    /\$\(.*\)/g,
  ],
  
  // LDAP injection patterns
  ldapInjection: [
    /\(\|\(/g,
    /\)\(.*\)/g,
    /\*\)/g,
  ],
};

// Security headers validator
export function validateSecurityHeaders(headers: Record<string, string>): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  // Check for missing security headers
  const requiredHeaders = {
    'content-security-policy': 'Content Security Policy prevents XSS attacks',
    'x-frame-options': 'X-Frame-Options prevents clickjacking attacks',
    'x-content-type-options': 'X-Content-Type-Options prevents MIME sniffing',
    'strict-transport-security': 'HSTS enforces secure connections',
    'referrer-policy': 'Referrer Policy controls referrer information',
  };
  
  Object.entries(requiredHeaders).forEach(([header, description]) => {
    if (!headers[header] && !headers[header.toLowerCase()]) {
      issues.push({
        id: `missing-${header}`,
        severity: 'medium',
        category: 'configuration',
        title: `Missing ${header} header`,
        description: `The ${header} header is not set. ${description}.`,
        recommendation: `Add the ${header} header to improve security.`,
        riskScore: 6,
      });
    }
  });
  
  // Check CSP strength
  const csp = headers['content-security-policy'] || headers['Content-Security-Policy'];
  if (csp) {
    if (csp.includes("'unsafe-eval'")) {
      issues.push({
        id: 'csp-unsafe-eval',
        severity: 'high',
        category: 'configuration',
        title: 'CSP allows unsafe-eval',
        description: 'Content Security Policy allows unsafe-eval which can lead to XSS vulnerabilities.',
        recommendation: 'Remove unsafe-eval from CSP directive.',
        cweId: 'CWE-79',
        riskScore: 8,
      });
    }
    
    if (csp.includes("'unsafe-inline'")) {
      issues.push({
        id: 'csp-unsafe-inline',
        severity: 'medium',
        category: 'configuration',
        title: 'CSP allows unsafe-inline',
        description: 'Content Security Policy allows unsafe-inline which reduces XSS protection.',
        recommendation: 'Use nonces or hashes instead of unsafe-inline.',
        cweId: 'CWE-79',
        riskScore: 6,
      });
    }
  }
  
  return issues;
}

// Input validation audit
export function auditInputValidation(input: string, context: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  // Check for SQL injection patterns
  if (VULNERABILITY_PATTERNS.sqlInjection.some(pattern => pattern.test(input))) {
    issues.push({
      id: 'sql-injection-pattern',
      severity: 'critical',
      category: 'input_validation',
      title: 'Potential SQL Injection',
      description: `Input contains patterns that may indicate SQL injection attempts in ${context}.`,
      recommendation: 'Use parameterized queries and input validation.',
      cweId: 'CWE-89',
      riskScore: 10,
    });
  }
  
  // Check for XSS patterns
  if (VULNERABILITY_PATTERNS.xss.some(pattern => pattern.test(input))) {
    issues.push({
      id: 'xss-pattern',
      severity: 'high',
      category: 'input_validation',
      title: 'Potential XSS Attack',
      description: `Input contains patterns that may indicate XSS attempts in ${context}.`,
      recommendation: 'Sanitize and validate all user input.',
      cweId: 'CWE-79',
      riskScore: 9,
    });
  }
  
  // Check for path traversal patterns
  if (VULNERABILITY_PATTERNS.pathTraversal.some(pattern => pattern.test(input))) {
    issues.push({
      id: 'path-traversal-pattern',
      severity: 'high',
      category: 'input_validation',
      title: 'Potential Path Traversal',
      description: `Input contains path traversal patterns in ${context}.`,
      recommendation: 'Validate file paths and use safe file operations.',
      cweId: 'CWE-22',
      riskScore: 8,
    });
  }
  
  return issues;
}

// Authentication security audit
export function auditAuthentication(config: {
  passwordPolicy?: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  sessionConfig?: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
    maxAge: number;
  };
  mfaEnabled?: boolean;
  rateLimitingEnabled?: boolean;
}): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  // Password policy audit
  if (config.passwordPolicy) {
    const policy = config.passwordPolicy;
    
    if (policy.minLength < 8) {
      issues.push({
        id: 'weak-password-length',
        severity: 'medium',
        category: 'authentication',
        title: 'Weak Password Length Requirement',
        description: 'Password minimum length is below recommended 8 characters.',
        recommendation: 'Increase minimum password length to at least 8 characters.',
        cweId: 'CWE-521',
        riskScore: 6,
      });
    }
    
    if (!policy.requireUppercase || !policy.requireLowercase || 
        !policy.requireNumbers || !policy.requireSpecialChars) {
      issues.push({
        id: 'weak-password-complexity',
        severity: 'medium',
        category: 'authentication',
        title: 'Insufficient Password Complexity',
        description: 'Password policy does not require sufficient character variety.',
        recommendation: 'Require uppercase, lowercase, numbers, and special characters.',
        cweId: 'CWE-521',
        riskScore: 6,
      });
    }
  }
  
  // Session configuration audit
  if (config.sessionConfig) {
    const session = config.sessionConfig;
    
    if (!session.secure) {
      issues.push({
        id: 'insecure-session-cookies',
        severity: 'high',
        category: 'authentication',
        title: 'Session Cookies Not Secure',
        description: 'Session cookies are not marked as secure.',
        recommendation: 'Mark session cookies as secure to prevent transmission over HTTP.',
        cweId: 'CWE-614',
        riskScore: 8,
      });
    }
    
    if (!session.httpOnly) {
      issues.push({
        id: 'session-cookies-not-httponly',
        severity: 'medium',
        category: 'authentication',
        title: 'Session Cookies Not HttpOnly',
        description: 'Session cookies are accessible via JavaScript.',
        recommendation: 'Mark session cookies as HttpOnly to prevent XSS access.',
        cweId: 'CWE-1004',
        riskScore: 7,
      });
    }
    
    if (session.sameSite !== 'Strict' && session.sameSite !== 'Lax') {
      issues.push({
        id: 'session-cookies-samesite',
        severity: 'medium',
        category: 'authentication',
        title: 'Session Cookies SameSite Not Set',
        description: 'Session cookies do not have proper SameSite protection.',
        recommendation: 'Set SameSite to Strict or Lax for CSRF protection.',
        cweId: 'CWE-352',
        riskScore: 6,
      });
    }
  }
  
  // MFA audit
  if (!config.mfaEnabled) {
    issues.push({
      id: 'mfa-not-enabled',
      severity: 'medium',
      category: 'authentication',
      title: 'Multi-Factor Authentication Not Enabled',
      description: 'Multi-factor authentication is not implemented.',
      recommendation: 'Implement MFA for enhanced account security.',
      cweId: 'CWE-308',
      riskScore: 7,
    });
  }
  
  // Rate limiting audit
  if (!config.rateLimitingEnabled) {
    issues.push({
      id: 'rate-limiting-not-enabled',
      severity: 'medium',
      category: 'authentication',
      title: 'Rate Limiting Not Implemented',
      description: 'Authentication endpoints lack rate limiting protection.',
      recommendation: 'Implement rate limiting to prevent brute force attacks.',
      cweId: 'CWE-307',
      riskScore: 7,
    });
  }
  
  return issues;
}

// Data exposure audit
export function auditDataExposure(response: unknown, sensitiveFields: string[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  
  function checkObject(obj: unknown, path = ''): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    Object.keys(obj).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check for sensitive field exposure
      if (sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()) ||
        currentPath.toLowerCase().includes(field.toLowerCase())
      )) {
        issues.push({
          id: `data-exposure-${currentPath}`,
          severity: 'high',
          category: 'data_exposure',
          title: 'Sensitive Data Exposure',
          description: `Potentially sensitive field "${currentPath}" found in API response.`,
          recommendation: 'Remove or mask sensitive data from API responses.',
          cweId: 'CWE-200',
          riskScore: 8,
        });
      }
      
      // Recursively check nested objects
      if (typeof obj[key] === 'object') {
        checkObject(obj[key], currentPath);
      }
    });
  }
  
  checkObject(response);
  return issues;
}

// Comprehensive security audit
export function performSecurityAudit(config: {
  headers?: Record<string, string>;
  inputs?: Array<{ value: string; context: string }>;
  authConfig?: unknown;
  apiResponses?: Array<{ response: unknown; sensitiveFields: string[] }>;
}): SecurityAuditResult {
  const allIssues: SecurityIssue[] = [];
  
  // Audit headers
  if (config.headers) {
    allIssues.push(...validateSecurityHeaders(config.headers));
  }
  
  // Audit inputs
  if (config.inputs) {
    config.inputs.forEach(({ value, context }) => {
      allIssues.push(...auditInputValidation(value, context));
    });
  }
  
  // Audit authentication
  if (config.authConfig) {
    allIssues.push(...auditAuthentication(config.authConfig));
  }
  
  // Audit data exposure
  if (config.apiResponses) {
    config.apiResponses.forEach(({ response, sensitiveFields }) => {
      allIssues.push(...auditDataExposure(response, sensitiveFields));
    });
  }
  
  // Calculate security score
  const totalPossibleScore = 100;
  const severityWeights = { critical: 25, high: 15, medium: 10, low: 5 };
  const penaltyScore = allIssues.reduce((sum, issue) => 
    sum + severityWeights[issue.severity], 0
  );
  
  const score = Math.max(0, totalPossibleScore - penaltyScore);
  
  // Generate recommendations
  const recommendations = [
    'Implement comprehensive input validation and sanitization',
    'Use parameterized queries to prevent SQL injection',
    'Set proper security headers (CSP, HSTS, X-Frame-Options)',
    'Enable rate limiting on all authentication endpoints',
    'Implement multi-factor authentication',
    'Regular security audits and penetration testing',
    'Keep dependencies updated and scan for vulnerabilities',
    'Use HTTPS everywhere and enforce secure connections',
    'Implement proper session management',
    'Regular backup and disaster recovery testing',
  ];
  
  return {
    score,
    issues: allIssues,
    recommendations,
    lastAuditDate: new Date().toISOString(),
  };
}

// Security monitoring
export class SecurityMonitor {
  private static events: Array<{
    timestamp: string;
    type: 'auth_failure' | 'rate_limit' | 'suspicious_input' | 'access_denied';
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }> = [];
  
  static logSecurityEvent(
    type: 'auth_failure' | 'rate_limit' | 'suspicious_input' | 'access_denied',
    details: Record<string, unknown>,
    request?: { ip?: string; userAgent?: string }
  ) {
    this.events.push({
      timestamp: new Date().toISOString(),
      type,
      details,
      ipAddress: request?.ip,
      userAgent: request?.userAgent,
    });
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    // In production, this should send to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      console.warn('Security Event:', { type, details, request });
    }
  }
  
  static getSecurityEvents(since?: string) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.events.filter(event => new Date(event.timestamp) >= sinceDate);
  }
  
  static detectAnomalies() {
    const recentEvents = this.getSecurityEvents();
    const anomalies: string[] = [];
    
    // Check for brute force attacks
    const authFailures = recentEvents.filter(e => e.type === 'auth_failure');
    const authFailuresByIP = authFailures.reduce((acc, event) => {
      const ip = event.ipAddress || 'unknown';
      acc[ip] = (acc[ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(authFailuresByIP).forEach(([ip, count]) => {
      if (count > 10) {
        anomalies.push(`Potential brute force attack from IP: ${ip} (${count} failed attempts)`);
      }
    });
    
    // Check for suspicious patterns
    const suspiciousInputs = recentEvents.filter(e => e.type === 'suspicious_input');
    if (suspiciousInputs.length > 50) {
      anomalies.push(`High volume of suspicious input patterns detected (${suspiciousInputs.length} events)`);
    }
    
    return anomalies;
  }
}