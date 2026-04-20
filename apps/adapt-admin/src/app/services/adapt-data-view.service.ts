import { Injectable, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { DATA_VIEW_STATUS, DataViewModel, NewDataViewInput, Response as APIResponse, StartUploadDataViewInput } from '@adapt/types';
import { environment } from '@adapt-apps/adapt-admin/src/environments/environment';
import { BehaviorSubject, filter, firstValueFrom, map, Observable, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UserService } from '@adapt-apps/adapt-admin/src/app/auth/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class AdaptDataViewService implements OnDestroy {

  private pollingIntervalId: any;
  private pollingTimeoutId: any;
  private stillHaveOutstandingDataViewStatuses = false;
  private loadingDataViews = false;
  private _dataViews = new BehaviorSubject<DataViewModel[]>([]);  //ReplaySubject<DataViewModel[]>();
  public $dataViews: Observable<DataViewModel[]> = this._dataViews.asObservable();

  constructor(private logger: NGXLogger,
              private user: UserService,
              private http: HttpClient,) {

    this.logger.debug('Inside AdaptDataViewService service constructor');

    this.user.isLoggedIn$
      .pipe(
        filter((val) => val),
        take(1)
      )
      .subscribe(() => {

        this.loadDataViewList();
      });
  }

  private sortDataViewsByCreated(dataViews: DataViewModel[]): DataViewModel[] {
    return [...dataViews].sort((a, b) => b.created - a.created);
  }

  public loadDataViewList() {
    this.logger.debug('Inside AdaptDataViewService service loadDataViewList');

    //reset
    this.stillHaveOutstandingDataViewStatuses = false;
    this.loadingDataViews = true;

    this.http.get<APIResponse<DataViewModel[]>>(`${environment.API_URL}dataview`).subscribe((response) => {

        this.logger.debug('loadDataViewList response: ', response);
        this.loadingDataViews = false;  // done loading views
        if (response.success && response.data){

          const sortedDataViews = this.sortDataViewsByCreated(response.data);

          this._dataViews.next(sortedDataViews);

          // Start the interval, calling pollDataViewsInProgress every 2 second (delayTime).
          this.startPollingDataViewStatuses(sortedDataViews);
        }
        else {
          this.logger.error('ERROR: Unable to loadDataViewList');
        }

      });

    /*
    .pipe(
      map((response) => {

        this.logger.debug('loadDataViewList response: ', response);
        if (response.data){

          //this._dataViews.next(response.data);
        }

      }))
     */
  }

  public startPollingDataViewStatuses(currentDataViewList: DataViewModel[] | null = null) {
    this.logger.debug('Inside AdaptDataViewService service startPollingDataViewStatuses');

    const delayTime = 3000; // 3 seconds: this is the time we delay in milliseconds between polling's
    const maxPolingTime = 1000*60; // 60 seconds: this is the time in milliseconds that we will wait for the data to be polled, so after this time all poling will stop
    const expireDays = 3; //70;

    // make sure we do not have any other polling going on
    this.stopPollingDataViewStatuses();

    if (!currentDataViewList){
      this.logger.debug('No currentDataViewList so get it from the BehaviorSubject');
      currentDataViewList = this._dataViews.getValue();
    }

    this.pollingIntervalId = setInterval(() => {
      this.pingDataViewsInProgress(currentDataViewList, expireDays);
    }, delayTime);


    // After maxPolingTime seconds, clear the interval using the stored intervalId.
    this.pollingTimeoutId = setTimeout(() => {
     this.stopPollingDataViewStatuses();
    }, maxPolingTime);

  }

  /**
   * Stop the polling interval.
   * Clear the interval to prevent memory leaks when the component is destroyed
   * @private
   */
  private stopPollingDataViewStatuses() {
    this.logger.debug('Inside AdaptDataViewService service stopPollingDataViewStatuses');

    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }

    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
  }

  public isPolling(): boolean{
    this.logger.debug('Inside AdaptDataViewService service isPolling; ', !!this.pollingIntervalId, ', loadingDataViews: ', this.loadingDataViews);

    return !!this.pollingIntervalId || this.loadingDataViews;

    /*
    Purpose of the Double Bang Operator (!!)
      The !! operator is used to explicitly cast any JavaScript value to its corresponding boolean equivalent (true or false). It works by:

        First !: Negating the truthiness of the value. If the value is truthy (e.g., a non-empty string, a non-zero number, an object),
        it becomes false. If the value is falsy (e.g., 0, null, undefined, empty string, false), it becomes true.

        Second !: Negating the result of the first negation, effectively converting the original value into its strict boolean
        representation without flipping its truthiness.
     */
  }

  private async pingDataViewsInProgress(dataViewList: DataViewModel[], expireDays: number) {
    this.logger.debug('Inside AdaptDataViewService service pingDataViewsInProgress');

    const today = new Date().getTime(); // time in milliseconds
    const dayInMilliseconds = 1000 * 60 * 60 * 24 * 1;  // This is one day converted to milliseconds
    const expireTime = dayInMilliseconds*expireDays
    //this.logger.debug('expireTime: ', expireTime, ', today: ', today);

    for (const dataView of dataViewList) {

      //const daysOld = (today - dataView.updated!)/dayInMilliseconds;

      //this.logger.debug('Found Status: ', dataView.status, new Date(dataView.updated!), ', daysOld: ', daysOld);
      //DATA_VIEW_STATUS
      if (dataView.status === DATA_VIEW_STATUS.PROCESSING || dataView.status === DATA_VIEW_STATUS.REQUESTED){

       // this.logger.debug(`Check dataView[${dataView.dataViewID}]`);

        // if the report was generated less than this.expireDays days ago, then check if it is still in progress
        if (dataView.updated && ((today - dataView.updated) < expireTime)){

          this.logger.debug(`Load dataView[${dataView.dataViewID}]`);

          try{
            const dataViewUpdatedDataResponse = await firstValueFrom(
              this.getDataView(dataView.dataViewID)
            );
            //.catch((err) => { });

            // .subscribe((dataViewUpdatedDataResponse) => {

            this.processDataViewUpdateResponse(dataView, dataViewUpdatedDataResponse, dataViewList);

            // });
          }
          catch (error){
            this.logger.error(`ERROR: Unable to load dataView[${dataView.name}], error: `, error);
          }

        }
        else {
          //this.logger.debug(`Skip dataView[${dataView.name}]${dataView.status} it was generated more than ${daysOld} days ago`);

          dataView.status = DATA_VIEW_STATUS.FAILED; //If we did not get an update after the expired time we assume the dataview creation failed
        }

      }

    }

    if (this.stillHaveOutstandingDataViewStatuses){
      this.logger.debug('Still have outstanding statuses so keep polling for dataView statuses');
    }
    else {
      this.logger.debug('No more outstanding statuses so stop polling for dataView statuses');
      this.stopPollingDataViewStatuses();
    }
  }

  private processDataViewUpdateResponse(dataView: DataViewModel, dataViewUpdatedDataResponse: APIResponse<DataViewModel>, dataViewList: DataViewModel[]) {
    this.logger.debug('Inside AdaptDataViewService service processDataViewUpdateResponse');

    this.logger.debug(`Response for dataView[${dataView.dataViewID}]: `,dataViewUpdatedDataResponse);

    // also check updated Date
    if (dataViewUpdatedDataResponse?.success === true){

      const updatedDataView = dataViewUpdatedDataResponse.data;
      const lastUpdatedDate = new Date(updatedDataView.updated!);
      //const currentDataViewList = this._dataViews.getValue();

      this.logger.debug(`Got updated dataView[${dataView.name}] with lastUpdatedDate: `, lastUpdatedDate, ', previous: ', dataView.status, ', current: ', updatedDataView.status);

      // if (dataView){
      //   this.logger.debug('Update status to TESTING');
      //   dataView.status = 'TESTING';
      // }

      //&& (updatedDataView.status !== dataView.status)
      if (updatedDataView.status && (updatedDataView.status !== dataView.status)){
        this.logger.debug(`Update dataView[${dataView.name}] status: `, dataView.status);
        dataView.status = updatedDataView.status;

        // notify all listeners of the new updated status
        this._dataViews.next(this.sortDataViewsByCreated(dataViewList));

        // If the status is still processing or requested we want to let dady know that we need to keep on polling
        if (dataView.status === DATA_VIEW_STATUS.PROCESSING || dataView.status === DATA_VIEW_STATUS.REQUESTED){
          this.stillHaveOutstandingDataViewStatuses = true;
        }
      }
    }
    else {
      this.logger.error(`ERROR: Unable to load dataView[${dataView.dataViewID}]`);
    }

  }

  public getDataViews(): Observable<DataViewModel[]> {
    this.logger.debug('Inside AdaptDataViewService service getDataViews');

    return this.$dataViews;
  }

  public createDataView(body: NewDataViewInput) {
    this.logger.debug('Inside createDataView, body: ', body);

    return this.http
      .post<APIResponse<DataViewModel>>(`${environment.API_URL}dataview`, body)
      .pipe(map((result) => result.data));
  }

  public async addDataView(newDataView: DataViewModel) {
    this.logger.debug('Inside AdaptDataViewService service addDataView, newDataView: ', newDataView);

    // First get the current list of data views
    const currentDataViewList = this._dataViews.getValue();

    // Next, filter out the newly added data view just for in case we have a duplicate
    const modifiedList = currentDataViewList.filter((view) => view.dataViewID !== newDataView.dataViewID);

    // add the newest data view into the canonical creation-sorted list
    modifiedList.push(newDataView);

    // notify the UI that we have a newly updated report
    this._dataViews.next(this.sortDataViewsByCreated(modifiedList));

    /*
    const currValue = ((await firstValueFrom(this._dataViews)) || []).filter(
    //const currValue = (this._dataViews) || DataView[]).filter(
      (view) => view.dataViewID !== dataView.dataViewID
    );
    currValue.push(dataView);
    this._dataViews.next(currValue);

     */

    // Now reload all reports and refresh statuses
    this.loadDataViewList();  // need to poll for updated status to refresh UI
  }

  public editDataView(body: DataViewModel, justification?: string) {
    this.logger.debug('Inside editDataView, body: ', body);

    return this.http.put<APIResponse<DataViewModel>>(
        `${environment.API_URL}dataview/${body.dataViewID}${justification ? '?justification=' + justification : ''}`,
        body
      )
      .pipe(map((result) => result.data));
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
        .pipe(map((result) => result.data))
    );
  }

  public getDataView(dataViewID: string) {
    this.logger.debug('Inside getDataView, dataViewID: ', dataViewID);

    const url = `${environment.API_URL}dataview/${dataViewID}`;
    this.logger.debug('url: ', url);

    return this.http.get<APIResponse<DataViewModel>>(url);
  }

  public deleteDataView(id: string) {
    return this.http.delete(`${environment.API_URL}dataview/${id}`);
  }

  public doDataPull(dataSetID: string) {
    this.logger.debug('Inside doDataPull, dataSetID: ', dataSetID);

    return this.http.post<APIResponse<any>>(`${environment.API_URL}dataview/${dataSetID}/pull`, '');
  }

  ngOnDestroy() {
    this.logger.debug('Inside AdaptDataViewService service ngOnDestroy');
    // Clear the interval to prevent memory leaks when the component is destroyed
    this.stopPollingDataViewStatuses();
  }
}
