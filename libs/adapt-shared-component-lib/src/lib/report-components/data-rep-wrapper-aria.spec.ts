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

  it('does not put aria-expanded on glossary definition paragraphs', () => {
    for (const templatePath of templatePaths) {
      const template = readFileSync(join(__dirname, templatePath), 'utf8');
      const definitionParagraphs = template.match(/<p[^>]*class="[^"]*\bdefinition\b[^"]*"[^>]*>/g) ?? [];

      expect(definitionParagraphs.length).toBeGreaterThan(0);
      for (const paragraph of definitionParagraphs) {
        expect(paragraph).not.toContain('aria-expanded');
      }
    }
  });

  it('generates glossary controls with ids that include the rendered definition-id separator', () => {
    const sourcePaths = [
      '../services/data-rep.service.ts',
      'data-rep/data-rep.component.ts',
      'data-rep-grouped/data-rep-grouped.component.ts',
    ];

    for (const sourcePath of sourcePaths) {
      const source = readFileSync(join(__dirname, sourcePath), 'utf8');

      expect(source).toContain("'-series-item-definition-'");
      expect(source).not.toContain(" + 'series-item-definition-'");
    }
  });
});
