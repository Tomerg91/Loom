'use client';

import { useLocale } from 'next-intl';

import { usePathname, useRouter, buildLocalizedPath } from '@/i18n/routing';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

const languageOptions: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
  },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
];

export function useLanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    const target = languageOptions.find(lang => lang.code === newLocale);
    if (!target) {
      console.warn(`Locale ${newLocale} is not supported`);
      return;
    }
    // usePathname() from next-intl returns path without locale prefix
    // buildLocalizedPath adds the correct locale prefix
    const newPathname = buildLocalizedPath(pathname, target.code);
    router.push(newPathname);
  };

  const getCurrentLanguage = () => {
    return (
      languageOptions.find(lang => lang.code === locale) || languageOptions[0]
    );
  };

  const getAvailableLanguages = () => {
    return languageOptions;
  };

  const isRTL = () => {
    const currentLang = getCurrentLanguage();
    return currentLang?.rtl || false;
  };

  return {
    currentLocale: locale,
    currentLanguage: getCurrentLanguage(),
    availableLanguages: getAvailableLanguages(),
    switchLanguage,
    isRTL,
  };
}
