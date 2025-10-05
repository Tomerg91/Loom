import { getTranslations } from 'next-intl/server';

import { MarketingHeader, type MarketingHeaderContent } from '@/components/landing/marketing-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

interface NavigationLink {
  label: string;
  href: string;
}

interface ActionLink {
  label: string;
  href: string;
}

interface HeroContent {
  eyebrow: string;
  title: string;
  description: string;
  primary: ActionLink;
  secondary: ActionLink;
  signInPrompt: string;
  signInLabel: string;
  signInHref: string;
  visualAlt: string;
  chip?: string;
}

interface SocialProofContent {
  title: string;
  logos: string[];
}

interface FeatureItem {
  title: string;
  description: string;
}

interface FeaturesContent {
  title: string;
  items: FeatureItem[];
}

interface TestimonialContent {
  quote: string;
  name: string;
  role: string;
}

interface CallToActionContent {
  title: string;
  description: string;
  primary: ActionLink;
}

type SupportedLocale = 'he' | 'en';

const marketingDefaults: Record<SupportedLocale, {
  navigation: MarketingHeaderContent;
  hero: HeroContent;
  socialProof: SocialProofContent;
  features: FeaturesContent;
  testimonial: TestimonialContent;
  cta: CallToActionContent;
}> = {
  he: {
    navigation: {
      links: [
        { label: 'הפלטפורמה', href: '#platform' },
        { label: 'פתרונות', href: '#features' },
        { label: 'לקוחות', href: '#testimonial' },
        { label: 'תמחור', href: '#cta' }
      ],
      contact: { label: 'צרו קשר', href: '#cta' },
      signIn: { label: 'התחברות', href: '/auth/signin' },
      signUp: { label: 'הרשמה', href: '/auth/signup' },
      logoLabel: 'חזרה לדף הבית של Loom-app',
      navigationAriaLabel: 'ניווט ראשי',
      openMenuLabel: 'פתחו תפריט ניווט',
      closeMenuLabel: 'סגרו תפריט ניווט'
    },
    hero: {
      eyebrow: 'פלטפורמת הכל-באחד לשיטת סאטיה',
      title: 'פלטפורמה מודרנית למטפלים, מתאמנים ומרכזים',
      description:
        'Loom-app מפשטת את ניהול המטופלים, תיאום הפגישות והמעקב אחר ההתקדמות כך שתוכלו להתמקד בליווי האנושי.',
      primary: { label: 'התנסות חינם', href: '/auth/signup' },
      secondary: { label: 'צפו בהדגמה', href: '#platform' },
      signInPrompt: 'כבר יש לכם חשבון?',
      signInLabel: 'התחברות',
      signInHref: '/auth/signin',
      visualAlt: 'הדמיה של לוח מחוונים לניהול מטפלים',
      chip: 'מערכת ההפעלה המודרנית לאימון'
    },
    socialProof: {
      title: 'בשימוש על ידי מטפלים ומרכזים מובילים',
      logos: ['מרכז סאטיה', 'תודעה חדשה', 'Balance Studio', 'MindfulFlow', 'לב פתוח', 'המסע הפנימי']
    },
    features: {
      title: 'פלטפורמה אחת, אינסוף אפשרויות.',
      items: [
        {
          title: 'ניהול מטופלים מרכזי',
          description: 'נהלו את כל המידע על המטופלים שלכם במקום אחד מאובטח ונוח.'
        },
        {
          title: 'תיאום פגישות חכם',
          description: 'מערכת זימון תורים אינטואיטיבית החוסכת לכם זמן ומונעת טעויות.'
        },
        {
          title: 'מעקב התקדמות ויזואלי',
          description: 'הציגו למטופלים את ההתקדמות שלהם בעזרת כלים וגרפים ויזואליים.'
        }
      ]
    },
    testimonial: {
      quote:
        'Loom-app שינה את הדרך בה אני מנהלת את הקליניקה שלי. הכל כל כך מאורגן וקל לשימוש, וזה חוסך לי שעות כל שבוע.',
      name: 'שם המטפל/ת',
      role: 'קליניקה פרטית'
    },
    cta: {
      title: 'מוכנים להתחיל?',
      description: 'הצטרפו למאמנים שכבר עובדים בצורה חכמה ויעילה יותר.',
      primary: { label: 'התנסות חינם', href: '/auth/signup' }
    }
  },
  en: {
    navigation: {
      links: [
        { label: 'Platform', href: '#platform' },
        { label: 'Solutions', href: '#features' },
        { label: 'Customers', href: '#testimonial' },
        { label: 'Pricing', href: '#cta' }
      ],
      contact: { label: 'Contact', href: '#cta' },
      signIn: { label: 'Sign in', href: '/auth/signin' },
      signUp: { label: 'Get started', href: '/auth/signup' },
      logoLabel: 'Back to Loom-app home',
      navigationAriaLabel: 'Primary navigation',
      openMenuLabel: 'Open navigation menu',
      closeMenuLabel: 'Close navigation menu'
    },
    hero: {
      eyebrow: 'All-in-one platform for the Satya method',
      title: 'A modern workspace for practitioners, clients, and centers',
      description:
        'Loom-app simplifies client management, scheduling, and progress tracking so you can stay focused on the human connection.',
      primary: { label: 'Start free trial', href: '/auth/signup' },
      secondary: { label: 'View demo', href: '#platform' },
      signInPrompt: 'Already have an account?',
      signInLabel: 'Sign in',
      signInHref: '/auth/signin',
      visualAlt: 'Dashboard illustration for a practitioner portal',
      chip: 'Modern coaching OS'
    },
    socialProof: {
      title: 'Trusted by leading practitioners and centers',
      logos: ['Satya Collective', 'Inner Balance', 'Balance Studio', 'MindfulFlow', 'Open Heart', 'The Inner Journey']
    },
    features: {
      title: 'One platform, endless possibilities.',
      items: [
        {
          title: 'Centralized client records',
          description: 'Store every client detail in a secure, beautifully organized hub.'
        },
        {
          title: 'Smart scheduling',
          description: 'Automated booking with intelligent conflict detection saves hours every week.'
        },
        {
          title: 'Visual progress tracking',
          description: 'Share intuitive reports and charts that make growth easy to celebrate.'
        }
      ]
    },
    testimonial: {
      quote: 'Loom-app transformed how I operate my practice. Everything is organized, intuitive, and saves me hours each week.',
      name: 'Practitioner name',
      role: 'Private studio'
    },
    cta: {
      title: 'Ready to begin?',
      description: 'Join the Satya practitioners who already run smarter, more connected programs.',
      primary: { label: 'Start free trial', href: '/auth/signup' }
    }
  }
};

