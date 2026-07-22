import { Injectable, OnDestroy, resource, ResourceRef, Signal } from '@angular/core';
import { filter, firstValueFrom, interval, map, Observable, take, tap } from 'rxjs';
import {
  CreateReportInput,
  IReportModel,
  REPORT_PUBLISH_STATUS,
  Response as APIResponse,
} from '@adapt/types';
import { NGXLogger } from 'ngx-logger';
import { UserService } from '@adapt-apps/adapt-admin/src/app/auth/services/user/user.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@adapt-apps/adapt-admin/src/environments/environment';
import { toSignal } from '@angular/core/rxjs-interop';


@Injectable({
  providedIn: 'root',
})
export class AdaptReportService implements OnDestroy {

  pollTrigger: Signal<number | undefined> = toSignal(interval(30 * 1000).pipe(filter(() => this._reports$$.value().some((report: IReportModel) => this.shouldPollReport(report)))));
  private _reports$$: ResourceRef<IReportModel[]> = resource({
    params: () => ({
      // trigger: this.pollTrigger(),
    }),
    loader: () =>
      firstValueFrom(this.http.get<APIResponse<IReportModel[]>>(`${environment.API_URL}report`).pipe(map((result) => result.data))).then((reports) => {
        const sortedReports = [...reports].sort((a, b) => {
          const updatedA = parseInt(a.updated, 10); // Convert the string to an integer
          const updatedB = parseInt(b.updated, 10);
          return updatedB - updatedA;
        });
        this.logger.debug('AdaptReportService loaded reports: ', sortedReports);
        return sortedReports;
      }),
    defaultValue: [],
  });

  public reports$$ = this._reports$$.asReadonly();

  constructor(
    private logger: NGXLogger,
    private http: HttpClient
  ) {
  }

  private shouldPollReport(report: IReportModel): boolean {
    const DAYS_SINCE_UPDATE_THRESHOLD = 1; // Number of days to consider for polling
    const STATUSES_TO_POLL: string[] = [REPORT_PUBLISH_STATUS.PROCESSING, REPORT_PUBLISH_STATUS.REQUESTED]; // Report statuses that require polling
    
    const isPollStatus = STATUSES_TO_POLL.includes(report?.status || '');
    const isUpdatedRecently = new Date().getTime() - parseInt(report.updated, 10) < 1000 * 60 * 60 * 24 * DAYS_SINCE_UPDATE_THRESHOLD;
    
    return isPollStatus && isUpdatedRecently;
  }

  public createReport(report: CreateReportInput) {
    this.logger.debug('Inside createReport, report: ', report);

    return this.http.post<APIResponse<string>>(`${environment.API_URL}report`, report)
      .pipe(map((result) => result.data)).pipe(tap(() => this._reports$$.reload()));
  }

  public getReport(id: string, version = 'draft', lang?: string): Observable<IReportModel[] | undefined> {
    this.logger.debug('Inside getReport, id: ', id, ', version: ', version, ', lang: ', lang);

    const url = `${environment.API_URL}report/${id}`;
    let params = new HttpParams().append('version', version);

    if(lang){
      params = params.append('lang', lang)
    }

    this.logger.debug('url: ', url, params);

    return this.http.get<APIResponse<IReportModel[]>>(url, { params})
      .pipe(map((response) => {

        if (response.success && response.data){
          return response.data;
        }
        return [];

      }));
  }

  public getReportData(id: string, version = 'draft', filters = {}, suppressed = false, lang = 'en', pageId?: string){

    this.logger.debug('Inside getReportData, id: ', id, ', version: ', version, ', lang: ', lang);

    let params = new HttpParams();

    params = params.append('version', version)

    params = params.append('suppressed', suppressed)
    params = params.append('lang', lang)
    if (pageId !== undefined) {
      params = params.append('pageId', pageId)
    }
    return this.http
      .post<APIResponse<any>>(`${environment.API_URL}report/${id}/data`, filters, {params})
      .pipe(map((result) => result.data));
  }

  public editReport(report: {reportID: string, languages: {[lang: string] : IReportModel}}) {
    this.logger.debug('Inside editReport, report: ', report);
    return this.http
      .put<APIResponse<IReportModel>>(`${environment.API_URL}report/${report.reportID}`, report)
      .pipe(map((result) => result.data), tap(() => this._reports$$.reload()));
  }

  public startReportPublish(report: IReportModel) {
    this.logger.debug('Inside startReportPublish, report: ', report);

    return this.http.post<APIResponse<string>>(`${environment.API_URL}report/${report.reportID}/publish`, {}).pipe(tap(() => this._reports$$.reload()));
  }

  public unPublishReport(report: IReportModel, justification = '') {

    this.logger.debug('Inside unPublishReport, report: ', report);

    return this.http.post<APIResponse<string>>(`${environment.API_URL}report/${report.reportID}/unpublish`, {
      justification,
    }).pipe(tap(() => this._reports$$.reload()));
  }

  public deleteReport(reportId: string) {
    this.logger.debug('Inside deleteReport, reportId: ', reportId);    
    
    return this.http.delete<APIResponse<string>>(`${environment.API_URL}report/${reportId}`).pipe(tap(() => this._reports$$.reload()));
  }

  ngOnDestroy() {
    this.logger.debug('Inside AdaptReportService service ngOnDestroy');
    // Clear the interval to prevent memory leaks when the component is destroyed
  }

  refreshReports() {
    this._reports$$.reload();
  }
}
