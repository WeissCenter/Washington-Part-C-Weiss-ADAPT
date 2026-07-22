import { Injectable, resource, ResourceRef, Signal } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { DataViewModel, NewDataViewInput, Response as APIResponse, StartUploadDataViewInput, DATA_VIEW_STATUS } from '@adapt/types';
import { environment } from '@adapt-apps/adapt-admin/src/environments/environment';
import { filter, firstValueFrom, interval, map, Observable, take, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class AdaptDataViewService {
  pollTrigger: Signal<number | undefined> = toSignal(interval(30 * 1000).pipe(filter(() => this._dataViews$$.value().some((dataView: DataViewModel) => this.shouldPollDataView(dataView)))));
  private _dataViews$$: ResourceRef<DataViewModel[]> = resource({
    params: () => ({
      // trigger: this.pollTrigger(),
    }),
    loader: () =>
      firstValueFrom(this.http.get<APIResponse<DataViewModel[]>>(`${environment.API_URL}dataview`).pipe(map((result) => result.data))).then((dataViews: DataViewModel[]) => {
        return [...dataViews].sort((a, b) => b.created - a.created);
      }),
    defaultValue: [],
  });
  public dataViews$$ = this._dataViews$$.asReadonly();

  constructor(
    private logger: NGXLogger,
    private http: HttpClient
  ) {
    this.logger.debug('Inside AdaptDataViewService service constructor');
  }
  
  shouldPollDataView(dataView: DataViewModel): boolean {
    const DAYS_SINCE_UPDATE_THRESHOLD = 1; // Number of days to consider for polling
    const STATUSES_TO_POLL: string[] = [DATA_VIEW_STATUS.PROCESSING, DATA_VIEW_STATUS.REQUESTED]; // Report statuses that require polling
    
    const isPollStatus = STATUSES_TO_POLL.includes(dataView?.status || '');
    const isUpdatedRecently = new Date().getTime() - (dataView?.updated ? dataView.updated : dataView.created) < 1000 * 60 * 60 * 24 * DAYS_SINCE_UPDATE_THRESHOLD;
    
    return isPollStatus && isUpdatedRecently;
  }

  public createDataView(body: NewDataViewInput) {
    this.logger.debug('Inside createDataView, body: ', body);

    return this.http
      .post<APIResponse<DataViewModel>>(`${environment.API_URL}dataview`, body)
      .pipe(map((result) => result.data), tap(() => this._dataViews$$.reload()));
  }

  public editDataView(body: DataViewModel, justification?: string) {
    this.logger.debug('Inside editDataView, body: ', body);

    return this.http.put<APIResponse<DataViewModel>>(
        `${environment.API_URL}dataview/${body.dataViewID}${justification ? '?justification=' + justification : ''}`,
        body
      )
      .pipe(map((result) => result.data), tap(() => this._dataViews$$.reload()));
  }

  private getDataViewUploadURL(input: StartUploadDataViewInput) {
    return this.http
      .post<APIResponse<string>>(`${environment.API_URL}dataview/upload`, input)
      .pipe(map((result) => result.data));
  }

  public getDataViewUploadURLPromise(input: StartUploadDataViewInput) {
    return firstValueFrom(this.getDataViewUploadURL(input));
  }

  public editDataViewPromise(body: DataViewModel, justification?: string) {
    this.logger.debug('Inside editDataViewPromise, body: ' + body);

    return firstValueFrom(
      this.http
        .put<APIResponse<DataViewModel>>(
          `${environment.API_URL}dataview/${body.dataViewID}${justification ? '?justification=' + justification : ''}`,
          body
        )
        .pipe(map((result) => result.data), tap(() => this._dataViews$$.reload()))
    );
  }

  public getDataView(dataViewID: string) {
    this.logger.debug('Inside getDataView, dataViewID: ', dataViewID);

    const url = `${environment.API_URL}dataview/${dataViewID}`;
    this.logger.debug('url: ', url);

    return this.http.get<APIResponse<DataViewModel>>(url);
  }

  public deleteDataView(id: string) {
    this.logger.debug('Inside deleteDataView, id: ', id);

    return this.http.delete<APIResponse<string>>(`${environment.API_URL}dataview/${id}`).pipe(tap(() => this._dataViews$$.reload()));
  }

  public doDataPull(dataSetID: string) {
    this.logger.debug('Inside doDataPull, dataSetID: ', dataSetID);

    return this.http.post<APIResponse<any>>(`${environment.API_URL}dataview/${dataSetID}/pull`, '');
  }

  reloadDataViews() {
    this._dataViews$$.reload();
  }
}
