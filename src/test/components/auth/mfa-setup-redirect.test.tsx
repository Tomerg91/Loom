import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('MFA Setup Redirect Fixes', () => {
  describe('mfa-setup-form.tsx', () => {
    it('should redirect to /settings instead of /settings/security after MFA completion', () => {
      const sourceCode = fs.readFileSync(
        'src/components/auth/mfa-setup-form.tsx',
        'utf-8'
      );

      // Should NOT contain the redirect to /settings/security
      expect(sourceCode).not.toMatch(/\/settings\/security/);

      // Should contain router.push with /settings
      expect(sourceCode).toMatch(/router\.push\(`\/\$\{locale\}\/settings`\)/);
    });
  });

  describe('mfa-setup/page.tsx', () => {
    it('should redirect to /settings instead of /settings/security on cancel', () => {
      const sourceCode = fs.readFileSync(
        'src/app/[locale]/(authenticated)/auth/mfa-setup/page.tsx',
        'utf-8'
      );

      // Should NOT contain the redirect to /settings/security
      expect(sourceCode).not.toMatch(/\/settings\/security/);

      // Should contain router.push with /settings
      expect(sourceCode).toMatch(/\$\{locale\}\/settings`/);
    });
  });
});
