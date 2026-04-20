import { Component, computed, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'adapt-hero-banner',
  standalone: false,
  templateUrl: './hero-banner.component.html',
  styleUrls: ['./hero-banner.component.scss'],
})
export class HeroBannerComponent {
  @Input() name: string | null = 'User Name';
  @Input() role: string | null = 'User Role';
  @Input() organization: string = 'User Organization';

  public logoStyleClass = `${environment.logoStyleClass ?? 'width-card'}`;
  public logoURL = `${environment.logoPath ?? 'assets/logos/generic'}/state-hero-logo.${environment.logoExtension ?? 'svg'}`;
  public logoIsSvg = this.logoURL.endsWith('.svg');

  protected readonly environment = environment;
}
