import { getTranslations } from 'next-intl/server';
import { Facebook, Instagram, Linkedin, Youtube, ExternalLink } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { CompactLanguageSwitcher } from '@/components/ui/language-switcher';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterSocialLink {
  label: string;
  href: string;
  icon?: string;
}

interface FooterContent {
  columns: FooterColumn[];
  social: FooterSocialLink[];
  legal: string;
  madeWith: string;
  followLabel: string;
  privacyLabel: string;
  termsLabel: string;
}

type SupportedLocale = 'he' | 'en';

const footerDefaults: Record<SupportedLocale, FooterContent> = {
  he: {
    columns: [
      {
        title: 'הפלטפורמה',
        links: [
          { label: 'סקירת יכולות', href: '#platform' },
          { label: 'ניהול מטופלים', href: '#features' },
          { label: 'יישומי Satya', href: '#hero' },
          { label: 'מרכז הלקוחות', href: '#testimonial' }
        ]
      },
      {
        title: 'פתרונות',
        links: [
          { label: 'קליניקות פרטיות', href: '#features' },
          { label: 'מרכזים קהילתיים', href: '#features' },
          { label: 'תוכניות ארגוניות', href: '#hero' },
          { label: 'ניהול צוותים', href: '#platform' }
        ]
      },
      {
        title: 'חברה',
        links: [
          { label: 'אודות', href: '#hero' },
          { label: 'קריירה', href: '#cta' },
          { label: 'שותפים', href: '#platform' },
          { label: 'חדשות', href: '#testimonial' }
        ]
      },
      {
        title: 'משאבים',
        links: [
          { label: 'מרכז הדרכה', href: '#features' },
          { label: 'ספריית ידע', href: '#platform' },
          { label: 'וובינרים', href: '#testimonial' },
          { label: 'קהילה', href: '#cta' }
        ]
      },
      {
        title: 'צרו קשר',
        links: [
          { label: 'תמיכה', href: 'mailto:support@loom.app' },
          { label: 'שאלות נפוצות', href: '#cta' },
          { label: 'דברו איתנו', href: 'mailto:hello@loom.app' },
          { label: 'מדיניות פרטיות', href: '/privacy' }
        ]
      }
    ],
    social: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/loom-app', icon: 'linkedin' },
      { label: 'Facebook', href: 'https://www.facebook.com/loom-app', icon: 'facebook' },
      { label: 'Instagram', href: 'https://www.instagram.com/loom-app', icon: 'instagram' },
      { label: 'YouTube', href: 'https://www.youtube.com/@loom-app', icon: 'youtube' }
    ],
    legal: '© {year} Loom-app. כל הזכויות שמורות.',
    madeWith: 'מעוצב באהבה עבור קהילת שיטת סאטיה',
    followLabel: 'עקבו אחרינו',
    privacyLabel: 'פרטיות',
    termsLabel: 'תנאי שימוש'
  },
  en: {
    columns: [
      {
        title: 'Platform',
        links: [
          { label: 'Product tour', href: '#platform' },
          { label: 'Client management', href: '#features' },
          { label: 'Satya workflows', href: '#hero' },
          { label: 'Customer hub', href: '#testimonial' }
        ]
      },
      {
        title: 'Solutions',
        links: [
          { label: 'Private practices', href: '#features' },
          { label: 'Community centers', href: '#features' },
          { label: 'Enterprise programs', href: '#hero' },
          { label: 'Team coordination', href: '#platform' }
        ]
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '#hero' },
          { label: 'Careers', href: '#cta' },
          { label: 'Partners', href: '#platform' },
          { label: 'Press', href: '#testimonial' }
        ]
      },
      {
        title: 'Resources',
        links: [
          { label: 'Learning center', href: '#features' },
          { label: 'Knowledge base', href: '#platform' },
          { label: 'Webinars', href: '#testimonial' },
          { label: 'Community', href: '#cta' }
        ]
      },
      {
        title: 'Contact',
        links: [
          { label: 'Support', href: 'mailto:support@loom.app' },
          { label: 'FAQ', href: '#cta' },
          { label: 'Talk with us', href: 'mailto:hello@loom.app' },
          { label: 'Privacy', href: '/privacy' }
        ]
      }
    ],
    social: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/loom-app', icon: 'linkedin' },
      { label: 'Facebook', href: 'https://www.facebook.com/loom-app', icon: 'facebook' },
      { label: 'Instagram', href: 'https://www.instagram.com/loom-app', icon: 'instagram' },
      { label: 'YouTube', href: 'https://www.youtube.com/@loom-app', icon: 'youtube' }
    ],
    legal: '© {year} Loom-app. All rights reserved.',
    madeWith: 'Crafted with care for the Satya community',
    followLabel: 'Follow us',
    privacyLabel: 'Privacy',
    termsLabel: 'Terms'
  }
};

const normalizeLinks = (links: unknown, fallback: FooterLink[]): FooterLink[] => {
  if (!Array.isArray(links)) {
    return fallback;
  }

  const parsed = links
    .map((item) =>
      typeof item === 'object' && item !== null
        ? {
            label: typeof (item as FooterLink).label === 'string' ? (item as FooterLink).label : undefined,
            href: typeof (item as FooterLink).href === 'string' ? (item as FooterLink).href : undefined
          }
        : undefined
    )
    .filter((item): item is FooterLink => Boolean(item?.label && item?.href));

  return parsed.length > 0 ? parsed : fallback;
};

