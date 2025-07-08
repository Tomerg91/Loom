'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '@/i18n/config';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

const languageOptions: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true },
];

export function useLanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    if (!locales.includes(newLocale as 'en' | 'he')) {
      console.warn(`Locale ${newLocale} is not supported`);
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    const currentLocale = segments[0];
    
    const isLocaleInPath = locales.includes(currentLocale as 'en' | 'he');
    
    let newPathname;
    if (isLocaleInPath) {
      // Replace current locale with new locale
      segments[0] = newLocale;
      newPathname = `/${segments.join('/')}`;
    } else {
      // Add new locale to the beginning
      newPathname = `/${newLocale}${pathname}`;
    }
    
    router.push(newPathname as any);
  };

  const getCurrentLanguage = () => {
    return languageOptions.find(lang => lang.code === locale) || languageOptions[0];
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