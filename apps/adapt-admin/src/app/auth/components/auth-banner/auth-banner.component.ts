import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'adapt-auth-banner',
  standalone: false,
  templateUrl: './auth-banner.component.html',
  styleUrl: './auth-banner.component.scss',
})
export class AuthBannerComponent {
  @Input() label = 'Generic Auth Banner';
  @Input() logo = `${environment.logoPath ?? 'assets/logos/generic'}/state-hero-logo.${environment.logoExtension ?? 'svg'}`;
  @Input() logoAlt = 'ADAPT logo';

  @Input() message = '[Message]';
  @Input() messageSubTitle = '';

  public logoStyleClass = `${environment.logoStyleClass ?? 'width-card'}`;

  public get logoIsSvg() {
    return this.logo.toLowerCase().endsWith('.svg');
  }
}
