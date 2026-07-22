import { Injectable, computed, Signal, resource } from '@angular/core';

import {
  AdminContentText,
  PageContentText,
} from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';
import { environment } from '@adapt-apps/adapt-admin/src/environments/environment';
import { ContentService, SettingsService } from '@adapt/adapt-shared-component-lib';
import { LanguageCode } from '@adapt/types';

@Injectable({
  providedIn: 'root',
})
export class PagesContentService {
  private readonly LOAD_LANGUAGES: LanguageCode[] = ['en', 'es-MX'];

  private _adminContent$$ = resource({
    params: () => ({ languages: this.LOAD_LANGUAGES }),
    loader: ({ params }) =>
      Promise.all(
        params.languages.map(async (lang) => [
          lang,
          await this.contentService.getContent(
            environment.appDomain,
            environment.contentRoot,
            'admin-content-text.json',
            lang
          ),
        ])
      ).then((entries) => Object.fromEntries(entries) as Record<string, AdminContentText | null>),
    defaultValue: {} as Record<string, AdminContentText | null>,
  });

  public readonly adminContent$$ = this._adminContent$$.asReadonly();

  public readonly $adminContent = computed(() => {
    const lang = this.useLanguage();
    return this.adminContent$$.value()[lang] ?? null;
  });

  public readonly $sharedContent = computed(() => {
    return this.$adminContent()?.shared ?? null;
  });

  public readonly $listViewContent = computed(() => {
    return this.$adminContent()?.adaptListView ?? null;
  });

  constructor(private contentService: ContentService, private settings: SettingsService) {}

  getPageContentSignal(pageName: string, lang = 'default'): Signal<PageContentText | null> {
    return computed(() => {
      const useLang = this.useLanguage(lang);
      const content = this.adminContent$$.value()[useLang];
      return content?.pages?.find((p) => p.name === pageName) ?? null;
    });
  }

  private useLanguage(lang = 'default'): string {
    return lang === 'default' ? this.settings.getDefaultLanguage() : lang;
  }
}
