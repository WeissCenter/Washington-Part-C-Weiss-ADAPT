import {
  GetDataFromDataSetOutput,
  IReportModel,
  AddDataInput,
  DataSource,
  NewDataSetInput,
  DataSet,
  QueryDataSourceInput,
  QueryDataSourceOutput,
  TestDBConnectionInput,
  DataSetOperation,
  ISuppression,
  IDataCollectionTemplate,
  DataViewOperation,
  GetDataFromDataViewOutput,
  DataSourceConnectionInfo,
  AdaptSettings,
  UpdateAdaptSettingsInput,
  TemplateType,
  ShareReport,
  AppRolePermissions,
  LanguageCode,
} from '@adapt/types';
import { ValidationTemplate } from '@adapt/validation';
import { HttpClient, HttpRequest, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Subject,
  debounceTime,
  buffer,
  map,
  firstValueFrom,
  Observable,
  from,
  filter,
  take,
  ReplaySubject,
  tap,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { Response as APIResponse } from '@adapt/types';
import { UserService } from '../auth/services/user/user.service';
import { SettingsService } from '@adapt/adapt-shared-component-lib';
import { NGXLogger } from 'ngx-logger';
@Injectable({
  providedIn: 'root',
})
export class AdaptDataService {
  private _cache?: Cache;

  private getDataFromDataSetSubject = new Subject();
  private debouceGetDataFromDataSet$ = this.getDataFromDataSetSubject.pipe(debounceTime(75));
  private getDataFromDataSetResultsSubject = new Subject<GetDataFromDataSetOutput[]>();

  //private _reports = new ReplaySubject<IReport[]>();
  //private _dataViews = new ReplaySubject<DataView[]>();
  private _dataSources = new ReplaySubject<DataSource[]>();

  //public $reports = this._reports.asObservable();
  //public $dataViews = this._dataViews.asObservable();
  public $dataSources = this._dataSources.asObservable();

  private getDataFromDataSet$ = this.getDataFromDataSetSubject.pipe(
    buffer(this.debouceGetDataFromDataSet$),
    map((items) => this.reduceOperations(items))
  );

  constructor(private logger: NGXLogger,
              private http: HttpClient,
              private user: UserService,
              private settings: SettingsService) {

    this.logger.debug('Inside AdaptDataService service constructor');


    this.user.isLoggedIn$.pipe(filter((val) => val),take(1)).subscribe(() => {

        //this.adaptDataViewService.loadDataViewList();

        // this.http
        //   .get<APIResponse<DataView[]>>(`${environment.API_URL}dataview`)
        //   .pipe(map((result) => result.data))
        //   .subscribe((dataViews) => this._dataViews.next(dataViews));

        this.http
          .get<APIResponse<DataSource[]>>(`${environment.API_URL}data`)
          .pipe(map((result) => {
            // console.log(result.data)
            return result.data;
          }))
          .subscribe((dataSources) => this._dataSources.next(dataSources));

        // this.http
        //   .get<APIResponse<IReport[]>>(`${environment.API_URL}report`)
        //   .pipe(map((result) => result.data))
        //   .subscribe((reports) => this._reports.next(reports));

        this.http
          .get<APIResponse<AdaptSettings>>(`${environment.API_URL}settings`)
          .pipe(map((result) => result.data))
          .subscribe((settings) => this.settings.next(settings));
      });
  }

  private reduceOperations(items: any[]) {
    const reducedItems = items.reduce((accum, item) => {
      const { dataSetID, operations } = item;

      const idx = accum.findIndex((accumItem: any) => accumItem['dataSetID'] === dataSetID);

      if (idx === -1) {
        accum.push(item);
        return accum;
      }

      const storedItem = accum[idx];

      (storedItem?.operations || []).push(...(operations || []));

      return accum;
    }, []);

    // remove any duplicate operations

    for (const item of reducedItems) {
      const { operations } = item;

      item.operations = operations.filter(
        (operation: any, idx: number) => operations.findIndex((op: any) => op.id === operation.id) === idx
      );
    }

    return reducedItems;
  }

  public uploadFile(url: string, file: File) {
    this.logger.debug('Inside uploadFile, url: ', url);

    const req = new HttpRequest('PUT', url, file, {
      reportProgress: true,
    });

    return this.http.request(req);
  }

  /**
   * This is linked to the lambda function: isUniqueHandler: isUnique.ts
   * It checks if a report or data view or data set name is unique so that we do not create duplicate report names
   * @param type: Report, DataView, DataSet
   * @param name
   * @param field: name or slug
   */
  public isNameUnique(type: string, name: string, field = "name") {
    this.logger.debug('Inside isNameUnique, type: ', type, ', field: ', field, ', name: ', name);

    return this.http.post<APIResponse<boolean>>(`${environment.API_URL}unique`, { type, name, field })
      .pipe(map((result) => result.data));
  }

  public deleteDataSource(dataSourceID: string) {
    // internal delete
    return this.http.delete<APIResponse<any>>(`${environment.API_URL}data/${dataSourceID}`);
  }

  public validateFile(dataSourceID: string, originFile?: string) {
    console.error('DEPRECATED: AdaptDataService.validateFile - use ValidationService.validateFile instead');
    return this.http.get<APIResponse<any>>(
      originFile
        ? `${environment.API_URL}validate-file/${dataSourceID}?originFile=${originFile}`
        : `${environment.API_URL}validate-file/${dataSourceID}`,
      { observe: 'response' }
    );
  }

  public editDataSourcePromise(id: string, dataSource: DataSource) {
    return firstValueFrom(this.editDataSource(id, dataSource));
  }

  public editDataSource(id: string, dataSource: DataSource) {
    return this.http
      .put<APIResponse<DataSource>>(`${environment.API_URL}data/${id}`, dataSource)
      .pipe(map((result) => result.data));
  }

  public createDataSourcePromise(dataSource: AddDataInput) {
    return firstValueFrom(this.createDataSource(dataSource));
  }

  public createDataSource(dataSource: AddDataInput) {
    this.logger.debug('Inside createDataSource, dataSource: ', dataSource);

    return this.http
      .post<APIResponse<DataSource>>(`${environment.API_URL}data`, dataSource)
      .pipe(map((result) => result.data));
  }

  public registerPushNotifications(id: string, subscription: any) {
    return this.http.post<APIResponse<any>>(`${environment.API_URL}notifications`, { id, subscription });
  }

  public translateReportText(report: string, body: {title: string, description: string}, lang?: string) {
    this.logger.debug('Inside translateReportText, report: ', report);
    let params = new HttpParams();

    if(lang){
      params = params.append('lang', lang)
    }

    return this.http.post<APIResponse<Record<LanguageCode, any>>>(`${environment.API_URL}report/${report}/translate`, body, {params})
    .pipe(map((result) => result.data))
    ;
  }

  public createDataSet(body: NewDataSetInput) {
    this.logger.debug('Inside createDataSet, body: ', body);
    return this.http.post<APIResponse<DataSet>>(`${environment.API_URL}dataset`, body);
  }

  public queryDataSource(dataSourceID: string, body?: QueryDataSourceInput) {

    this.logger.debug('Inside queryDataSource dataSourceID: ', dataSourceID, ' body: ' + body);
    return this.http
      .post<APIResponse<QueryDataSourceOutput>>(`${environment.API_URL}data/${dataSourceID}/query`, body ?? {})
      .pipe(map((result) => result.data));
  }

  public testDBConnection(body: TestDBConnectionInput) {
    return this.http.post<APIResponse<boolean>>(`${environment.API_URL}test`, body).pipe(map((result) => result.data));
  }

  public getDataSource(dataSourceID: string, connectionInfo = false) {
    const params: Record<string, string> = {};

    if (connectionInfo) {
      params['retrieveConnectionInfo'] = 'true';
    }

    return this.http
      .get<APIResponse<DataSource | DataSourceConnectionInfo>>(`${environment.API_URL}data/${dataSourceID}`, { params })
      .pipe(map((result) => result.data));
  }

  public getUploadURL(dataSourceID: string, filename: string) {
    return this.http
      .post<APIResponse<DataSource[]>>(`${environment.API_URL}data/${dataSourceID}/upload/${filename}`, {})
      .pipe(map((result) => result.data));
  }

  public getDataSources() {
    return this.$dataSources;
  }

  public getDataSets() {
    return this.http.get<APIResponse<DataSet[]>>(`${environment.API_URL}dataset`).pipe(map((result) => result.data));
  }

  // public getDataViews() {
  //   return this.adaptDataViewService.getDataViews();  // this.$dataViews;
  // }

  public getDataSet(dataSetID: string) {
    return this.http
      .get<APIResponse<DataSet>>(`${environment.API_URL}dataset/${dataSetID}`)
      .pipe(map((result) => result.data));
  }

  public getDataFromDataViewPromise(
    dataViewID: string,
    fileSpec: string,
    operations: DataViewOperation[],
    suppression?: ISuppression,
    suppress = false
  ) {
    return firstValueFrom(this.getDataFromDataView(dataViewID, fileSpec, operations, suppression, suppress));
  }

  public getDataFromDataView(
    dataViewID: string,
    fileSpec: string,
    operations: DataViewOperation[],
    suppression?: ISuppression,
    suppress = false
  ): Observable<GetDataFromDataViewOutput> {
    const removeDupeConditions = (operations: DataSetOperation[]) => {
      for (const operation of operations) {
        const seen = new Set();
        const result = [];

        for (let i = operation.arguments.length - 1; i >= 0; i--) {
          const item = operation.arguments[i];
          const uniqueKey = item.field;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            result.push(item);
          }
        }

        operation.arguments = result.reverse();
      }

      return operations;
    };

    return from(this._tryCacheData(removeDupeConditions(operations), dataViewID, fileSpec, suppression, suppress));
  }

  private async _tryCacheData(
    operations: DataSetOperation[],
    dataViewID: string,
    fileSpec: string,
    suppression?: ISuppression,
    suppress = false
  ) {
    if (!this._cache) {
      this._cache = await caches.open('adapt-report-data');
    }

    const [cachedData, missingCache] = await this._populateData(operations, dataViewID, fileSpec, suppress);

    if (!missingCache.length) {
      return { dataViewID, operationResults: cachedData };
    }

    let params = new HttpParams();

    params = params.append('previewSuppression', suppress);

    const resolveMissing = await firstValueFrom(
      this.http
        .post<APIResponse<GetDataFromDataSetOutput>>(
          `${environment.API_URL}dataview/${dataViewID}/data`,
          { operations: missingCache, fileSpec, suppression },
          { params }
        )
        .pipe(map((result) => result.data))
    );

    for (const missing of resolveMissing.operationResults) {
      await this._cache.put(
        encodeURIComponent(`${missing.id}-${dataViewID}-${fileSpec}-suppress-${suppress}`),
        new Response(JSON.stringify({ expiry: Date.now() + 3600 * 1000 * 24, data: missing }))
      );
    }

    return { dataViewID, operationResults: [...resolveMissing.operationResults, ...cachedData] };
  }

  private async _populateData(operations: DataSetOperation[], dataSetID: string, fileSpec: string, suppress = false) {
    const cachedData = [];

    const missingCache = [];

    if (!this._cache) {
      this._cache = await caches.open('adapt_report_data');
    }

    for (const operation of operations) {
      const id = `${operation.id}-${dataSetID}-${fileSpec}-suppress-${suppress}`;

      const match = await this._cache.match(encodeURIComponent(id));

      if (!match) {
        missingCache.push(operation);
        continue;
      }

      const { expiry, data } = await match.json();

      if (expiry > Date.now()) {
        cachedData.push(data);
        continue;
      }

      missingCache.push(operation);
    }

    return [cachedData, missingCache];
  }

  public get dataSources() {
    return this.$dataSources;
  }

  public previewData(dataViewID: string) {
    return this.http
      .get<APIResponse<any[]>>(`${environment.API_URL}dataview/${dataViewID}/preview`)
      .pipe(map((res) => res.data));
  }

  public getValidationJSON(name: string, isURL = false) {
    console.error('DEPRECATED: AdaptDataService.getValidationJSON - use ValidationService.getValidationTemplate instead');
    return this.http.get<ValidationTemplate>(isURL ? name : `assets/validation/${name}.json`);
  }

  public getDataCollectionTemplate(id: string) {
    return this.http.get<IDataCollectionTemplate>(`assets/templates/collections/${id}.json`);
  }
  public getDataCollectionTemplatePromise(id: string) {
    return firstValueFrom(this.getDataCollectionTemplate(id));
  }

  public updateSettings(settings: UpdateAdaptSettingsInput) {
    return this.http.post<APIResponse<AdaptSettings>>(`${environment.API_URL}settings`, settings).pipe(
      map((result) => result.data),
      tap((settings) => this.settings.next(settings))
    );
  }

  public getSettingsLogoUploadURL(filename: string) {
    return this.http
      .post<APIResponse<string>>(`${environment.API_URL}settings/logo`, { filename })
      .pipe(map((result) => result.data));
  }
  public getSettingsLogoUploadURLPromise(filename: string) {
    return firstValueFrom(this.getSettingsLogoUploadURL(filename));
  }

  public getTemplates<T>(type: TemplateType) {
    return this.http.get<APIResponse<T[]>>(`${environment.API_URL}template/${type}`).pipe(map((result) => result.data));
  }

  public getTemplate<T>(type: TemplateType, templateID: string) {
    return this.http
      .get<APIResponse<T>>(`${environment.API_URL}template/${type}/${encodeURIComponent(templateID)}`)
      .pipe(map((result) => result.data));
  }

  public async addDataSource(dataSource: DataSource) {
    const currValue = ((await firstValueFrom(this._dataSources)) || []).filter(
      (sources) => sources.dataSourceID !== dataSource.dataSourceID
    );
    currValue.push(dataSource);
    this._dataSources.next(currValue);
  }

  // public async addDataView(dataView: DataView) {
  //
  //   await this.adaptDataViewService.addDataView(dataView);
  //
  //   // const currValue = ((await firstValueFrom(this._dataViews)) || []).filter(
  //   //   (view) => view.dataViewID !== dataView.dataViewID
  //   // );
  //   // currValue.push(dataView);
  //   // this._dataViews.next(currValue);
  // }

  public getUsers() {
    return this.http.get<APIResponse<any>>(`${environment.API_URL}users`).pipe(map((result) => result.data));
  }

  public editUser(username: string, role: keyof AppRolePermissions, active = true) {
    return this.http
      .put<APIResponse<any>>(`${environment.API_URL}users`, { username, active, role })
      .pipe(map((result) => result.data));
  }

  public shareReport(reportID: string, filters: Record<string, any>) {
    return this.http
      .post<APIResponse<string>>(`${environment.API_URL}share`, { reportID, filters })
      .pipe(map((result) => result.data));
  }

  public loadSharedReport(slug: string) {
    return this.http
      .get<APIResponse<ShareReport>>(`${environment.API_URL}share/${slug}`)
      .pipe(map((result) => result.data));
  }

  public uploadToPresignedURL(file: File, url: string) {
    const req = new HttpRequest('PUT', url, file, {
      reportProgress: true,
    });

    return this.http.request(req);
  }
}
