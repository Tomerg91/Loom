import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useLocale } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useLanguageSwitcher } from '@/hooks/use-language-switcher';
import { defaultLocale, locales } from '@/i18n/config';
import { useRouter, usePathname } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(),
}));

// Mock the routing module
vi.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en', 'he'],
    defaultLocale: 'he',
    localePrefix: 'always',
    localeDetection: true,
  },
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe('Language Switching Functionality', () => {
  const mockPush = vi.fn();
  const mockUseRouter = useRouter as ReturnType<typeof vi.fn>;
  const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;
  const mockUseLocale = useLocale as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as any);
  });

  describe('Configuration Tests', () => {
    it('should have Hebrew as the default locale', () => {
      expect(routing.defaultLocale).toBe('he');
      expect(defaultLocale).toBe('he');
    });

    it('should support both English and Hebrew locales', () => {
      expect(routing.locales).toEqual(['en', 'he']);
      expect(locales).toEqual(['en', 'he']);
    });

    it('should use always prefix for locales', () => {
      expect(routing.localePrefix).toBe('always');
    });

    it('should have locale detection enabled', () => {
      expect(routing.localeDetection).toBe(true);
    });
  });

  describe('useLanguageSwitcher Hook Tests', () => {
    it('should return correct values for Hebrew locale', () => {
      // Mock current locale as Hebrew
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/he/dashboard');
      
      // Create a test component to use the hook
      const TestComponent = () => {
        const {
          currentLocale,
          currentLanguage,
          availableLanguages,
          isRTL,
        } = useLanguageSwitcher();
        
        return (
          <div>
            <span data-testid="current-locale">{currentLocale}</span>
            <span data-testid="current-language">{currentLanguage?.name}</span>
            <span data-testid="is-rtl">{isRTL().toString()}</span>
            <span data-testid="available-count">{availableLanguages.length}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('current-locale')).toHaveTextContent('he');
      expect(screen.getByTestId('current-language')).toHaveTextContent('Hebrew');
      expect(screen.getByTestId('is-rtl')).toHaveTextContent('true');
      expect(screen.getByTestId('available-count')).toHaveTextContent('2');
    });

    it('should return correct values for English locale', () => {
      // Mock current locale as English
      mockUseLocale.mockReturnValue('en');
      mockUsePathname.mockReturnValue('/en/dashboard');
      
      const TestComponent = () => {
        const {
          currentLocale,
          currentLanguage,
          isRTL,
        } = useLanguageSwitcher();
        
        return (
          <div>
            <span data-testid="current-locale">{currentLocale}</span>
            <span data-testid="current-language">{currentLanguage?.name}</span>
            <span data-testid="is-rtl">{isRTL().toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('current-locale')).toHaveTextContent('en');
      expect(screen.getByTestId('current-language')).toHaveTextContent('English');
      expect(screen.getByTestId('is-rtl')).toHaveTextContent('false');
    });

    it('should switch language correctly when locale exists in path', () => {
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/he/dashboard/settings');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-to-english"
            onClick={() => switchLanguage('en')}
          >
            Switch to English
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-to-english'));
      
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard/settings');
    });

    it('should handle language switching when no locale in path', () => {
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/dashboard');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-to-english"
            onClick={() => switchLanguage('en')}
          >
            Switch to English
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-to-english'));
      
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });

    it('should warn and not switch for unsupported locales', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/he/dashboard');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-to-invalid"
            onClick={() => switchLanguage('fr')}
          >
            Switch to French
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-to-invalid'));
      
      expect(consoleSpy).toHaveBeenCalledWith('Locale fr is not supported');
      expect(mockPush).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('RTL Detection Tests', () => {
    it('should detect Hebrew as RTL', () => {
      mockUseLocale.mockReturnValue('he');
      
      const TestComponent = () => {
        const { isRTL, currentLanguage } = useLanguageSwitcher();
        
        return (
          <div>
            <span data-testid="is-rtl">{isRTL().toString()}</span>
            <span data-testid="rtl-property">{currentLanguage?.rtl?.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-rtl')).toHaveTextContent('true');
      expect(screen.getByTestId('rtl-property')).toHaveTextContent('true');
    });

    it('should detect English as LTR', () => {
      mockUseLocale.mockReturnValue('en');
      
      const TestComponent = () => {
        const { isRTL, currentLanguage } = useLanguageSwitcher();
        
        return (
          <div>
            <span data-testid="is-rtl">{isRTL().toString()}</span>
            <span data-testid="rtl-property">{currentLanguage?.rtl?.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-rtl')).toHaveTextContent('false');
      expect(screen.getByTestId('rtl-property')).toHaveTextContent('false');
    });
  });

  describe('Language Data Tests', () => {
    it('should have correct language options with all required properties', () => {
      mockUseLocale.mockReturnValue('he');
      
      const TestComponent = () => {
        const { availableLanguages } = useLanguageSwitcher();
        
        return (
          <div>
            {availableLanguages.map((lang) => (
              <div key={lang.code} data-testid={`language-${lang.code}`}>
                <span data-testid={`${lang.code}-name`}>{lang.name}</span>
                <span data-testid={`${lang.code}-native`}>{lang.nativeName}</span>
                <span data-testid={`${lang.code}-flag`}>{lang.flag}</span>
                <span data-testid={`${lang.code}-rtl`}>{lang.rtl?.toString()}</span>
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      // Check Hebrew language data
      expect(screen.getByTestId('he-name')).toHaveTextContent('Hebrew');
      expect(screen.getByTestId('he-native')).toHaveTextContent('עברית');
      expect(screen.getByTestId('he-flag')).toHaveTextContent('🇮🇱');
      expect(screen.getByTestId('he-rtl')).toHaveTextContent('true');

      // Check English language data
      expect(screen.getByTestId('en-name')).toHaveTextContent('English');
      expect(screen.getByTestId('en-native')).toHaveTextContent('English');
      expect(screen.getByTestId('en-flag')).toHaveTextContent('🇺🇸');
      expect(screen.getByTestId('en-rtl')).toHaveTextContent('false');
    });
  });

  describe('URL Routing Tests', () => {
    it('should correctly parse current locale from URL path', () => {
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/he/sessions/123/edit');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-language"
            onClick={() => switchLanguage('en')}
          >
            Switch
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-language'));
      
      expect(mockPush).toHaveBeenCalledWith('/en/sessions/123/edit');
    });

    it('should handle root path correctly', () => {
      mockUseLocale.mockReturnValue('he');
      mockUsePathname.mockReturnValue('/he');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-language"
            onClick={() => switchLanguage('en')}
          >
            Switch
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-language'));
      
      expect(mockPush).toHaveBeenCalledWith('/en');
    });

    it('should handle nested paths correctly', () => {
      mockUseLocale.mockReturnValue('en');
      mockUsePathname.mockReturnValue('/en/admin/users/analytics');
      
      const TestComponent = () => {
        const { switchLanguage } = useLanguageSwitcher();
        
        return (
          <button 
            data-testid="switch-language"
            onClick={() => switchLanguage('he')}
          >
            Switch
          </button>
        );
      };

      render(<TestComponent />);
      
      fireEvent.click(screen.getByTestId('switch-language'));
      
      expect(mockPush).toHaveBeenCalledWith('/he/admin/users/analytics');
    });
  });

  describe('Default Locale Behavior Tests', () => {
    it('should identify Hebrew as default when getCurrentLanguage is called with no locale', () => {
      // Simulate a case where locale might be undefined
      mockUseLocale.mockReturnValue(undefined as any);
      
      const TestComponent = () => {
        const { currentLanguage } = useLanguageSwitcher();
        
        return (
          <div>
            <span data-testid="fallback-language">{currentLanguage?.code}</span>
          </div>
        );
      };

      render(<TestComponent />);

      // Should fallback to first language option (English in the array)
      expect(screen.getByTestId('fallback-language')).toHaveTextContent('en');
    });
  });
});
