import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routing } from '@/i18n/routing';

// Mock Next.js modules for routing integration test
const mockRequest = (pathname: string, headers: Record<string, string> = {}) => ({
  nextUrl: { pathname, clone: () => ({ pathname }) },
  headers: new Map(Object.entries({
    'accept-language': 'he,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (compatible test browser)',
    ...headers,
  })),
  cookies: new Map(),
  geo: { country: 'IL' },
  ip: '127.0.0.1',
  url: `http://localhost:3000${pathname}`,
});

const mockResponse = {
  redirect: vi.fn(),
  rewrite: vi.fn(),
  next: vi.fn(() => ({ headers: new Map() })),
};

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => ({ redirect: url, headers: new Map() }),
    rewrite: (url: string) => ({ rewrite: url, headers: new Map() }),
    next: () => ({ next: true, headers: new Map() }),
  },
}));

describe('Language Routing Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Locale Routing', () => {
    it('should have Hebrew as the default locale in routing config', () => {
      expect(routing.defaultLocale).toBe('he');
    });

    it('should include both supported locales', () => {
      expect(routing.locales).toEqual(['en', 'he']);
      expect(routing.locales).toContain('he');
      expect(routing.locales).toContain('en');
    });

    it('should enforce locale prefixes always', () => {
      expect(routing.localePrefix).toBe('always');
    });

    it('should have locale detection enabled', () => {
      expect(routing.localeDetection).toBe(true);
    });
  });

  describe('URL Pattern Validation', () => {
    it('should validate Hebrew locale URLs', () => {
      const hebrewPaths = [
        '/he',
        '/he/',
        '/he/dashboard',
        '/he/sessions/123',
        '/he/admin/users',
        '/he/auth/signin',
      ];

      hebrewPaths.forEach(path => {
        const segments = path.split('/').filter(Boolean);
        const locale = segments[0];
        expect(routing.locales.includes(locale as 'en' | 'he')).toBe(true);
      });
    });

    it('should validate English locale URLs', () => {
      const englishPaths = [
        '/en',
        '/en/',
        '/en/dashboard',
        '/en/sessions/123',
        '/en/admin/users',
        '/en/auth/signin',
      ];

      englishPaths.forEach(path => {
        const segments = path.split('/').filter(Boolean);
        const locale = segments[0];
        expect(routing.locales.includes(locale as 'en' | 'he')).toBe(true);
      });
    });

    it('should reject invalid locale URLs', () => {
      const invalidPaths = [
        '/fr/dashboard',
        '/es/sessions',
        '/de/admin',
        '/ar/profile',
      ];

      invalidPaths.forEach(path => {
        const segments = path.split('/').filter(Boolean);
        const locale = segments[0];
        expect(routing.locales.includes(locale as 'en' | 'he')).toBe(false);
      });
    });
  });

  describe('Path Manipulation Logic', () => {
    it('should correctly extract locale from path', () => {
      const testCases = [
        { path: '/he/dashboard', expectedLocale: 'he', expectedPath: '/dashboard' },
        { path: '/en/sessions/123', expectedLocale: 'en', expectedPath: '/sessions/123' },
        { path: '/he/admin/users/analytics', expectedLocale: 'he', expectedPath: '/admin/users/analytics' },
        { path: '/en', expectedLocale: 'en', expectedPath: '/' },
      ];

      testCases.forEach(({ path, expectedLocale, expectedPath }) => {
        const segments = path.split('/').filter(Boolean);
        const locale = segments[0];
        const pathWithoutLocale = '/' + segments.slice(1).join('/');
        const normalizedPath = pathWithoutLocale === '/' ? '/' : pathWithoutLocale;

        expect(locale).toBe(expectedLocale);
        expect(normalizedPath).toBe(expectedPath);
      });
    });

    it('should handle locale switching in paths', () => {
      const switchLocaleInPath = (currentPath: string, newLocale: string) => {
        const segments = currentPath.split('/').filter(Boolean);
        const currentLocale = segments[0];
        
        if (routing.locales.includes(currentLocale as 'en' | 'he')) {
          segments[0] = newLocale;
          return '/' + segments.join('/');
        } else {
          return `/${newLocale}${currentPath}`;
        }
      };

      const testCases = [
        { 
          currentPath: '/he/dashboard', 
          newLocale: 'en', 
          expectedPath: '/en/dashboard' 
        },
        { 
          currentPath: '/en/sessions/123/edit', 
          newLocale: 'he', 
          expectedPath: '/he/sessions/123/edit' 
        },
        { 
          currentPath: '/dashboard', 
          newLocale: 'he', 
          expectedPath: '/he/dashboard' 
        },
      ];

      testCases.forEach(({ currentPath, newLocale, expectedPath }) => {
        const result = switchLocaleInPath(currentPath, newLocale);
        expect(result).toBe(expectedPath);
      });
    });
  });

  describe('Middleware Route Validation', () => {
    it('should identify valid locale segments', () => {
      const isValidLocale = (segment: string): boolean => {
        return routing.locales.includes(segment as 'en' | 'he');
      };

      expect(isValidLocale('he')).toBe(true);
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('es')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('dashboard')).toBe(false);
    });

    it('should validate locale segment length and format', () => {
      const validateLocaleFormat = (segment: string): boolean => {
        return segment.length === 2 && /^[a-z]{2}$/.test(segment);
      };

      routing.locales.forEach(locale => {
        expect(validateLocaleFormat(locale)).toBe(true);
      });

      // Test invalid formats
      expect(validateLocaleFormat('eng')).toBe(false);
      expect(validateLocaleFormat('EN')).toBe(false);
      expect(validateLocaleFormat('1e')).toBe(false);
      expect(validateLocaleFormat('e-n')).toBe(false);
    });
  });

  describe('Default Behavior Validation', () => {
    it('should handle root path redirection logic', () => {
      // Simulate the logic for when no locale is specified
      const handleRootPath = (pathname: string) => {
        const segments = pathname.split('/').filter(Boolean);
        
        if (segments.length === 0) {
          // Root path, should redirect to default locale
          return `/${routing.defaultLocale}`;
        }
        
        const firstSegment = segments[0];
        if (!routing.locales.includes(firstSegment as 'en' | 'he')) {
          // No valid locale, prepend default locale
          return `/${routing.defaultLocale}${pathname}`;
        }
        
        return pathname;
      };

      expect(handleRootPath('/')).toBe('/he');
      expect(handleRootPath('/dashboard')).toBe('/he/dashboard');
      expect(handleRootPath('/he/dashboard')).toBe('/he/dashboard');
      expect(handleRootPath('/en/dashboard')).toBe('/en/dashboard');
    });

    it('should handle invalid locale redirection', () => {
      const handleInvalidLocale = (pathname: string) => {
        const segments = pathname.split('/').filter(Boolean);
        const firstSegment = segments[0];
        
        // Check if first segment looks like a locale (2 chars) but is invalid
        if (firstSegment && firstSegment.length === 2 && !routing.locales.includes(firstSegment as 'en' | 'he')) {
          const pathWithoutInvalidLocale = '/' + segments.slice(1).join('/');
          return `/${routing.defaultLocale}${pathWithoutInvalidLocale}`;
        }
        
        return pathname;
      };

      expect(handleInvalidLocale('/fr/dashboard')).toBe('/he/dashboard');
      expect(handleInvalidLocale('/es/sessions')).toBe('/he/sessions');
      expect(handleInvalidLocale('/he/dashboard')).toBe('/he/dashboard'); // Valid, no change
      expect(handleInvalidLocale('/en/dashboard')).toBe('/en/dashboard'); // Valid, no change
    });
  });

  describe('Language Detection Priority', () => {
    it('should prioritize URL locale over browser preference', () => {
      // This test validates the expected behavior based on routing config
      const getEffectiveLocale = (urlLocale: string | null, browserLang: string) => {
        // URL locale takes precedence if valid
        if (urlLocale && routing.locales.includes(urlLocale as 'en' | 'he')) {
          return urlLocale;
        }
        
        // Fall back to browser language if supported
        const browserLocale = browserLang.split(',')[0].split('-')[0];
        if (routing.locales.includes(browserLocale as 'en' | 'he')) {
          return browserLocale;
        }
        
        // Default to configured default locale
        return routing.defaultLocale;
      };

      // URL locale should take precedence
      expect(getEffectiveLocale('en', 'he,en;q=0.9')).toBe('en');
      expect(getEffectiveLocale('he', 'en,he;q=0.9')).toBe('he');
      
      // Browser language as fallback
      expect(getEffectiveLocale(null, 'en,he;q=0.9')).toBe('en');
      expect(getEffectiveLocale(null, 'he,en;q=0.9')).toBe('he');
      
      // Default locale as final fallback
      expect(getEffectiveLocale(null, 'fr,es;q=0.9')).toBe('he');
      expect(getEffectiveLocale('fr', 'es,de;q=0.9')).toBe('he');
    });
  });
});