import { getTranslations } from 'next-intl/server';
import { LanguageSettingsCard } from '@/components/settings/language-settings-card';
import RouteGuard from '@/components/auth/route-guard';

interface Props {
  params: {
    locale: string;
  };
}

export default async function LanguageSettingsPage({ params }: Props) {
  const t = await getTranslations('common');

  return (
    <RouteGuard>
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{t('language')} Settings</h1>
            <p className="text-muted-foreground">
              Manage your language preferences and regional settings
            </p>
          </div>
          
          <LanguageSettingsCard />
        </div>
      </div>
    </RouteGuard>
  );
}

export async function generateMetadata({ params }: Props) {
  const t = await getTranslations('common');
  
  return {
    title: `${t('language')} Settings - Loom`,
    description: 'Manage your language preferences and regional settings',
  };
}