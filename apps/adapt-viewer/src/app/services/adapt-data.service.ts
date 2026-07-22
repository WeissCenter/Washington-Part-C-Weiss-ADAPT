import { LanguageService, SettingsService } from '@adapt/adapt-shared-component-lib';
import { environment } from '../../environments/environment';
import { IReportModel, Response, ShareReport, ViewerTemplate } from '@adapt/types';
import { HttpClient } from '@angular/common/http';
import { computed, Injectable, resource, ResourceRef } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdaptDataService {
  private _reports$$: ResourceRef<IReportModel[]> = resource({
    params: () => ({ lang: this.language.$language() }),
    loader: ({ params }) =>
      firstValueFrom(
        this.http
          .get<Response<IReportModel[]>>(`${environment.API_URL}reports?lang=${params.lang}`)
          .pipe(map((resp) => resp.data))
      ),
    defaultValue: [],
  });

  public reports$$ = this._reports$$.asReadonly();


  constructor(private http: HttpClient, private settings: SettingsService, private language: LanguageService) {}

  public getReport(slug: string, lang = 'en') {
    return this.http
      .get<Response<IReportModel>>(`${environment.API_URL}reports/${slug}?lang=${lang}`)
      .pipe(map((resp) => resp.data));
  }

  public getData(slug: string, filters: Record<string, any>, lang = 'en') {
    return this.http
      .post<Response<ViewerTemplate>>(`${environment.API_URL}reports/${slug}/data?lang=${lang}`, filters)
      .pipe(map((resp) => resp.data));
  }

  public shareReport(reportSlug: string, filters: Record<string, any>, tabIndex: number) {
    return this.http
      .post<Response<string>>(`${environment.API_URL}reports/share`, { reportSlug, filters, tabIndex })
      .pipe(map((result) => result.data));
  }

  public loadSharedReport(shareSlug: string) {
    return this.http
      .get<Response<ShareReport>>(`${environment.API_URL}reports/share/${shareSlug}`)
      .pipe(map((result) => result.data));
  }
}
