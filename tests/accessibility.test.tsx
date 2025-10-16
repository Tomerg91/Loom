/**
 * @file High-signal accessibility smoke tests executed in CI to ensure
 * critical marketing and dashboard primitives expose semantic landmarks and
 * locale direction metadata.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useContext, type ReactNode } from 'react';

import { LandingHero } from '@/components/features/landing/Hero';
import type {
  LandingHero as LandingHeroCopy,
  LandingSocialProof,
} from '@/modules/platform/cms/types';
import {
  LocaleDirectionContext,
  LocaleDirectionProvider,
} from '@/modules/i18n/direction-context';

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

const heroCopy: LandingHeroCopy = {
  eyebrow: 'Built for modern coaching collectives',
  title: 'Deliver meaningful outcomes with every cohort',
  description:
    'Coordinate tasks, sessions, and reflections in one shared workspace.',
  chip: 'Private beta',
  visualAlt: 'Screenshot of a coaching dashboard summarising client health.',
  primary: {
    href: '/signup',
    label: 'Start free trial',
  },
  secondary: {
    href: '/demo',
    label: 'Book a demo',
  },
  signInPrompt: 'Already on Loom?',
  signInLabel: 'Sign in',
  signInHref: '/auth/signin',
};

const socialProof: LandingSocialProof = {
  title: 'Trusted by growth-minded organisations',
  logos: ['Arava Collective', 'MindfulOps'],
};

describe('Accessibility smoke checks', () => {
  it('renders semantic hero content with accessible links', () => {
    render(
      <LandingHero hero={heroCopy} socialProof={socialProof} locale="en" />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: heroCopy.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: heroCopy.primary.label }),
    ).toHaveAttribute('href', '/en/signup');
    expect(
      screen.getByRole('link', { name: heroCopy.secondary.label }),
    ).toHaveAttribute('href', '/en/demo');
    expect(
      screen.getByRole('link', { name: heroCopy.signInLabel }),
    ).toHaveAttribute('href', '/en/auth/signin');

    expect(screen.getByText(socialProof.title)).toBeInTheDocument();
    socialProof.logos.forEach(logo => {
      expect(screen.getByText(logo)).toBeInTheDocument();
    });
  });

  it('provides locale direction context to downstream consumers', () => {
    function DirectionProbe() {
      const value = useContext(LocaleDirectionContext);
      return (
        <output data-testid="direction" data-locale={value.locale}>
          {value.direction}
        </output>
      );
    }

    render(
      <LocaleDirectionProvider value={{ locale: 'he', direction: 'rtl' }}>
        <DirectionProbe />
      </LocaleDirectionProvider>,
    );

    const probe = screen.getByTestId('direction');
    expect(probe).toHaveTextContent('rtl');
    expect(probe).toHaveAttribute('data-locale', 'he');
  });
});
