import { Component, computed, ViewEncapsulation } from '@angular/core';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import {
  PageSectionContentText,
} from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';

@Component({
  selector: 'adapt-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  // Added so that the injected anchor tags from the in-page-nav component are effected by the styles in this component
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent {
  $pageContent = this.pagesContentService.getPageContentSignal('settings');
  $categoriesContent = computed(() => {
    const pageContent = this.$pageContent();
    if (pageContent?.sections?.length! > 0) {
      return pageContent?.sections![0] as PageSectionContentText;
    }
    return null;
  });
  constructor(public pagesContentService: PagesContentService) {}
}
