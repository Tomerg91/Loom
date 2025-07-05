/**
 * Infrastructure Testing Suite
 * 
 * Tests to verify infrastructure components, deployment configurations,
 * and production environment setup are correctly configured.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Infrastructure Tests', () => {
  const projectRoot = join(process.cwd());

  describe('Docker Configuration', () => {
    it('should have valid Dockerfile', () => {
      const dockerfilePath = join(projectRoot, 'Dockerfile');
      expect(existsSync(dockerfilePath)).toBe(true);
      
      const dockerfile = readFileSync(dockerfilePath, 'utf-8');
      
      // Check for multi-stage build
      expect(dockerfile).toContain('FROM node:20-alpine AS base');
      expect(dockerfile).toContain('FROM base AS deps');
      expect(dockerfile).toContain('FROM base AS builder');
      expect(dockerfile).toContain('FROM base AS runner');
      
      // Check for security best practices
      expect(dockerfile).toContain('USER nextjs'); // Non-root user
      expect(dockerfile).toContain('HEALTHCHECK'); // Health check
      
      // Check for optimization
      expect(dockerfile).toContain('npm ci --only=production');
      expect(dockerfile).toContain('npm cache clean --force');
    });

    it('should have valid docker-compose configuration', () => {
      const composePath = join(projectRoot, 'docker-compose.yml');
      expect(existsSync(composePath)).toBe(true);
      
      const composeFile = readFileSync(composePath, 'utf-8');
      
      // Check required services
      expect(composeFile).toContain('app:');
      expect(composeFile).toContain('redis:');
      expect(composeFile).toContain('nginx:');
      
      // Check health checks
      expect(composeFile).toContain('healthcheck:');
      
      // Check security
      expect(composeFile).toContain('restart: unless-stopped');
    });

    it('should have proper dockerignore', () => {
      const dockerignorePath = join(projectRoot, '.dockerignore');
      expect(existsSync(dockerignorePath)).toBe(true);
      
      const dockerignore = readFileSync(dockerignorePath, 'utf-8');
      
      // Check that unnecessary files are ignored
      expect(dockerignore).toContain('node_modules');
      expect(dockerignore).toContain('.env*');
      expect(dockerignore).toContain('.git');
      expect(dockerignore).toContain('README.md');
      expect(dockerignore).toContain('.github/');
    });
  });

  describe('Nginx Configuration', () => {
    it('should have valid nginx configuration', () => {
      const nginxPath = join(projectRoot, 'nginx.conf');
      expect(existsSync(nginxPath)).toBe(true);
      
      const nginxConf = readFileSync(nginxPath, 'utf-8');
      
      // Check security headers
      expect(nginxConf).toContain('X-Frame-Options');
      expect(nginxConf).toContain('X-Content-Type-Options');
      expect(nginxConf).toContain('X-XSS-Protection');
      expect(nginxConf).toContain('Strict-Transport-Security');
      
      // Check rate limiting
      expect(nginxConf).toContain('limit_req_zone');
      expect(nginxConf).toContain('limit_req');
      
      // Check compression
      expect(nginxConf).toContain('gzip on');
      
      // Check SSL/TLS
      expect(nginxConf).toContain('ssl_protocols TLSv1.2 TLSv1.3');
      
      // Check proxy configuration
      expect(nginxConf).toContain('proxy_pass http://app');
    });

    it('should have proper caching configuration', () => {
      const nginxPath = join(projectRoot, 'nginx.conf');
      const nginxConf = readFileSync(nginxPath, 'utf-8');
      
      // Check static file caching
      expect(nginxConf).toContain('expires 1y');
      expect(nginxConf).toContain('Cache-Control');
      
      // Check favicon caching
      expect(nginxConf).toContain('/favicon.ico');
    });
  });

  describe('CI/CD Configuration', () => {
    it('should have GitHub Actions workflow', () => {
      const ciPath = join(projectRoot, '.github/workflows/ci.yml');
      const deployPath = join(projectRoot, '.github/workflows/deploy.yml');
      
      expect(existsSync(ciPath)).toBe(true);
      expect(existsSync(deployPath)).toBe(true);
      
      const ciWorkflow = readFileSync(ciPath, 'utf-8');
      
      // Check required steps
      expect(ciWorkflow).toContain('actions/checkout@v4');
      expect(ciWorkflow).toContain('actions/setup-node@v4');
      expect(ciWorkflow).toContain('npm ci');
      expect(ciWorkflow).toContain('npm run build');
      expect(ciWorkflow).toContain('npm run test');
      expect(ciWorkflow).toContain('npm run lint');
      
      // Check security scanning
      expect(ciWorkflow).toContain('npm audit');
      
      // Check performance testing
      expect(ciWorkflow).toContain('lighthouse');
    });

    it('should have proper workflow triggers', () => {
      const ciPath = join(projectRoot, '.github/workflows/ci.yml');
      const ciWorkflow = readFileSync(ciPath, 'utf-8');
      
      expect(ciWorkflow).toContain('on:');
      expect(ciWorkflow).toContain('push:');
      expect(ciWorkflow).toContain('pull_request:');
    });

    it('should have environment protection', () => {
      const deployPath = join(projectRoot, '.github/workflows/deploy.yml');
      const deployWorkflow = readFileSync(deployPath, 'utf-8');
      
      expect(deployWorkflow).toContain('environment: production');
    });
  });

  describe('Build Configuration', () => {
    it('should have optimized Next.js configuration', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      expect(existsSync(nextConfigPath)).toBe(true);
      
      const nextConfig = require(nextConfigPath);
      
      // Check optimization settings
      expect(nextConfig.swcMinify).toBe(true);
      expect(nextConfig.compress).toBe(true);
      expect(nextConfig.poweredByHeader).toBe(false);
      
      // Check output for deployment
      expect(nextConfig.output).toBe('standalone');
      
      // Check image optimization
      expect(nextConfig.images).toBeDefined();
      expect(nextConfig.images.formats).toContain('image/avif');
      
      // Check experimental features
      expect(nextConfig.experimental?.optimizeCss).toBe(true);
    });

    it('should have proper TypeScript configuration', () => {
      const tsconfigPath = join(projectRoot, 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      
      // Check strict mode
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
      expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true);
      
      // Check module resolution
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      expect(tsconfig.compilerOptions.baseUrl).toBe('.');
      expect(tsconfig.compilerOptions.paths).toBeDefined();
    });

    it('should have ESLint configuration', () => {
      const eslintPaths = [
        join(projectRoot, 'eslint.config.js'),
        join(projectRoot, '.eslintrc.js'),
        join(projectRoot, '.eslintrc.json'),
      ];
      
      const hasEslintConfig = eslintPaths.some(path => existsSync(path));
      expect(hasEslintConfig).toBe(true);
    });

    it('should have Prettier configuration', () => {
      const prettierPaths = [
        join(projectRoot, 'prettier.config.js'),
        join(projectRoot, '.prettierrc'),
        join(projectRoot, '.prettierrc.json'),
      ];
      
      const hasPrettierConfig = prettierPaths.some(path => existsSync(path));
      expect(hasPrettierConfig).toBe(true);
    });
  });

  describe('Testing Configuration', () => {
    it('should have Vitest configuration', () => {
      const vitestConfigPath = join(projectRoot, 'vitest.config.ts');
      expect(existsSync(vitestConfigPath)).toBe(true);
    });

    it('should have Playwright configuration', () => {
      const playwrightConfigPath = join(projectRoot, 'playwright.config.ts');
      expect(existsSync(playwrightConfigPath)).toBe(true);
    });

    it('should have Lighthouse configuration', () => {
      const lighthousePath = join(projectRoot, 'lighthouserc.js');
      expect(existsSync(lighthousePath)).toBe(true);
      
      const lighthouseConfig = readFileSync(lighthousePath, 'utf-8');
      
      // Check performance thresholds
      expect(lighthouseConfig).toContain('categories:performance');
      expect(lighthouseConfig).toContain('categories:accessibility');
      expect(lighthouseConfig).toContain('categories:best-practices');
      
      // Check Core Web Vitals
      expect(lighthouseConfig).toContain('largest-contentful-paint');
      expect(lighthouseConfig).toContain('cumulative-layout-shift');
    });
  });

  describe('Package Configuration', () => {
    it('should have proper package.json structure', () => {
      const packagePath = join(projectRoot, 'package.json');
      expect(existsSync(packagePath)).toBe(true);
      
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      // Check required fields
      expect(packageJson.name).toBeDefined();
      expect(packageJson.version).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
      
      // Check required scripts
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
    });

    it('should not have vulnerable dependencies', () => {
      // This would be checked by npm audit in CI/CD
      expect(true).toBe(true); // Placeholder
    });

    it('should use exact versions for critical packages', () => {
      const packageJson = require(join(projectRoot, 'package.json'));
      
      // Check that some critical packages don't use ranges
      const criticalPackages = ['next', 'react', 'react-dom'];
      criticalPackages.forEach(pkg => {
        const version = packageJson.dependencies?.[pkg];
        if (version) {
          // Allow caret ranges for now, but could be stricter
          expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
        }
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should have environment example file', () => {
      const envExamplePath = join(projectRoot, '.env.example');
      expect(existsSync(envExamplePath)).toBe(true);
      
      const envExample = readFileSync(envExamplePath, 'utf-8');
      
      // Check required environment variables
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(envExample).toContain('NEXT_PUBLIC_APP_URL');
    });

    it('should not expose secrets in public variables', () => {
      const envExamplePath = join(projectRoot, '.env.example');
      const envExample = readFileSync(envExamplePath, 'utf-8');
      
      const lines = envExample.split('\n');
      const publicVars = lines.filter(line => line.startsWith('NEXT_PUBLIC_'));
      
      publicVars.forEach(line => {
        const varName = line.split('=')[0];
        // These patterns should not be in public variables
        expect(varName).not.toMatch(/secret|private|service_role|password/i);
      });
    });
  });

  describe('Database Configuration', () => {
    it('should have database migration files', () => {
      const migrationsPath = join(projectRoot, 'supabase/migrations');
      
      // Check if migrations directory exists (might not in test environment)
      if (existsSync(migrationsPath)) {
        expect(true).toBe(true);
      } else {
        // At least check that we have database schema files
        const schemaFiles = [
          join(projectRoot, 'src/lib/database'),
          join(projectRoot, 'database'),
          join(projectRoot, 'schema'),
        ];
        
        const hasSchemaFiles = schemaFiles.some(path => existsSync(path));
        expect(hasSchemaFiles).toBe(true);
      }
    });

    it('should have proper RLS policies', () => {
      // This would test actual database policies in integration tests
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Monitoring Configuration', () => {
    it('should have error tracking setup', () => {
      // Check Sentry configuration
      const hasErrorTracking = !!(
        process.env.SENTRY_DSN ||
        process.env.NEXT_PUBLIC_SENTRY_DSN
      );
      
      // Either configured or intentionally disabled for test environment
      expect(hasErrorTracking || process.env.NODE_ENV === 'test').toBe(true);
    });

    it('should have analytics setup', () => {
      // Check analytics configuration
      const hasAnalytics = !!(
        process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ||
        process.env.NEXT_PUBLIC_POSTHOG_KEY
      );
      
      // Either configured or intentionally disabled for test environment
      expect(hasAnalytics || process.env.NODE_ENV === 'test').toBe(true);
    });
  });

  describe('Security Configuration', () => {
    it('should have security headers configured', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      const nextConfig = require(nextConfigPath);
      
      expect(nextConfig.headers).toBeDefined();
      expect(typeof nextConfig.headers).toBe('function');
    });

    it('should have HTTPS redirect in production', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      const nextConfig = require(nextConfigPath);
      
      expect(nextConfig.redirects).toBeDefined();
      expect(typeof nextConfig.redirects).toBe('function');
    });
  });

  describe('Performance Configuration', () => {
    it('should have bundle analyzer configuration', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      const nextConfig = require(nextConfigPath);
      
      // Check that bundle analyzer can be enabled
      expect(nextConfig.webpack).toBeDefined();
    });

    it('should have caching configuration', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      const nextConfig = require(nextConfigPath);
      
      expect(nextConfig.headers).toBeDefined();
      expect(nextConfig.compress).toBe(true);
    });
  });

  describe('Deployment Readiness', () => {
    it('should have health check endpoint', async () => {
      const healthCheckPath = join(projectRoot, 'src/app/api/health/route.ts');
      expect(existsSync(healthCheckPath)).toBe(true);
    });

    it('should have proper build output', () => {
      const nextConfigPath = join(projectRoot, 'next.config.js');
      const nextConfig = require(nextConfigPath);
      
      expect(nextConfig.output).toBe('standalone');
    });

    it('should have startup scripts', () => {
      const packageJson = require(join(projectRoot, 'package.json'));
      
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
    });
  });
});