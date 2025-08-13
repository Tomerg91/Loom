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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://secure5.tranzila.com https://direct.tranzila.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://vercel.live wss://vercel.live https://secure5.tranzila.com https://direct.tranzila.com https://*.supabase.co https://*.supabase.com wss://*.supabase.co wss://*.supabase.com; frame-src 'self' https://secure5.tranzila.com https://direct.tranzila.com; object-src 'none'; base-uri 'self'; form-action 'self' https://secure5.tranzila.com https://direct.tranzila.com;",
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

    // Optimize bundle size for Next.js 15
    if (!dev && !isServer) {
      // Next.js 15 has improved automatic chunking, but we can still customize
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Framework chunk for React/Next.js core
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI library chunk for better caching
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 35,
              enforce: true,
            },
            // Supabase chunk
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 32,
              enforce: true,
            },
            // Shared libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name: 'lib',
              priority: 30,
              chunks: 'all',
              minChunks: 2,
              maxSize: 244000, // 244KB max chunk size
            },
          },
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