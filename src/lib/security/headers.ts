import { NextRequest, NextResponse } from 'next/server';

// Security headers configuration
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://*.supabase.co https://*.supabase.com ws://localhost:* wss://localhost:*",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; '),

  // Security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cross-Origin headers
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// Development environment adjustments
const DEV_CSP_OVERRIDES = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co ws://localhost:* wss://localhost:* http://localhost:*",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

export function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const headers = isDevelopment 
    ? { ...SECURITY_HEADERS, ...DEV_CSP_OVERRIDES }
    : SECURITY_HEADERS;

  // Apply all security headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add security headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

// Rate limiting configuration
export const RATE_LIMITS = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later',
  },
  
  // API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests, please try again later',
  },
  
  // Session booking
  booking: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 booking attempts per window
    message: 'Too many booking attempts, please try again later',
  },
};

// Input validation and sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:(?!image\/)/gi, '') // Allow only image data URLs
    .slice(0, 10000); // Limit length
}

// SQL injection prevention patterns
export const SQL_INJECTION_PATTERNS = [
  /(\s|^)(select|insert|update|delete|drop|create|alter|exec|union|script)\s/gi,
  /(\s|^)(or|and)\s+\d+\s*=\s*\d+/gi,
  /(\s|^)(or|and)\s+'.*?'\s*=\s*'.*?'/gi,
  /(\s|^)(or|and)\s+".*?"\s*=\s*".*?"/gi,
  /--/g,
  /\/\*/g,
  /\*\//g,
];

export function containsSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

// XSS prevention patterns
export const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
];

export function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

// XSS prevention
export function sanitizeHTML(html: string): string {
  // Simple HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken && token.length === 64;
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123456/, // Sequential numbers
    /qwerty/i, // Common keyboard patterns
    /password/i, // Common words
    /admin/i,
    /user/i,
  ];
  
  if (weakPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password contains common weak patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// File upload security
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain'],
};

export const MAX_FILE_SIZES = {
  avatar: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
};

export function validateFileUpload(file: File, type: 'avatar' | 'document'): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check file type
  const allowedTypes = type === 'avatar' ? ALLOWED_FILE_TYPES.images : ALLOWED_FILE_TYPES.documents;
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file size
  const maxSize = MAX_FILE_SIZES[type];
  if (file.size > maxSize) {
    errors.push(`File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
  
  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|dll)$/i,
    /\.(php|jsp|asp|js|html)$/i,
    /\.\./, // Path traversal
    /%/, // URL encoding
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    errors.push('Suspicious filename detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}