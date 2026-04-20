import { Component, OnChanges, SimpleChanges, Input, HostListener, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InlineSvgService } from './inline-svg.service';

@Component({
  selector: 'lib-adapt-inline-svg',
  standalone: false,
  template: '<span [innerHTML]="svgContent" [hidden]="hidden" [class]="svgClass" [attr.aria-hidden]="isDecorative || hidden ? \'true\' : null"></span>',
  providers: [InlineSvgService],
})
export class InlineSvgComponent implements OnChanges {
  @Input() alt = '';
  @Input() label?: string;
  @Input() src!: string;
  @Input() media?: string;
  @Input() svgClass = ''; // Optional class input
  @Input() focusable: boolean | undefined = undefined; // Optional focusable input
  @Input() decorative = false;
  @Input('aria-hidden') legacyAriaHidden?: string | boolean | null;

  hidden = true;
  svgContent: SafeHtml = '';
  private readonly titleId = `svg-title-${Math.random().toString(36).slice(2, 11)}`;

  get isDecorative(): boolean {
    return this.decorative || this.legacyAriaHidden === true || this.legacyAriaHidden === 'true';
  }

  constructor(private svgService: InlineSvgService, private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Reload SVG when src changes (including first change from computed properties)
    if (changes['src']?.currentValue || changes['alt'] || changes['label'] || changes['decorative'] || changes['legacyAriaHidden'] || changes['focusable']) {
      this.loadSvg();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.loadSvg();
  }

  private loadSvg(): void {
    if (this.media && !window.matchMedia(this.media).matches) {
      this.svgContent = '';
      this.hidden = true;
      return;
    }
    if (!this.src) {
      this.hidden = true;
      return;
    }

    this.svgService.getSvg(this.src).subscribe({
      next: (svg) => {
        this.hidden = false;
        this.svgContent = this.sanitizer.bypassSecurityTrustHtml(this.normalizeSvg(svg));
        this.cdr.detectChanges(); // Force change detection
      },
      error: () => {
        this.hidden = true;
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }

  private normalizeSvg(svgMarkup: string): string {
    if (!/<svg\b/i.test(svgMarkup)) {
      return svgMarkup;
    }

    const accessibleName = this.label?.trim() || this.alt.trim();
    let normalizedSvg = this.removeAccessibilityMarkup(svgMarkup);

    if (this.isDecorative) {
      return this.addSvgAttributes(normalizedSvg, {
        'aria-hidden': 'true',
        ...(this.focusable !== undefined ? { focusable: String(this.focusable) } : {}),
      });
    }

    if (!accessibleName) {
      console.warn(`InlineSvgComponent: informative SVG "${this.src}" is missing alt/label text.`);
      return this.focusable !== undefined
        ? this.addSvgAttributes(normalizedSvg, { focusable: String(this.focusable) })
        : normalizedSvg;
    }

    normalizedSvg = this.addSvgAttributes(normalizedSvg, {
      role: 'img',
      'aria-labelledby': this.titleId,
      ...(this.focusable !== undefined ? { focusable: String(this.focusable) } : {}),
    });

    return normalizedSvg.replace(
      /(<svg\b[^>]*>)/i,
      `$1<title id="${this.titleId}">${this.escapeXml(accessibleName)}</title>`
    );
  }

  private removeAccessibilityMarkup(svgMarkup: string): string {
    return svgMarkup
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/gi, '')
      .replace(/\s(?:aria-label|aria-describedby|aria-labelledby|aria-hidden|role|focusable)=['"][^'"]*['"]/gi, '');
  }

  private addSvgAttributes(svgMarkup: string, attributes: Record<string, string>): string {
    const renderedAttributes = Object.entries(attributes)
      .map(([key, value]) => `${key}="${this.escapeXml(value)}"`)
      .join(' ');

    return svgMarkup.replace(/<svg\b([^>]*)>/i, (_match, existingAttributes: string) => {
      return `<svg${existingAttributes}${renderedAttributes ? ` ${renderedAttributes}` : ''}>`;
    });
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