const normalizeColumns = (columns: unknown, fallback: FooterColumn[]): FooterColumn[] => {
  if (!Array.isArray(columns)) {
    return fallback;
  }

  const parsed = columns
    .map((col) =>
      typeof col === 'object' && col !== null
        ? {
            title: typeof (col as FooterColumn).title === 'string' ? (col as FooterColumn).title : undefined,
            links: normalizeLinks((col as FooterColumn).links, [])
          }
        : undefined
    )
    .filter((col): col is FooterColumn => Boolean(col?.title && col?.links && col.links.length > 0));

  return parsed.length > 0 ? parsed : fallback;
};

const normalizeSocial = (social: unknown, fallback: FooterSocialLink[]): FooterSocialLink[] => {
  if (!Array.isArray(social)) {
    return fallback;
  }

  const parsed = social
    .map((item): FooterSocialLink | undefined =>
      typeof item === 'object' && item !== null
        ? {
            label: typeof (item as FooterSocialLink).label === 'string' ? (item as FooterSocialLink).label : '',
            href: typeof (item as FooterSocialLink).href === 'string' ? (item as FooterSocialLink).href : '',
            icon: typeof (item as FooterSocialLink).icon === 'string' ? (item as FooterSocialLink).icon : undefined
          }
        : undefined
    )
    .filter((item): item is FooterSocialLink =>
      item !== undefined &&
      typeof item.label === 'string' &&
      item.label.length > 0 &&
      typeof item.href === 'string' &&
      item.href.length > 0
    );

  return parsed.length > 0 ? parsed : fallback;
};

const getSocialIcon = (icon?: string) => {
  switch (icon?.toLowerCase()) {
    case 'linkedin':
      return <Linkedin className="h-5 w-5" aria-hidden="true" />;
    case 'facebook':
      return <Facebook className="h-5 w-5" aria-hidden="true" />;
    case 'instagram':
      return <Instagram className="h-5 w-5" aria-hidden="true" />;
    case 'youtube':
      return <Youtube className="h-5 w-5" aria-hidden="true" />;
    default:
      return <ExternalLink className="h-5 w-5" aria-hidden="true" />;
  }
};

const resolveLocaleProp = (href: string, locale: string) =>
  href.startsWith('/') ? locale : undefined;

export async function AppFooter({ locale }: { locale: string }) {
  const fallback = footerDefaults[(locale as SupportedLocale)] ?? footerDefaults.he;
  let footerContent = fallback;

  try {
    const t = await getTranslations({ locale, namespace: 'landing.footer' });
    const rawColumns = t.raw('columns');
    const rawSocial = t.raw('social');
    const rawLegal = t.raw('legal');
    const rawMadeWith = t.raw('madeWith');
    const rawFollowLabel = t.raw('followLabel');
    const rawPrivacyLabel = t.raw('privacyLabel');
    const rawTermsLabel = t.raw('termsLabel');

    footerContent = {
      columns: normalizeColumns(rawColumns, fallback.columns),
      social: normalizeSocial(rawSocial, fallback.social),
      legal: typeof rawLegal === 'string' && rawLegal.trim().length > 0 ? rawLegal : fallback.legal,
      madeWith: typeof rawMadeWith === 'string' && rawMadeWith.trim().length > 0 ? rawMadeWith : fallback.madeWith,
      followLabel:
        typeof rawFollowLabel === 'string' && rawFollowLabel.trim().length > 0 ? rawFollowLabel : fallback.followLabel,
      privacyLabel:
        typeof rawPrivacyLabel === 'string' && rawPrivacyLabel.trim().length > 0 ? rawPrivacyLabel : fallback.privacyLabel,
      termsLabel:
        typeof rawTermsLabel === 'string' && rawTermsLabel.trim().length > 0 ? rawTermsLabel : fallback.termsLabel
    };
  } catch (error) {
    console.warn('Falling back to default footer content', error);
    footerContent = fallback;
  }

  const currentYear = new Date().getFullYear().toString();
  const legalText = footerContent.legal.replace('{year}', currentYear);
  const followLabel = footerContent.social.length > 0 ? footerContent.followLabel : '';

  return (
    <footer className="mt-10 border-t border-slate-200 bg-slate-50/90">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[2fr_3fr]">
          <div className="flex flex-col gap-6">
            <div>
              <Link href="/" locale={locale} className="flex items-center gap-2 text-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md" aria-hidden="true">
                  L
                </span>
                <span className="text-lg font-semibold tracking-tight">Loom-app</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">{footerContent.madeWith}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">{followLabel}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {footerContent.social.map((item) => (
                  <a
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:-translate-y-0.5 hover:border-purple-300 hover:text-purple-600 hover:shadow"
                    aria-label={item.label}
                  >
                    {getSocialIcon(item.icon)}
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {footerContent.columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{column.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <Link
                        href={link.href as any}
                        locale={resolveLocaleProp(link.href, locale)}
                        className="transition-colors hover:text-purple-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>{legalText}</span>
            <Link href="/privacy" locale={locale} className="hover:text-purple-600">
              {footerContent.privacyLabel}
            </Link>
            <Link href="/terms" locale={locale} className="hover:text-purple-600">
              {footerContent.termsLabel}
            </Link>
          </div>
          <CompactLanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
