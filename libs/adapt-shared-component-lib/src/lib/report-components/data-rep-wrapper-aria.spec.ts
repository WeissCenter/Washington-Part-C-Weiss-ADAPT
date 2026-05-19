import { readFileSync } from 'fs';
import { join } from 'path';

describe('data representation wrapper aria attributes', () => {
  const templatePaths = [
    'data-rep/data-rep.component.html',
    'data-rep-grouped/data-rep-grouped.component.html',
    'data-rep-comparison/data-rep-comparison.component.html',
  ];

  it('does not label non-focusable data-rep-wrapper articles', () => {
    for (const templatePath of templatePaths) {
      const template = readFileSync(join(__dirname, templatePath), 'utf8');
      const articleMatch = template.match(/<article[^>]*class="[^"]*\bdata-rep-wrapper\b[^"]*"[^>]*>/);

      expect(articleMatch?.[0]).toBeDefined();
      expect(articleMatch?.[0]).not.toContain('aria-labelledby');
      expect(articleMatch?.[0]).not.toContain('aria-describedby');
    }
  });
});
