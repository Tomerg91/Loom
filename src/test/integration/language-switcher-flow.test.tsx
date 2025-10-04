import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { renderWithProviders } from '@/test/utils';

const pushMock = vi.fn();
const useLocaleMock = vi.fn(() => 'en');
const usePathnameMock = vi.fn(() => '/en/dashboard');

vi.mock('next-intl', async () => {
  const actual = await vi.importActual<typeof import('next-intl')>('next-intl');
  return {
    ...actual,
    useLocale: () => useLocaleMock(),
  };
});

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'he'] },
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: pushMock }),
}));

describe('LanguageSwitcher integration', () => {
  beforeEach(() => {
    pushMock.mockClear();
    useLocaleMock.mockReset();
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue('/en/dashboard');
  });

  it('displays available languages and routes navigation through the hook', async () => {
    renderWithProviders(<LanguageSwitcher />, { locale: 'en' });
    const user = userEvent.setup();

    const trigger = screen.getByRole('button', { name: /change language/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    const hebrewOption = await screen.findByRole('menuitem', {
      name: /Hebrew/,
    });
    expect(
      screen.getByRole('menuitem', { name: /English/ })
    ).toBeInTheDocument();

    await user.click(hebrewOption);

    expect(pushMock).toHaveBeenCalledWith('/he/dashboard');
  });

  it('supports button variant interactions for quick switches', async () => {
    useLocaleMock.mockReturnValue('he');
    usePathnameMock.mockReturnValue('/he/dashboard');

    renderWithProviders(<LanguageSwitcher variant="button" />, {
      locale: 'he',
    });
    const user = userEvent.setup();

    const englishButton = screen.getByRole('button', { name: /EN/ });
    await user.click(englishButton);

    expect(pushMock).toHaveBeenCalledWith('/en/dashboard');
  });
});
