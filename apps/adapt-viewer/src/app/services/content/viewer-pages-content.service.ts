import { computed, Injectable, resource } from '@angular/core';
import { map, Observable, ReplaySubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContentService, LanguageService, SettingsService } from '@adapt/adapt-shared-component-lib';
import { ViewerContentText, ResourcePageContentText, HomePageContentText, SharedContentText, ErrorPageContentText, ReportPageContentText, ReportsPageContentText } from '../../models/content-text.model'
import { StorageService } from '../storage.service';

@Injectable({
  providedIn: 'root',
})
export class ViewerPagesContentService {
  viewerContentSubject: ReplaySubject<ViewerContentText> = new ReplaySubject<ViewerContentText>(1);
  viewerContent: ViewerContentText;

  public _viewerContent$$ = resource({
    params: () => ({
      lang: this.language.$language(),
    }),
    loader: ({ params }) => this.contentService.getContent(environment.appDomain, environment.contentRoot, environment.contentFileName, params.lang),
    defaultValue: {} as ViewerContentText,
  });
  public readonly viewerContent$$ = this._viewerContent$$.asReadonly();

  public readonly $sharedContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.shared as SharedContentText;
  });

  public readonly $resourcesContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.pages?.resources as ResourcePageContentText;
  });

  public readonly $homeContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.pages?.home as HomePageContentText;
  });

  public readonly $errorContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.pages?.error as ErrorPageContentText;
  });

  public readonly $reportContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.pages?.report as ReportPageContentText;
  });

  public readonly $reportsContent = computed(() => {
    const viewerContent = this.viewerContent$$.value();
    if (!viewerContent) {
      return null;
    }
    return viewerContent?.pages?.reports as ReportsPageContentText;
  });

  constructor(
    public contentService: ContentService,
    private storage: StorageService,
    private language: LanguageService
  ) {}
}
