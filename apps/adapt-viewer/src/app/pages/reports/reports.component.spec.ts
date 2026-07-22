import { readFileSync } from 'fs';
import { join } from 'path';

describe('ReportsComponent', () => {
  const template = readFileSync(join(__dirname, 'reports.component.html'), 'utf8');

  it('uses native button activation for the sort button', () => {
    expect(template).toContain('(click)="doSort(\'updated\')"');
    expect(template).not.toContain('(keydown.enter)="doSort(\'updated\')"');
  });

  it('keeps decorative sort icons hidden without redundant image semantics', () => {
    const iconMatches = template.match(/<i[^>]*aria-hidden="true"[^>]*>/g) ?? [];

    expect(iconMatches.length).toBeGreaterThan(0);
    for (const icon of iconMatches) {
      expect(icon).not.toContain('role="img"');
      expect(icon).not.toMatch(/\salt(=|\s|>)/);
    }
  });
});
