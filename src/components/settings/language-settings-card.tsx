'use client';

import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { type Route } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe,
  Languages,
  CheckCircle,
  Info
} from 'lucide-react';
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

export function LanguageSettingsCard() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const currentLocale = segments[0];
    
    const isLocaleInPath = locales.includes(currentLocale as 'en' | 'he');
    
    let newPathname;
    if (isLocaleInPath) {
      segments[0] = newLocale;
      newPathname = `/${segments.join('/')}`;
    } else {
      newPathname = `/${newLocale}${pathname}`;
    }
    
    router.push(newPathname as Route);
  };

  const currentLanguage = languageOptions.find(lang => lang.code === locale);

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>{t('language')}</span>
          </CardTitle>
          <CardDescription>
            Choose your preferred language for the interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="language-select">Display Language</Label>
            <Select value={locale} onValueChange={switchLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <span>{currentLanguage?.flag}</span>
                    <span>{currentLanguage?.name}</span>
                    <span className="text-muted-foreground">
                      ({currentLanguage?.nativeName})
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        <span className="text-muted-foreground">
                          ({lang.nativeName})
                        </span>
                      </div>
                      {lang.rtl && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          RTL
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Language Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Currently using <strong>{currentLanguage?.name}</strong> 
              {currentLanguage?.rtl && ' (Right-to-left)'}. 
              Changes will take effect immediately.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Language Options Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Available Languages</CardTitle>
          <CardDescription>
            Quick selection of available interface languages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {languageOptions.map((lang) => (
              <div
                key={lang.code}
                className={`
                  flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors
                  ${locale === lang.code 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                  }
                `}
                onClick={() => switchLanguage(lang.code)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <p className="font-medium">{lang.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lang.nativeName}
                      {lang.rtl && ' • Right-to-left'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {locale === lang.code && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary font-medium">
                        Active
                      </span>
                    </div>
                  )}
                  {locale !== lang.code && (
                    <Button variant="outline" size="sm">
                      Switch
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Languages className="h-5 w-5" />
            <span>Language Features</span>
          </CardTitle>
          <CardDescription>
            Information about language support and features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Interface Translation</p>
                <p className="text-sm text-muted-foreground">
                  Complete interface translated for all supported languages
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Right-to-Left Support</p>
                <p className="text-sm text-muted-foreground">
                  Full RTL layout support for Hebrew and other RTL languages
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Date &amp; Time Formatting</p>
                <p className="text-sm text-muted-foreground">
                  Localized date, time, and number formatting
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Keyboard Shortcuts</p>
                <p className="text-sm text-muted-foreground">
                  Language-aware keyboard shortcuts and input methods
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}