import enMessages from '@/messages/en.json';
import heMessages from '@/messages/he.json';

describe('landing footer translations', () => {
  const locales = [
    ['en', enMessages],
    ['he', heMessages],
  ] as const;

  it.each(locales)('provides structured footer content for %s', (_locale, messages) => {
    expect(messages.landing).toBeDefined();
    expect(messages.landing.footer).toBeDefined();

    const footer = messages.landing.footer as {
      columns?: unknown;
      social?: unknown;
      legal?: unknown;
      madeWith?: unknown;
      followLabel?: unknown;
      privacyLabel?: unknown;
      termsLabel?: unknown;
    };

    expect(Array.isArray(footer.columns)).toBe(true);
    expect((footer.columns as Array<unknown>).length).toBeGreaterThan(0);
    expect(Array.isArray(footer.social)).toBe(true);
    expect((footer.social as Array<unknown>).length).toBeGreaterThan(0);
    expect(typeof footer.legal).toBe('string');
    expect(typeof footer.madeWith).toBe('string');
    expect(typeof footer.followLabel).toBe('string');
    expect(typeof footer.privacyLabel).toBe('string');
    expect(typeof footer.termsLabel).toBe('string');
  });
});
