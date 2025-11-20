import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Add Client Button Fix', () => {
  it('should have an onClick handler on the add client button', () => {
    const sourceCode = fs.readFileSync(
      'src/components/coach/clients-page.tsx',
      'utf-8'
    );

    // Should have data-testid="add-client-button"
    expect(sourceCode).toMatch(/data-testid="add-client-button"/);

    // Should have onClick or should open a modal
    // Check if it has onClick handler or modal integration
    expect(sourceCode).toMatch(/onClick=|AddClientModal|open.*Modal/);

    // Should NOT have an empty button without any handler
    // The button should not be the only interactive element
    const buttonSection = sourceCode.match(
      /data-testid="add-client-button"[\s\S]*?<\/Button>/
    );
    expect(buttonSection).toBeDefined();
    expect(buttonSection![0]).toMatch(/onClick=/);
  });
});
