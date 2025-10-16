import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { LocaleDirectionProvider } from '@/modules/i18n/config';

vi.mock('next-intl', () => import('@/test/mocks/next-intl'));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => '/he/dashboard',
}));

vi.mock('@/modules/i18n/components/LocaleSwitcher', () => ({
  LocaleSwitcher: ({ className }: { className?: string }) => (
    <div data-testid="locale-switcher" className={className} />
  ),
}));

describe('RTL visual adjustments', () => {
  it('renders sidebar with RTL direction attributes', () => {
    render(
      <Sidebar
        locale="he"
        navigation={{
          primary: [
            {
              id: 'main',
              label: 'Main',
              items: [
                {
                  id: 'overview',
                  label: 'Overview',
                  href: '/he/dashboard',
                  matchBehavior: 'exact',
                },
              ],
            },
          ],
        }}
        isMobileOpen={true}
        onMobileClose={() => undefined}
      />,
    );

    const nav = screen.getByLabelText(/dashboard navigation/i);
    expect(nav).toHaveAttribute('dir', 'rtl');

    const mobilePanel = screen.getByTestId('dashboard-mobile-sidebar');
    expect(mobilePanel).toHaveAttribute('dir', 'rtl');
  });

  it('applies direction metadata to buttons', () => {
    render(
      <LocaleDirectionProvider value={{ locale: 'he', direction: 'rtl' }}>
        <Button loading>שמירה</Button>
      </LocaleDirectionProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('dir', 'rtl');
    expect(button).toHaveAttribute('data-locale-direction', 'rtl');
    const spinner = button.querySelector('svg');
    expect(spinner).toHaveClass('ml-2');
  });
});
