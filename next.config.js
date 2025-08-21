/** @type {import('next').NextConfig} */
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
      // Static CSS files - Fix MIME type issues
      {
        source: '/_next/static/css/(.*\\.css)',
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
      // Supabase storage - Matches any subdomain of supabase.co
      // Note: In production, you should replace this with your specific Supabase project URL
      // for better security: e.g., 'your-project-ref.supabase.co'
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
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
            // This ensures CSS files are never included in JS bundles
            styles: {
              test: /\.css$/,
              name: 'styles',
              chunks: 'all',
              enforce: true,
              priority: 100, // Highest priority to prevent CSS from being bundled with JS
              // This will create a separate CSS chunk that Next.js can properly handle
              reuseExistingChunk: true,
            },
            
            // React/Next.js framework chunk (highest priority after CSS)
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|next)[\\/].*\.(js|jsx|ts|tsx)$/,
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Charts library (recharts is heavy - separate chunk)
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-.*|victory-.*)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'charts',
              chunks: 'all',
              priority: 45,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // UI component libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|react-day-picker)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'ui',
              chunks: 'all',
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Authentication & database
            auth: {
              test: /[\\/]node_modules[\\/](@supabase|@tanstack\/react-query|zustand)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'auth',
              chunks: 'all',
              priority: 38,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Internationalization
            i18n: {
              test: /[\\/]node_modules[\\/](next-intl|date-fns)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'i18n',
              chunks: 'all',
              priority: 36,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Form handling libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'forms',
              chunks: 'all',
              priority: 34,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Utilities and smaller libraries
            utils: {
              test: /[\\/]node_modules[\\/](clsx|class-variance-authority|tailwind-merge|tailwindcss-animate)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'utils',
              chunks: 'all',
              priority: 32,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // PDF and file processing
            files: {
              test: /[\\/]node_modules[\\/](pdf-lib|qrcode|speakeasy|bcryptjs)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'files',
              chunks: 'all',
              priority: 30,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Monitoring and analytics
            monitoring: {
              test: /[\\/]node_modules[\\/](@sentry|web-vitals)[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'monitoring',
              chunks: 'all',
              priority: 28,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Common vendor libraries (lower priority) - Only include JS files
            vendor: {
              test: /[\\/]node_modules[\\/].*\.(js|jsx|ts|tsx)$/,
              name: 'vendor',
              chunks: 'all',
              priority: 20,
              minChunks: 2,
              maxSize: 244000,
              reuseExistingChunk: true,
            },
            
            // Default group for everything else - Only include JS files
            default: {
              test: /\.(js|jsx|ts|tsx)$/,
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              maxSize: 244000,
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
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
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