import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Coach Components Locale Consistency', () => {
  const coachComponentsDir = join(process.cwd(), 'src/components/coach');

  const componentsToCheck = [
    'insights-page.tsx',
    'availability-manager.tsx',
    'clients-page.tsx'
  ];

  componentsToCheck.forEach((componentFile) => {
    it(`${componentFile} should use useLocale() hook`, () => {
      const componentPath = join(coachComponentsDir, componentFile);
      const content = readFileSync(componentPath, 'utf-8');

      // Check for useLocale import - use regex to handle multiple imports on same line
      const hasImport =
        /import\s+\{[^}]*useLocale[^}]*\}\s+from\s+['"]next-intl['"]/.test(
          content
        );

      // Check for useLocale usage (with or without underscore prefix for unused variables)
      const hasUsage = /const\s+_?locale\s*=\s*useLocale\(\)/.test(content);

      expect(hasImport, `${componentFile} should import useLocale from 'next-intl'`).toBe(true);
      expect(hasUsage, `${componentFile} should call useLocale() hook`).toBe(true);
    });
  });

  it('all checked components should have consistent locale pattern', () => {
    const results = componentsToCheck.map((componentFile) => {
      const componentPath = join(coachComponentsDir, componentFile);
      const content = readFileSync(componentPath, 'utf-8');

      const hasImport =
        /import\s+\{[^}]*useLocale[^}]*\}\s+from\s+['"]next-intl['"]/.test(
          content
        );
      const hasUsage = /const\s+_?locale\s*=\s*useLocale\(\)/.test(content);

      return {
        file: componentFile,
        hasImport,
        hasUsage,
        isConsistent: hasImport && hasUsage
      };
    });

    const allConsistent = results.every(r => r.isConsistent);
    const inconsistentFiles = results.filter(r => !r.isConsistent).map(r => r.file);

    expect(
      allConsistent,
      `The following components are missing useLocale: ${inconsistentFiles.join(', ')}`
    ).toBe(true);
  });
});
