import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Locale Prefix Navigation Fixes', () => {
  describe('1.4.1: Collection Card', () => {
    it('should include locale prefix in navigation', () => {
      const sourceCode = fs.readFileSync(
        'src/components/resources/collection-card.tsx',
        'utf-8'
      );

      // Should have locale prefix in the router.push
      expect(sourceCode).toMatch(/router\.push\(`\/\$\{locale\}\/coach\/resources\/collections/);
    });
  });

  describe('1.4.2: Files Page (3 locations)', () => {
    it('should include locale prefix for signin redirect', () => {
      const sourceCode = fs.readFileSync(
        'src/app/[locale]/(authenticated)/files/page.tsx',
        'utf-8'
      );

      // Should NOT redirect to /login
      expect(sourceCode).not.toMatch(/router\.push\('\/login'\)/);

      // Should redirect to auth/signin with locale
      expect(sourceCode).toMatch(/\$\{locale\}\/auth\/signin/);
    });
  });

  describe('1.4.3: Billing Subscription (2 locations)', () => {
    it('should include locale prefix in billing navigation', () => {
      const sourceCode = fs.readFileSync(
        'src/app/[locale]/billing/subscription/page.tsx',
        'utf-8'
      );

      // Should NOT have /billing/pricing without locale
      expect(sourceCode).not.toMatch(/router\.push\('\/billing\/pricing'\)/);

      // Should have locale prefix
      expect(sourceCode).toMatch(/\$\{locale\}\/billing\/pricing/);
    });
  });
});
