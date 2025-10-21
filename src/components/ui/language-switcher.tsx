'use client';

import { Globe, Languages, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguageSwitcher } from '@/hooks/use-language-switcher';

interface LanguageSwitcherProps {
  variant?: 'select' | 'dropdown' | 'button';
  showFlag?: boolean;
  showNativeName?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LanguageSwitcher({
  variant = 'dropdown',
  showFlag = true,
  showNativeName = false,
  size = 'default',
  className = ''
}: LanguageSwitcherProps) {
  const { currentLocale, currentLanguage, availableLanguages, switchLanguage } = useLanguageSwitcher();
  const t = useTranslations('common');

  if (variant === 'select') {
    return (
      <Select value={currentLocale} onValueChange={switchLanguage}>
        <SelectTrigger className={`w-auto min-w-[120px] ${className}`}>
          <SelectValue>
            <div className="flex items-center rtl:space-x-reverse space-x-2">
              {showFlag && <span>{currentLanguage?.flag}</span>}
              <span>
                {showNativeName ? currentLanguage?.nativeName : currentLanguage?.name}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center rtl:space-x-reverse space-x-2">
                {showFlag && <span>{lang.flag}</span>}
                <span>{showNativeName ? lang.nativeName : lang.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'button') {
    return (
      <div className={`flex items-center rtl:space-x-reverse space-x-1 ${className}`}>
        {availableLanguages.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLocale === lang.code ? 'default' : 'ghost'}
            size={size}
            onClick={() => switchLanguage(lang.code)}
            className="min-w-[60px]"
          >
            {showFlag && <span className="mr-1">{lang.flag}</span>}
            {lang.code.toUpperCase()}
          </Button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={`flex items-center rtl:space-x-reverse space-x-2 ${className}`}
          aria-label={t('changeLanguage')}
        >
          <Languages aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">{t('changeLanguage')}</span>
          {showFlag && <span>{currentLanguage?.flag}</span>}
          <span className="hidden sm:inline">
            {showNativeName ? currentLanguage?.nativeName : currentLanguage?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              {showFlag && <span>{lang.flag}</span>}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground">
                  {lang.nativeName}
                </span>
              </div>
            </div>
            {currentLocale === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile or space-constrained areas
export function CompactLanguageSwitcher({ className = '' }: { className?: string }) {
  const { currentLocale, availableLanguages, switchLanguage } = useLanguageSwitcher();
  const t = useTranslations('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`w-10 h-10 p-0 ${className}`}
          aria-label={t('changeLanguage')}
          iconOnly
        >
          <Globe aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">{t('changeLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <span>{lang.flag}</span>
              <span className="text-sm">{lang.code.toUpperCase()}</span>
            </div>
            {currentLocale === lang.code && (
              <Check className="h-3 w-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}