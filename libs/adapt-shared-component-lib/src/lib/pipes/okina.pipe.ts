import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'okina', standalone: false })
export class OkinaPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    if (!value.includes('\u02BB')) {
      return value;
    }

    // Replace each ʻokina with an aria-hidden span so screen readers skip it
    const result = value.replace(/\u02BB/g, '<span aria-hidden="true">&#699;</span>');
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}