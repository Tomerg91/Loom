/**
 * @file Comprehensive accessibility tests for bilingual landing page components.
 *
 * Validates WCAG compliance for:
 * - Semantic HTML structure
 * - ARIA landmarks and labels
 * - Keyboard navigation readiness
 * - Proper heading hierarchy
 * - Text alternatives for non-text content
 * - RTL text direction support
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { LandingHero } from '@/components/features/landing/Hero';
import { LandingPricing } from '@/components/features/landing/Pricing';
import { LandingTestimonials } from '@/components/features/landing/Testimonials';
import { FinalCtaSection } from '@/components/landing/final-cta-section';
import type {
  LandingCta,
  LandingHero as LandingHeroCopy,
  LandingPricing as LandingPricingType,
  LandingSocialProof,
  LandingTestimonials as LandingTestimonialsType,
} from '@/modules/platform/cms/types';
import { LocaleDirectionProvider } from '@/modules/i18n/direction-context';

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: string;
    locale?: string;
    children: ReactNode;
  } & Record<string, unknown>) => {
    const localizedHref = locale ? `/${locale}${href}` : href;
    return (
      <a href={localizedHref} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock analytics tracking
vi.mock('@/lib/monitoring/analytics', () => ({
  trackCtaClick: vi.fn(),
  trackExperimentView: vi.fn(),
}));

// Test fixtures
const heroCopyEn: LandingHeroCopy = {
  eyebrow: 'The Satya method operating system',
  title: 'Grow every coaching relationship with a single workspace',
  description:
    'Loom-app unifies client records, scheduling, payments, and progress tracking.',
  chip: 'Purpose-built for Satya practitioners',
  visualAlt: 'Screenshot of the Loom-app dashboard showing progress trends.',
  primary: {
    href: 'mailto:hello@loom-app.io',
    label: 'Book a walkthrough',
  },
  secondary: {
    href: '#platform',
    label: 'Explore the platform',
  },
  signInPrompt: 'Already using Loom-app?',
  signInLabel: 'Sign in',
  signInHref: '/auth/signin',
};

const heroCopyHe: LandingHeroCopy = {
  eyebrow: 'מערכת ההפעלה לשיטת סאטיה',
  title: 'מקום אחד שמעצים כל תהליך ליווי',
  description: 'Loom-app מאחד את ניהול המטופלים, התיאומים, התשלומים והמעקב אחר התקדמות.',
  chip: 'פותח בשיתוף מנחי סאטיה',
  visualAlt: 'צילום מסך של לוח המחוונים ב-Loom-app.',
  primary: {
    href: 'mailto:hello@loom-app.io',
    label: 'תיאום שיחת היכרות',
  },
  secondary: {
    href: '#platform',
    label: 'הכירו את הפלטפורמה',
  },
  signInPrompt: 'כבר עובדים עם Loom-app?',
  signInLabel: 'התחברות',
  signInHref: '/auth/signin',
};

const socialProof: LandingSocialProof = {
  title: 'Trusted by Satya method leaders',
  logos: ['Satya Collective', 'Inner Balance Studio', 'North Star Coaching'],
};

const testimonials: LandingTestimonialsType = {
  title: 'Designed with Satya guides and centers',
  highlight: {
    quote: 'Loom-app helped us launch a hybrid program in weeks.',
    name: 'Maya Feldman',
    role: 'Director, Inner Balance Studio',
  },
  items: [
    {
      quote: 'We replaced four tools with Loom-app.',
      name: 'Ilan Goren',
      role: 'Lead Coach, North Star',
    },
    {
      quote: 'Clients arrive prepared.',
      name: 'Sasha Levy',
      role: 'Founder, Open Heart Institute',
    },
  ],
};

const pricing: LandingPricingType = {
  title: 'Simple pricing that scales with your practice',
  description: 'Choose a plan that fits your Satya organization.',
  tiers: [
    {
      name: 'Solo Guide',
      price: '$49',
      priceCaption: 'per practitioner / month',
      description: 'Best for independent Satya coaches.',
      features: [
        'Unlimited client records',
        'Automated practice reminders',
        'Session templates',
      ],
      cta: {
        label: 'Start trial',
        href: '/auth/signup',
      },
    },
    {
      name: 'Practice Studio',
      price: '$149',
      priceCaption: 'per team / month',
      description: 'Ideal for Satya centers with multiple practitioners.',
      features: [
        'All Solo Guide features',
        'Team scheduling calendar',
        'Shared program dashboards',
      ],
      cta: {
        label: 'Talk to sales',
        href: 'mailto:hello@loom-app.io',
      },
      popular: true,
      badgeLabel: 'Most popular',
    },
  ],
};

const cta: LandingCta = {
  title: 'Invite your Satya community to Loom-app',
  description: 'Launch guided journeys, manage practices, and grow your impact.',
  primary: {
    label: 'Schedule a discovery call',
    href: 'mailto:hello@loom-app.io',
  },
};

describe('Landing Page Accessibility Tests', () => {
  describe('Hero Section', () => {
    it('renders proper heading hierarchy with h1', () => {
      render(<LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(heroCopyEn.title);
      expect(h1).toHaveAttribute('id', 'hero-heading');
    });

    it('provides aria-labelledby for section landmark', () => {
      const { container } = render(
        <LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />
      );

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
      expect(section).toHaveAttribute('id', 'hero');
    });

    it('exposes all CTA links with accessible names', () => {
      render(<LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />);

      expect(screen.getByRole('link', { name: heroCopyEn.primary.label })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: heroCopyEn.secondary.label })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: heroCopyEn.signInLabel })).toBeInTheDocument();
    });

    it('properly localizes links for Hebrew', () => {
      render(<LandingHero hero={heroCopyHe} socialProof={socialProof} locale="he" />);

      const primaryLink = screen.getByRole('link', { name: heroCopyHe.primary.label });
      expect(primaryLink).toBeInTheDocument();
      expect(primaryLink).toHaveTextContent(heroCopyHe.primary.label);
    });

    it('marks decorative elements as aria-hidden', () => {
      const { container } = render(
        <LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />
      );

      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Testimonials Section', () => {
    it('renders proper heading with aria-labelledby', () => {
      render(<LandingTestimonials testimonials={testimonials} />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent(testimonials.title);
      expect(h2).toHaveAttribute('id', 'testimonials-heading');
    });

    it('uses semantic list structure', () => {
      render(<LandingTestimonials testimonials={testimonials} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(testimonials.items.length);
    });

    it('uses blockquote for testimonial quotes', () => {
      const { container } = render(<LandingTestimonials testimonials={testimonials} />);

      const blockquotes = container.querySelectorAll('blockquote');
      // Should have 1 highlight blockquote + items blockquotes
      expect(blockquotes.length).toBe(testimonials.items.length + 1);
    });

    it('renders all testimonial content accessibly', () => {
      render(<LandingTestimonials testimonials={testimonials} />);

      expect(screen.getByText(testimonials.highlight.quote)).toBeInTheDocument();
      expect(screen.getByText(testimonials.highlight.name)).toBeInTheDocument();
      expect(screen.getByText(testimonials.highlight.role)).toBeInTheDocument();

      testimonials.items.forEach(item => {
        expect(screen.getByText(item.quote)).toBeInTheDocument();
        expect(screen.getByText(item.name)).toBeInTheDocument();
        expect(screen.getByText(item.role)).toBeInTheDocument();
      });
    });
  });

  describe('Pricing Section', () => {
    it('renders proper heading with aria-labelledby', () => {
      render(<LandingPricing pricing={pricing} locale="en" />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent(pricing.title);
      expect(h2).toHaveAttribute('id', 'pricing-heading');
    });

    it('uses semantic article elements for pricing tiers', () => {
      const { container } = render(<LandingPricing pricing={pricing} locale="en" />);

      const articles = container.querySelectorAll('article');
      expect(articles.length).toBe(pricing.tiers.length);
    });

    it('provides aria-label for popular badge', () => {
      const { container } = render(<LandingPricing pricing={pricing} locale="en" />);

      const popularBadge = container.querySelector('[aria-label*="Most popular"]');
      expect(popularBadge).toBeInTheDocument();
    });

    it('labels feature lists accessibly', () => {
      const { container } = render(<LandingPricing pricing={pricing} locale="en" />);

      const featureLists = container.querySelectorAll('ul[aria-label="Plan features"]');
      expect(featureLists.length).toBe(pricing.tiers.length);
    });

    it('provides descriptive CTA link labels', () => {
      const { container } = render(<LandingPricing pricing={pricing} locale="en" />);

      const ctaLinks = container.querySelectorAll('a[aria-label*="plan"]');
      expect(ctaLinks.length).toBe(pricing.tiers.length);
    });

    it('exposes all pricing information to screen readers', () => {
      render(<LandingPricing pricing={pricing} locale="en" />);

      pricing.tiers.forEach(tier => {
        expect(screen.getByText(tier.name)).toBeInTheDocument();
        expect(screen.getByText(tier.price)).toBeInTheDocument();
        expect(screen.getByText(tier.priceCaption)).toBeInTheDocument();
        expect(screen.getByText(tier.description)).toBeInTheDocument();
        tier.features.forEach(feature => {
          expect(screen.getByText(feature)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Final CTA Section', () => {
    it('renders proper heading with aria-labelledby', () => {
      render(<FinalCtaSection cta={cta} locale="en" />);

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent(cta.title);
      expect(h2).toHaveAttribute('id', 'cta-heading');
    });

    it('provides section landmark with aria-labelledby', () => {
      const { container } = render(<FinalCtaSection cta={cta} locale="en" />);

      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-labelledby', 'cta-heading');
      expect(section).toHaveAttribute('id', 'cta');
    });

    it('exposes CTA link with accessible name', () => {
      render(<FinalCtaSection cta={cta} locale="en" />);

      const link = screen.getByRole('link', { name: cta.primary.label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', cta.primary.href);
    });

    it('marks decorative background elements as aria-hidden', () => {
      const { container } = render(<FinalCtaSection cta={cta} locale="en" />);

      const decorativeElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Bilingual Support', () => {
    it('renders Hebrew content with proper text direction context', () => {
      const { container } = render(
        <LocaleDirectionProvider value={{ locale: 'he', direction: 'rtl' }}>
          <LandingHero hero={heroCopyHe} socialProof={socialProof} locale="he" />
        </LocaleDirectionProvider>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(heroCopyHe.title);
    });

    it('properly localizes all content for English', () => {
      render(<LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />);

      expect(screen.getByText(heroCopyEn.eyebrow)).toBeInTheDocument();
      expect(screen.getByText(heroCopyEn.title)).toBeInTheDocument();
      expect(screen.getByText(heroCopyEn.description)).toBeInTheDocument();
    });

    it('properly localizes all content for Hebrew', () => {
      render(<LandingHero hero={heroCopyHe} socialProof={socialProof} locale="he" />);

      expect(screen.getByText(heroCopyHe.eyebrow)).toBeInTheDocument();
      expect(screen.getByText(heroCopyHe.title)).toBeInTheDocument();
      expect(screen.getByText(heroCopyHe.description)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('ensures all interactive elements are focusable', () => {
      const { container } = render(
        <>
          <LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />
          <LandingPricing pricing={pricing} locale="en" />
          <FinalCtaSection cta={cta} locale="en" />
        </>
      );

      const links = container.querySelectorAll('a');
      const buttons = container.querySelectorAll('button');

      const interactiveElements = [...Array.from(links), ...Array.from(buttons)];

      interactiveElements.forEach(element => {
        // Ensure elements are not disabled and have no tabindex=-1
        expect(element).not.toHaveAttribute('disabled');
        const tabindex = element.getAttribute('tabindex');
        if (tabindex !== null) {
          expect(parseInt(tabindex)).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Semantic HTML Structure', () => {
    it('uses semantic section landmarks', () => {
      const { container } = render(
        <>
          <LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />
          <LandingTestimonials testimonials={testimonials} />
          <LandingPricing pricing={pricing} locale="en" />
          <FinalCtaSection cta={cta} locale="en" />
        </>
      );

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(4);

      sections.forEach(section => {
        // Each section should have an ID
        expect(section).toHaveAttribute('id');
      });
    });

    it('maintains proper heading hierarchy', () => {
      render(
        <>
          <LandingHero hero={heroCopyEn} socialProof={socialProof} locale="en" />
          <LandingTestimonials testimonials={testimonials} />
          <LandingPricing pricing={pricing} locale="en" />
          <FinalCtaSection cta={cta} locale="en" />
        </>
      );

      // Should have exactly one h1
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements).toHaveLength(1);

      // Should have multiple h2 elements for sections
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('uses lists for repeating content', () => {
      const { container } = render(
        <>
          <LandingTestimonials testimonials={testimonials} />
          <LandingPricing pricing={pricing} locale="en" />
        </>
      );

      const lists = container.querySelectorAll('ul, ol');
      expect(lists.length).toBeGreaterThan(0);
    });
  });
});
