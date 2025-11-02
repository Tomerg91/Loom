import { describe, it, expect, beforeEach, vi } from 'vitest';

const pushMock = vi.fn();
const useLocaleMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => useLocaleMock(),
}));

vi.mock('@/i18n/routing', async () => {
  const actual =
    await vi.importActual<typeof import('@/i18n/routing')>('@/i18n/routing');
  return {
    ...actual,
    usePathname: () => usePathnameMock(),
    useRouter: () => ({ push: pushMock }),
  };
});

// Import after mocks are set up
import { useLanguageSwitcher } from '@/hooks/use-language-switcher';

describe('useLanguageSwitcher', () => {
  beforeEach(() => {
    pushMock.mockClear();
    useLocaleMock.mockReset();
    usePathnameMock.mockReset();
  });

  it('provides the current language metadata based on locale', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/dashboard');

    const { currentLocale, currentLanguage, availableLanguages } =
      useLanguageSwitcher();

    expect(currentLocale).toBe('en');
    expect(currentLanguage).toMatchObject({
      code: 'en',
      flag: '🇺🇸',
      rtl: false,
    });
    expect(availableLanguages).toHaveLength(2);
  });

  it('replaces locale prefix when switching to a supported language', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/dashboard/upcoming');

    const { switchLanguage } = useLanguageSwitcher();
    switchLanguage('he');

    expect(pushMock).toHaveBeenCalledWith('/he/dashboard/upcoming');
  });

  it('adds locale prefix when path does not contain one', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/dashboard');

    const { switchLanguage } = useLanguageSwitcher();
    switchLanguage('he');

    expect(pushMock).toHaveBeenCalledWith('/he/dashboard');
  });

  it('warns and aborts when an unsupported locale is requested', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/dashboard');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { switchLanguage } = useLanguageSwitcher();
    switchLanguage('fr');

    expect(pushMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Locale fr is not supported');
    warnSpy.mockRestore();
  });

  it('indicates right-to-left layout for RTL languages', () => {
    useLocaleMock.mockReturnValue('he');
    usePathnameMock.mockReturnValue('/he/dashboard');

    const { isRTL } = useLanguageSwitcher();
    expect(isRTL()).toBe(true);
  });
});
