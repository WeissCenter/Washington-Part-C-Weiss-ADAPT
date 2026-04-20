import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationStrategy } from '@angular/common';
import { DATA_VIEW_STATUS, DataViewModel } from '@adapt/types';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { RoleService } from '../../../auth/services/role/role.service';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';
import { DataComponent } from './data.component';

describe('DataComponent', () => {
  let component: DataComponent;
  let fixture: ComponentFixture<DataComponent>;
  let dataViews$: BehaviorSubject<DataViewModel[]>;

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

  beforeEach(async () => {
    dataViews$ = new BehaviorSubject<DataViewModel[]>([]);

    await TestBed.configureTestingModule({
      declarations: [DataComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn(),
          },
        },
        {
          provide: LocationStrategy,
          useValue: {
            getState: jest.fn(() => ({})),
          },
        },
        {
          provide: NGXLogger,
          useValue: {
            debug: jest.fn(),
          },
        },
        {
          provide: RoleService,
          useValue: {},
        },
        {
          provide: AdaptDataViewService,
          useValue: {
            getDataViews: jest.fn(() => dataViews$.asObservable()),
            isPolling: jest.fn(() => false),
            startPollingDataViewStatuses: jest.fn(),
            addDataView: jest.fn(),
          },
        },
        {
          provide: AdaptReportService,
          useValue: {
            getReportsListener: jest.fn(() => of([])),
          },
        },
        {
          provide: FilterPanelService,
          useValue: {
            currentFilterPanelState: of(false),
            changeFilterPanelState: jest.fn(),
          },
        },
        {
          provide: PagesContentService,
          useValue: {
            getPageContentSignal: jest.fn(() => () => null),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(DataComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(DataComponent);
    component = fixture.componentInstance;
  });

  it('preserves the service ordering instead of re-sorting by updated date', () => {
    const newestByCreated = createDataView({
      dataViewID: 'newest-by-created',
      created: 300,
      updated: 100,
    });
    const olderButNewerUpdated = createDataView({
      dataViewID: 'older-but-newer-updated',
      created: 200,
      updated: 500,
    });

    dataViews$.next([newestByCreated, olderButNewerUpdated]);
    fixture.detectChanges();

    expect(component.currentDataList.value.map((view) => view.dataViewID)).toEqual([
      'newest-by-created',
      'older-but-newer-updated',
    ]);
  });
});
