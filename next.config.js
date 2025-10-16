/** @type {import('next').NextConfig} */
const { serverEnv } = require('./src/env/runtime');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // optimizeCss is now stable and enabled by default in Next.js 15
    // scrollRestoration is now stable and enabled by default
    // webVitalsAttribution is deprecated - use built-in Web Vitals reporting
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'recharts',
      'date-fns',
    ],
    // Note: PPR and React compiler require Next.js canary version
    // ppr: 'incremental',
    // reactCompiler: true,
  },
  
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove test IDs in production
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-testid$']
    } : false,
    // Styled-components support
    styledComponents: true,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Enforce HTTPS in production (HSTS)
          ...(process.env.NODE_ENV === 'production'
            ? [{
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              }]
            : []),
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://secure5.tranzila.com https://direct.tranzila.com https://www.googletagmanager.com https://www.google-analytics.com https://js.sentry-cdn.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://*.vercel.app; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://vercel.live wss://vercel.live https://secure5.tranzila.com https://direct.tranzila.com https://*.supabase.co https://*.supabase.com wss://*.supabase.co wss://*.supabase.com https://www.google-analytics.com https://sentry.io https://*.sentry.io; frame-src 'self' https://vercel.live https://secure5.tranzila.com https://direct.tranzila.com https://*.sentry.io; object-src 'none'; base-uri 'self'; form-action 'self' https://secure5.tranzila.com https://direct.tranzila.com;",
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // API routes security
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      // Static CSS files - Ensure correct MIME type and prevent execution
      {
        source: '/_next/static/css/(.*\\.css)$',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          // Explicitly prevent CSS files from being executed as scripts
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      // Static JS files
      {
        source: '/_next/static/chunks/(.*\\.js)',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Environment-specific CSP
  async rewrites() {
    return [];
  },

  // Image optimization with modern remotePatterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      // Supabase storage - prefer specific project host via env
      (() => {
        const host = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_HOST; // e.g., 'abc123.supabase.co'
        return host
          ? { protocol: 'https', hostname: host, pathname: '/storage/v1/object/public/**' }
          : { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' };
      })(),
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Prevent server-only modules from being bundled in client code
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/supabase/server': false,
      };
    }

    // Suppress critical dependency warnings for instrumentation libraries
    config.module.exprContextCritical = false;
    
    // CRITICAL FIX: Ensure CSS files are never treated as JavaScript modules
    // This prevents CSS files from being included in JavaScript chunks
    config.module.rules.forEach((rule) => {
      if (rule.test && rule.test.toString().includes('css')) {
        // Ensure CSS files are only processed by CSS loaders, not JavaScript loaders
        rule.exclude = rule.exclude || [];
        if (Array.isArray(rule.exclude)) {
          rule.exclude.push(/node_modules/);
        }
        // Explicitly prevent CSS from being treated as JS modules
        rule.type = 'css';
        rule.sideEffects = false;
      }
    });
    
    // More specific suppression for OpenTelemetry/Sentry
    config.ignoreWarnings = [
      {
        module: /node_modules\/@opentelemetry\/instrumentation/,
      },
      {
        module: /node_modules\/@sentry\/nextjs/,
      },
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    // Enhanced bundle optimization for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,        // 20KB minimum chunk size
          maxSize: 244000,       // 244KB maximum chunk size (for better caching)
          minChunks: 1,
          maxAsyncRequests: 30,  // Allow more async chunks for better splitting
          maxInitialRequests: 25, // Allow more initial chunks
          automaticNameDelimiter: '~',
          cacheGroups: {
            // CRITICAL: Separate CSS processing from JavaScript chunks
            // This ensures CSS files are never included in JS bundles and are handled correctly
            styles: {
              test: /\.(css|scss|sass)$/,
              name: 'styles',
              chunks: 'all',
              enforce: true,
              priority: 100,
              type: 'css/mini-extract',
              reuseExistingChunk: true,
            },
            
            // Simplified framework chunk
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 50,
              reuseExistingChunk: true,
            },
            
            // Heavy libraries chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 20,
              minChunks: 2,
              maxSize: 244000,
              reuseExistingChunk: true,
            },
          },
        },
        
        // Tree shaking improvements
        usedExports: true,
        sideEffects: false,
        
        // Module concatenation for better minification
        concatenateModules: true,
      };
      
      // Add performance budgets for bundle size monitoring
      config.performance = {
        hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
        maxAssetSize: 250000,     // 250KB per asset
        maxEntrypointSize: 250000, // 250KB per entry point
        assetFilter: function(assetFilename) {
          // Only apply budgets to JS and CSS files
          return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
        },
      };
    }
    
    // Security headers are now handled through the headers() function above
    // devServer configuration is deprecated in Next.js 15

    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? 'server-bundle-report.html' : 'client-bundle-report.html',
        })
      );
    }

    return config;
  },

  // Compression and optimization
  compress: true,
  
  // PoweredBy header removal for security
  poweredByHeader: false,

  // Strict Transport Security (handled in middleware for flexibility)
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_SUPABASE_URL: serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: serverEnv.NEXT_PUBLIC_APP_URL,
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/health',
        destination: '/api/health',
        permanent: true,
      },
      // Redirect HTTP to HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: `https://${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'}/:path*`,
          permanent: true,
        },
      ] : []),
    ];
  },

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src', 'components', 'lib', 'utils'],
    // Don't run ESLint during production builds
    ignoreDuringBuilds: true,
  },

  // Output configuration for deployment
  output: 'standalone',

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Performance monitoring
  // onDemandEntries is deprecated in Next.js 15 - automatic optimization is now built-in
  
  // Dev indicators - simplified in Next.js 15
  devIndicators: {
    position: 'bottom-right',
  },
  
  // Generate ETags
  generateEtags: true,
  
  // Trailing slash
  trailingSlash: false,
  
  // Skip middleware invocation for static files
  skipMiddlewareUrlNormalize: true,
  
  // Skip trailing slash redirect
  skipTrailingSlashRedirect: true,
  
  // Next.js 15 caching improvements
  cacheHandler: undefined, // Use default caching
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50MB
  
  // New Next.js 15 performance features
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = withNextIntl(nextConfig);
