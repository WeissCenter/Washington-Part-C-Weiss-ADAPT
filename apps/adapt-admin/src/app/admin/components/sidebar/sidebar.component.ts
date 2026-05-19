import { AfterViewInit, Component, computed, ElementRef, Input, ViewChild } from '@angular/core';
import { UserService } from '../../../auth/services/user/user.service';
import { SettingsService } from '@adapt/adapt-shared-component-lib';
import { ModalComponent } from '@adapt/adapt-shared-component-lib';
import { environment } from '../../../../environments/environment';
import { RoleService } from '../../../auth/services/role/role.service';

@Component({
  selector: 'adapt-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements AfterViewInit {
  @ViewChild('confirmLogOut') confirmLogOutModal?: ModalComponent;
  @ViewChild('navList') navList!: ElementRef<HTMLUListElement>;
  //  public logoURL = 'assets/shared/logos/state-nav-logo.svg'
    //computed(() => {
  //   const settingsLogo = this.settings.getSettingsSignal()().logo;
  //   return this.sanitzier.bypassSecurityTrustUrl(
  //     `https://${environment.s3PublicAssetsDomainName}.s3.amazonaws.com/${settingsLogo}`
  //   );
  // });
  // magnifying glass logo
  collapsedLogo = 'assets/shared/logos/static/sidebar-bottom-logo__collapsed.svg';
  openLogo = 'assets/shared/logos/static/sidebar-bottom-logo__expanded.svg';

  public logoURL = `${environment.logoPath ?? 'assets/logos/generic'}/state-nav-logo.${environment.logoExtension ?? 'svg'}`;
  public logoIsSvg = this.logoURL.endsWith('.svg');

  constructor(
    public role: RoleService,
    public user: UserService,
    private settings: SettingsService
  ) {}

  nav_collapsed = true;

  toggleNav() {
    this.nav_collapsed = !this.nav_collapsed;
  }

  ngAfterViewInit(): void {
    this.navList.nativeElement.querySelectorAll('[role="menuitem"]').forEach((item, index, items) => {
      // Count starts at 1 for humans
      const position = index + 1;
      const total = items.length;

      // NVDA and JAWS supports automatic x of n annouce however mac voice over doesn't so we don't need to add these on windows devices
      if (!navigator.userAgent.includes('Mac OS X')) {
        return;
      }

      item.addEventListener('focus', () => {
        const customLabel = `${position} of ${total}`;
        item.setAttribute('aria-roledescription', customLabel);
      });

      item.addEventListener('blur', () => {
        item.removeAttribute('aria-roledescription');
      });
    });
  }

  closeMenuOnNavigation() {
    // if at mobile size, close the menu when a link is clicked
    if (window.innerWidth < 640) {
      this.nav_collapsed = true;
    }
  }

  public startSignout($event: any) {
    if ($event.code !== 'Enter' && $event.code !== 'Space' && !($event instanceof PointerEvent)) return;
    this.confirmLogOutModal?.open();
    this.closeMenuOnNavigation();
  }

  public signOut(event: any) {
    this.confirmLogOutModal?.close();
    this.user.logout();
  }

  public cancelLogout(event: any) {
    this.confirmLogOutModal?.close();
  }
}
