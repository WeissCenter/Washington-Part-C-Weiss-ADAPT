import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { DATA_VIEW_STATUS, DataViewModel } from '@adapt/types';
import { AdaptDataViewService } from './adapt-data-view.service';
import { UserService } from '../auth/services/user/user.service';

describe('AdaptDataViewService', () => {
  let service: AdaptDataViewService;
  let httpMock: HttpTestingController;
  let isLoggedIn$: BehaviorSubject<boolean>;

  const createDataView = (overrides: Partial<DataViewModel>): DataViewModel => ({
    dataViewID: overrides.dataViewID || 'data-view-id',
    author: overrides.author || 'author',
    name: overrides.name || 'Data View',
    created: overrides.created ?? 0,
    updated: overrides.updated,
    status: overrides.status || DATA_VIEW_STATUS.AVAILABLE,
    description: overrides.description || 'description',
    dataViewType: overrides.dataViewType || 'collection',
    data: overrides.data || ({ fields: [] } as any),
    lastPull: overrides.lastPull || '',
    pulledBy: overrides.pulledBy || '',
    valid: overrides.valid,
  });

  beforeEach(() => {
    isLoggedIn$ = new BehaviorSubject<boolean>(false);

    TestBed.configureTestingModule({
      providers: [
        AdaptDataViewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: NGXLogger,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            isLoggedIn$: isLoggedIn$.asObservable(),
          },
        },
      ],
    });

    service = TestBed.inject(AdaptDataViewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('emits API-loaded data views newest-first by created date', () => {
    jest.spyOn(service, 'startPollingDataViewStatuses').mockImplementation(() => undefined);

    const observedLists: DataViewModel[][] = [];
    service.getDataViews().subscribe((views) => observedLists.push(views));

    isLoggedIn$.next(true);

    const request = httpMock.expectOne((req) => req.method === 'GET' && req.url.endsWith('/dataview'));
    request.flush({
      success: true,
      data: [
        createDataView({ dataViewID: 'oldest', created: 100 }),
        createDataView({ dataViewID: 'newest', created: 300 }),
        createDataView({ dataViewID: 'middle', created: 200 }),
      ],
    });

    expect(observedLists.at(-1)?.map((view) => view.dataViewID)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('keeps addDataView results sorted by created date', async () => {
    jest.spyOn(service, 'startPollingDataViewStatuses').mockImplementation(() => undefined);

    const observedLists: DataViewModel[][] = [];
    service.getDataViews().subscribe((views) => observedLists.push(views));

    isLoggedIn$.next(true);

    const initialLoad = httpMock.expectOne((req) => req.method === 'GET' && req.url.endsWith('/dataview'));
    initialLoad.flush({
      success: true,
      data: [
        createDataView({ dataViewID: 'oldest', created: 100 }),
        createDataView({ dataViewID: 'middle', created: 200 }),
      ],
    });

    const addPromise = service.addDataView(createDataView({ dataViewID: 'newest', created: 300 }));

    expect(observedLists.at(-1)?.map((view) => view.dataViewID)).toEqual(['newest', 'middle', 'oldest']);

    const refreshLoad = httpMock.expectOne((req) => req.method === 'GET' && req.url.endsWith('/dataview'));
    refreshLoad.flush({
      success: true,
      data: [
        createDataView({ dataViewID: 'middle', created: 200 }),
        createDataView({ dataViewID: 'newest', created: 300 }),
        createDataView({ dataViewID: 'oldest', created: 100 }),
      ],
    });

    await addPromise;

    expect(observedLists.at(-1)?.map((view) => view.dataViewID)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('re-emits polling status updates without changing creation-date ordering', () => {
    const newest = createDataView({
      dataViewID: 'newest',
      created: 300,
      updated: 10,
      status: DATA_VIEW_STATUS.REQUESTED,
    });
    const oldest = createDataView({
      dataViewID: 'oldest',
      created: 100,
      updated: 20,
      status: DATA_VIEW_STATUS.AVAILABLE,
    });

    (service as any)._dataViews.next([newest, oldest]);

    const observedLists: DataViewModel[][] = [];
    service.getDataViews().subscribe((views) => observedLists.push(views));

    (service as any).processDataViewUpdateResponse(
      newest,
      {
        success: true,
        data: createDataView({
          dataViewID: 'newest',
          created: 300,
          updated: 999,
          status: DATA_VIEW_STATUS.AVAILABLE,
        }),
      },
      [newest, oldest]
    );

    expect(observedLists.at(-1)?.map((view) => view.dataViewID)).toEqual(['newest', 'oldest']);
    expect(observedLists.at(-1)?.[0].status).toBe(DATA_VIEW_STATUS.AVAILABLE);
  });
});
