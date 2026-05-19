import { readFileSync } from 'fs';
import { join } from 'path';

describe('ModalComponent accessibility markup', () => {
  const template = readFileSync(join(__dirname, 'modal.component.html'), 'utf8');

  it('does not expose redundant semantics on the decorative close icon svg', () => {
    const closeIcon = template.match(/<svg[^>]*class="usa-icon"[^>]*>/)?.[0];

    expect(closeIcon).toBeDefined();
    expect(closeIcon).toContain('aria-hidden="true"');
    expect(closeIcon).toContain('focusable="false"');
    expect(closeIcon).not.toContain('role="img"');
    expect(closeIcon).not.toContain('alt=""');
  });
});
