import { getTranslations } from 'next-intl/server';

import { PersonaShowcase } from '@/components/landing/persona-showcase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hero } from '@/components/ui/hero';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Link } from '@/i18n/routing';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

interface HeroContent {
  chip: string;
  title: string;
  description: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
}

interface ActionBarContent {
  headline: string;
  supporting: string;
  primary: string;
  primaryHref: string;
  secondary: string;
  secondaryHref: string;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });

  const getHeroContent = (): HeroContent => {
    try {
      const raw = t.raw('hero') as Partial<HeroContent> | undefined;
      if (!raw) {
        throw new Error('Missing hero translations');
      }
      return {
        chip: raw.chip ?? 'Loom',
        title: raw.title ?? 'Loom',
        description: raw.description ?? '',
        primaryCta: raw.primaryCta ?? 'Explore the platform',
        primaryHref: (raw.primaryHref as HeroContent['primaryHref']) ?? '/auth/signin',
        secondaryCta: raw.secondaryCta ?? 'See it in action',
        secondaryHref: (raw.secondaryHref as HeroContent['secondaryHref']) ?? '/auth/signup',
      };
    } catch (error) {
      console.warn('Falling back to default hero content', error);
      return {
        chip: 'Loom',
        title: 'Build thriving coaching relationships',
        description: 'All-in-one coaching OS for coaches, clients, and admins.',
        primaryCta: 'Explore the platform',
        primaryHref: '/auth/signin',
        secondaryCta: 'See it in action',
        secondaryHref: '/auth/signup',
      };
    }
  };

  const getActionBarContent = (): ActionBarContent => {
    try {
      const raw = t.raw('actionBar') as Partial<ActionBarContent> | undefined;
      if (!raw) {
        throw new Error('Missing action bar translations');
      }
      return {
        headline: raw.headline ?? 'Ready to experience Loom?',
        supporting: raw.supporting ?? 'Sign in to continue or request a guided tour from our team.',
        primary: raw.primary ?? 'Sign in',
        primaryHref: (raw.primaryHref as ActionBarContent['primaryHref']) ?? '/auth/signin',
        secondary: raw.secondary ?? 'Request a tour',
        secondaryHref: (raw.secondaryHref as ActionBarContent['secondaryHref']) ?? 'mailto:hello@loom.app',
      };
    } catch (error) {
      console.warn('Falling back to default action bar content', error);
      return {
        headline: 'Ready to experience Loom?',
        supporting: 'Sign in to continue or request a guided tour from our team.',
        primary: 'Sign in',
        primaryHref: '/auth/signin',
        secondary: 'Request a tour',
        secondaryHref: 'mailto:hello@loom.app',
      };
    }
  };

  const getTechStack = (): string[] => {
    try {
      const raw = t.raw('tech.stack');
      if (Array.isArray(raw)) {
        return raw.map(String);
      }
      return [];
    } catch (error) {
      console.warn('Falling back to default tech stack', error);
      return ['Next.js 15', 'React 19', 'TypeScript', 'Supabase'];
    }
  };

  const hero = getHeroContent();
  const actionBar = getActionBarContent();
  const techStack = getTechStack();

  return (
    <div className="min-h-screen bg-background">
      <Hero
        title={hero.title}
        subtitle={hero.chip}
        description={hero.description}
        backgroundVariant="gradient"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href={hero.primaryHref as '/auth/signin'} locale={locale} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-light tracking-wide bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal h-13 px-8 py-3 text-base min-w-[200px]">
              {hero.primaryCta}
            </Link>
            <Link href={hero.secondaryHref as '/auth/signup'} locale={locale} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-light tracking-wide bg-neutral-900 text-white hover:bg-neutral-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal h-13 px-8 py-3 text-base min-w-[200px]">
              {hero.secondaryCta}
            </Link>
          </div>
          <LanguageSwitcher variant="button" size="sm" className="justify-center" />
        </div>
      </Hero>

      <PersonaShowcase />

      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-light text-foreground mb-6">
            {t('tech.title')}
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((item) => (
              <Badge key={item} variant="outline" className="px-4 py-2 text-sm font-light">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-orange-500/10 via-background to-red-500/10 p-10 shadow-sm">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-foreground">
                  {actionBar.headline}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {actionBar.supporting}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="min-w-[160px]">
                  <Link href={actionBar.primaryHref as '/auth/signin'} locale={locale}>
                    {actionBar.primary}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-w-[160px]">
                  <a href={actionBar.secondaryHref}>
                    {actionBar.secondary}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