const ensureAction = (raw: unknown, fallback: ActionLink): ActionLink => {
  if (typeof raw === 'object' && raw !== null) {
    const action = raw as Partial<ActionLink>;
    const label = typeof action.label === 'string' && action.label.trim().length > 0 ? action.label : fallback.label;
    const href = typeof action.href === 'string' && action.href.trim().length > 0 ? action.href : fallback.href;
    return { label, href };
  }
  return fallback;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  const fallback = marketingDefaults[(locale as SupportedLocale)] ?? marketingDefaults.he;

  const resolveNavigation = (): MarketingHeaderContent => {
    try {
      const raw = t.raw('navigation') as Partial<MarketingHeaderContent> | undefined;
      if (!raw) {
        throw new Error('Missing navigation translations');
      }
      const linksArray = Array.isArray(raw.links) ? raw.links : fallback.navigation.links;
      const parsedLinks = linksArray
        .map((entry) =>
          typeof entry === 'object' && entry !== null
            ? {
                label:
                  typeof (entry as NavigationLink).label === 'string' && (entry as NavigationLink).label.trim().length > 0
                    ? (entry as NavigationLink).label
                    : undefined,
                href:
                  typeof (entry as NavigationLink).href === 'string' && (entry as NavigationLink).href.trim().length > 0
                    ? (entry as NavigationLink).href
                    : undefined
              }
            : undefined
        )
        .filter((entry): entry is NavigationLink => Boolean(entry?.label && entry?.href))
        .slice(0, 6);
      return {
        links: parsedLinks.length > 0 ? parsedLinks : fallback.navigation.links,
        contact: ensureAction(raw.contact, fallback.navigation.contact),
        signIn: ensureAction(raw.signIn, fallback.navigation.signIn),
        signUp: ensureAction(raw.signUp, fallback.navigation.signUp),
        logoLabel: typeof raw.logoLabel === 'string' ? raw.logoLabel : fallback.navigation.logoLabel,
        navigationAriaLabel:
          typeof raw.navigationAriaLabel === 'string' ? raw.navigationAriaLabel : fallback.navigation.navigationAriaLabel,
        openMenuLabel: typeof raw.openMenuLabel === 'string' ? raw.openMenuLabel : fallback.navigation.openMenuLabel,
        closeMenuLabel: typeof raw.closeMenuLabel === 'string' ? raw.closeMenuLabel : fallback.navigation.closeMenuLabel
      };
    } catch (error) {
      console.warn('Falling back to default navigation content', error);
      return fallback.navigation;
    }
  };

  const resolveHero = (): HeroContent => {
    try {
      const raw = t.raw('hero') as Partial<HeroContent> | undefined;
      if (!raw) {
        throw new Error('Missing hero translations');
      }
      return {
        eyebrow: raw.eyebrow || fallback.hero.eyebrow,
        title: raw.title || fallback.hero.title,
        description: raw.description || fallback.hero.description,
        primary: ensureAction(raw.primary, fallback.hero.primary),
        secondary: ensureAction(raw.secondary, fallback.hero.secondary),
        signInPrompt: raw.signInPrompt || fallback.hero.signInPrompt,
        signInLabel: raw.signInLabel || fallback.hero.signInLabel,
        signInHref: raw.signInHref || fallback.hero.signInHref,
        visualAlt: raw.visualAlt || fallback.hero.visualAlt,
        chip: raw.chip || fallback.hero.chip
      };
    } catch (error) {
      console.warn('Falling back to default hero content', error);
      return fallback.hero;
    }
  };

  const resolveSocialProof = (): SocialProofContent => {
    try {
      const raw = t.raw('socialProof') as Partial<SocialProofContent> | undefined;
      if (!raw) {
        throw new Error('Missing social proof translations');
      }
      return {
        title: raw.title || fallback.socialProof.title,
        logos: Array.isArray(raw.logos) && raw.logos.length > 0 ? raw.logos.map(String) : fallback.socialProof.logos
      };
    } catch (error) {
      console.warn('Falling back to default social proof content', error);
      return fallback.socialProof;
    }
  };

  const resolveFeatures = (): FeaturesContent => {
    try {
      const raw = t.raw('features') as Partial<FeaturesContent> | undefined;
      if (!raw) {
        throw new Error('Missing features translations');
      }
      const items = Array.isArray(raw.items)
        ? raw.items
            .map((item) =>
              typeof item === 'object' && item !== null
                ? {
                    title: typeof (item as FeatureItem).title === 'string' ? (item as FeatureItem).title : undefined,
                    description:
                      typeof (item as FeatureItem).description === 'string'
                        ? (item as FeatureItem).description
                        : undefined
                  }
                : undefined
            )
            .filter((item): item is FeatureItem => Boolean(item?.title && item?.description))
        : fallback.features.items;
      return {
        title: raw.title || fallback.features.title,
        items: items.length > 0 ? items.slice(0, 6) : fallback.features.items
      };
    } catch (error) {
      console.warn('Falling back to default features content', error);
      return fallback.features;
    }
  };

  const resolveTestimonial = (): TestimonialContent => {
    try {
      const raw = t.raw('testimonial') as Partial<TestimonialContent> | undefined;
      if (!raw) {
        throw new Error('Missing testimonial translations');
      }
      return {
        quote: raw.quote || fallback.testimonial.quote,
        name: raw.name || fallback.testimonial.name,
        role: raw.role || fallback.testimonial.role
      };
    } catch (error) {
      console.warn('Falling back to default testimonial content', error);
      return fallback.testimonial;
    }
  };

  const resolveCta = (): CallToActionContent => {
    try {
      const raw = t.raw('cta') as Partial<CallToActionContent> | undefined;
      if (!raw) {
        throw new Error('Missing CTA translations');
      }
      return {
        title: raw.title || fallback.cta.title,
        description: raw.description || fallback.cta.description,
        primary: ensureAction(raw.primary, fallback.cta.primary)
      };
    } catch (error) {
      console.warn('Falling back to default CTA content', error);
      return fallback.cta;
    }
  };

  const navigation = resolveNavigation();
  const hero = resolveHero();
  const socialProof = resolveSocialProof();
  const features = resolveFeatures();
  const testimonial = resolveTestimonial();
  const cta = resolveCta();

  return (
    <div className="bg-white text-slate-900">
      <MarketingHeader locale={locale} content={navigation} />

      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-b from-white via-purple-50/60 to-white"
      >
        <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-purple-100/70 via-transparent to-transparent" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pt-24">
          <div className="space-y-7">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-700">
              {hero.eyebrow}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              {hero.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" variant="default" asChild>
                <Link href={hero.primary.href as any} locale={hero.primary.href.startsWith('/') ? locale : undefined}>
                  {hero.primary.label}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={hero.secondary.href as any} locale={hero.secondary.href.startsWith('/') ? locale : undefined}>
                  {hero.secondary.label}
                </Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              {hero.signInPrompt}{' '}
              <Link
                href={hero.signInHref as any}
                locale={hero.signInHref.startsWith('/') ? locale : undefined}
                className="font-medium text-purple-600 underline-offset-4 hover:underline"
              >
                {hero.signInLabel}
              </Link>
            </p>
          </div>

          <div className="relative isolate">
            <div className="absolute -top-10 left-10 h-32 w-32 rounded-full bg-purple-200/70 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-12 right-0 h-36 w-36 rounded-full bg-violet-300/60 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white/80 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-6 p-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Loom-app</span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      Satya method
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {hero.visualAlt}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/80 p-4">
                    <p className="text-xs font-semibold uppercase text-purple-500">Dashboard</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Weekly progress</p>
                        <p className="text-xs text-slate-500">+18% vs. last month</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-white/70 shadow-inner" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Next session</p>
                    <p className="mt-2 text-sm text-slate-600">יום רביעי, 14:30 · פגישה קבוצתית</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">תזכורת רפלקציה</p>
                    <p className="mt-2 text-sm text-slate-600">שלחו משוב קצר כדי להכין את הפגישה הבאה.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="social-proof" className="border-y border-slate-100 bg-slate-50/70 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
            {socialProof.title}
          </p>
          <div className="mt-8 grid grid-cols-2 items-center justify-items-center gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {socialProof.logos.map((logo) => (
              <div
                key={logo}
                className="w-full rounded-xl border border-transparent bg-white/80 px-4 py-3 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-100"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {features.title}
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.items.map((feature) => (
              <div
                key={feature.title}
                className="flex h-full flex-col gap-4 rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-purple-50/40 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M11 2a1 1 0 0 1 .894.553l1.618 3.236 3.57.519a1 1 0 0 1 .554 1.705l-2.584 2.52.61 3.558a1 1 0 0 1-1.451 1.054L12 13.93l-3.212 1.69a1 1 0 0 1-1.451-1.054l.61-3.558-2.584-2.52a1 1 0 0 1 .554-1.705l3.57-.52 1.618-3.235A1 1 0 0 1 11 2Z"
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-base leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonial" className="bg-slate-50/80 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-gradient-to-br from-purple-200 via-white to-purple-100 shadow-xl lg:mx-0">
              <span className="text-6xl font-serif text-purple-400" aria-hidden="true">
                “
              </span>
            </div>
            <blockquote className="space-y-6">
              <p className="text-2xl leading-relaxed text-slate-700 lg:text-3xl">{testimonial.quote}</p>
              <footer>
                <p className="text-lg font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.role}</p>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section id="cta" className="relative isolate overflow-hidden py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 opacity-90" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" aria-hidden="true" />
        <div className="mx-auto max-w-4xl px-4 text-center text-white sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{cta.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-purple-100">{cta.description}</p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-purple-700 hover:bg-purple-50" asChild>
              <Link href={cta.primary.href as any} locale={cta.primary.href.startsWith('/') ? locale : undefined}>
                {cta.primary.label}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
