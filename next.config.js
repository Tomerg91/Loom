/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    optimizeCss: true,
    scrollRestoration: true,
    webVitalsAttribution: ['CLS', 'LCP'],
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
    ],
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
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

  // Image optimization
  images: {
    domains: [
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
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
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: -5,
            reuseExistingChunk: true,
            chunks: 'all',
          },
        },
      };
    }
    
    // Security headers for webpack dev server
    if (dev && !isServer) {
      config.devServer = {
        ...config.devServer,
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        },
      };
    }

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
          destination: 'https://your-domain.com/:path*',
          permanent: true,
        },
      ] : []),
    ];
  },

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
    // Don't run ESLint during production builds
    ignoreDuringBuilds: false,
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
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Dev indicators
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
};

module.exports = withNextIntl(nextConfig);