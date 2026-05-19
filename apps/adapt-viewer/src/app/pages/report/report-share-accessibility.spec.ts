import { readFileSync } from 'fs';
import { join } from 'path';

describe('ReportComponent share dialog accessibility', () => {
  const reportTemplate = readFileSync(join(__dirname, 'report.component.html'), 'utf8');
  const reportComponent = readFileSync(join(__dirname, 'report.component.ts'), 'utf8');

  it('clears the copy confirmation before opening the share dialog', () => {
    const openShareModal = reportComponent.match(/public openShareModal\(\) \{[\s\S]*?const appliedFilters/)?.[0];

    expect(openShareModal).toBeDefined();
    expect(openShareModal).toContain("this.shareCopyStatusMessage = '';");
    expect(openShareModal!.indexOf("this.shareCopyStatusMessage = '';")).toBeLessThan(
      openShareModal!.indexOf('this.shareModal?.open();')
    );
  });

  it('keeps the share dialog live region empty until copy status changes', () => {
    expect(reportTemplate).toContain('<div aria-live="polite" aria-atomic="true" class="visually-hidden">{{ shareCopyStatusMessage }}</div>');
    expect(reportTemplate).not.toContain('aria-live="polite" aria-atomic="true" class="visually-hidden">Link copied to clipboard.');
  });

  it('does not expose redundant semantics on the copy icon', () => {
    const copyIcon = reportTemplate.match(/<i[^>]*class="fal fa-copy"[^>]*>/)?.[0];

    expect(copyIcon).toBeDefined();
    expect(copyIcon).toContain('aria-hidden="true"');
    expect(copyIcon).not.toContain('role="img"');
    expect(copyIcon).not.toContain('alt=""');
  });
});
