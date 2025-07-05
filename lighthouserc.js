module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/auth/signin',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/sessions',
      ],
      startServerCommand: 'npm start',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:pwa': 'off',
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Security
        'is-on-https': 'error',
        'uses-http2': 'warn',
        'redirects-http': 'error',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        'bypass': 'error',
        'document-title': 'error',
        'duplicate-id-aria': 'error',
        'frame-title': 'error',
        'heading-order': 'warn',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'link-name': 'error',
        'list': 'error',
        'listitem': 'error',
        'meta-viewport': 'error',
        'object-alt': 'error',
        'tabindex': 'error',
        'td-headers-attr': 'error',
        'th-has-data-cells': 'error',
        'valid-lang': 'error',
        'video-caption': 'error',
        
        // Performance
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        'preload-lcp-image': 'warn',
        'total-byte-weight': ['warn', { maxNumericValue: 1600000 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};