import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit, Signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, ReplaySubject, Subscription } from 'rxjs';
import { RoleService } from '../../../auth/services/role/role.service';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { AlertService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/alert.service';
import { RightSidePanelComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/right-side-panel/right-side-panel.component';
import { DataViewModalComponent } from '../../components/data-view-modal/data-view-modal.component';
import { DataViewModel, IReportModel } from '@adapt/types';
import { LocationStrategy } from '@angular/common';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { NGXLogger } from 'ngx-logger';
import { PageContentText } from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';

interface DataViewFilter {
  dataSource: string[];
  status: any;
}

@Component({
  selector: 'adapt-data',
  standalone: false,
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
})
export class DataComponent implements OnDestroy, OnInit, AfterViewInit {
  Math = Math;

  @ViewChild(DataViewModalComponent) dataViewModal?: DataViewModalComponent;
  public dataViewModalSubject = new BehaviorSubject<DataViewModalComponent | null>(null);
  //public $dataViewModalSubject = this.dataViewModalSubject.asObservable();

  @ViewChild('recordsDisplay') recordsDisplay!: ElementRef;

  @ViewChild('filterPanel') filterPanel!: RightSidePanelComponent;

  public statusFilterItems = [
    { value: 'REQUESTED', label: 'Requested' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'MISSING DATA', label: 'Missing Data' },
    { value: 'AVAILABLE', label: 'Available' },
  ];

  //data views
  @ViewChild('visibleViewsContent', { static: true })
  visibleViewsRef?: TemplateRef<unknown>;
  @ViewChild('collapsedViewsContent', { static: true })
  collapsedViewsRef?: TemplateRef<unknown>;
  @ViewChild('actionViewsContent', { static: true })
  actionViewsRef?: TemplateRef<unknown>;
  @ViewChild('loadingViewsContent', { static: true })
  loadingViewsRef?: TemplateRef<unknown>;

  public page = 1;
  public query = '';
  public maxPages = 1;
  public pageSize = 5;

  public viewFilterGroup: FormGroup;
  public sourceFilterGroup: FormGroup;

  public currentList = 'views';

  loadingViews = true;
  loadingSources = true;

  public $dataViews: Observable<DataViewModel[]>;
  public $reports: Observable<IReportModel[]>;

  public totalCurrentDataList = new BehaviorSubject<DataViewModel[]>([]);

  public currentDataList = new BehaviorSubject<DataViewModel[]>([]);
  public $currentDataList = this.currentDataList.asObservable();

  // #### Filter panel toggle service logic ##########
  private subscriptions: Subscription[] = [];
  public showFilterPanel = false;
  filterStateMessage = '';
  originalFilters!: DataViewFilter;
  //#########################################

  $pageContent: Signal<PageContentText | null> = this.pagesContentService.getPageContentSignal('data');

  public search(query?: string) {
    this.router.navigate(['./'], {
      queryParams: { search: query },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: LocationStrategy,
    private logger: NGXLogger,
    public role: RoleService,
    private adaptDataViewService: AdaptDataViewService,
    private adaptReportService: AdaptReportService,
    private cd: ChangeDetectorRef,
    private fb: FormBuilder,
    private filterPanelService: FilterPanelService,
    public pagesContentService: PagesContentService
  ) {
    this.logger.debug('Inside DataComponent constructor');

    this.$dataViews = this.adaptDataViewService.getDataViews(); //  this.adaptDataService.$dataViews;
    this.$reports = this.adaptReportService.getReportsListener();

    this.viewFilterGroup = this.fb.group({
      status: this.fb.control(''),
    });

    this.sourceFilterGroup = this.fb.group({
      type: this.fb.control(''),
    });

    const filterPanelSub = this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.showFilterPanel = state;

      if (this.filterPanel) {
        this.filterPanel.show = this.showFilterPanel;
      }
    });

    this.subscriptions.push(filterPanelSub);
  }

  ngOnInit(): void {
    this.logger.debug('Inside DataComponent ngOnInit');

    // We need to check to see if we need to pull the latest data views from the server
    if (this.adaptDataViewService.isPolling()){
      this.logger.debug('Polling is ongoing');
    }
    else {
      this.adaptDataViewService.startPollingDataViewStatuses(); // force a refresh of the data views
    }

    this.adaptDataViewService.getDataViews().subscribe((val) => {
      this.loadingViews = false;
    });

    this.outletViewsSub = this.$dataViews.subscribe((views) => {
      this.originalFilters = this.viewFilterGroup.getRawValue();

      this.currentDataList.next([...views]);
      this.totalCurrentDataList.next([...views]);
    });

    // this.outletCreateClickSub = event.createButtonClick.subscribe(evt => this.dataViewModal?.open())
  }

  toggleFilterPanel(close = false) {
    this.showFilterPanel = !this.showFilterPanel;
    if (close) this.showFilterPanel = false;
    if (this.showFilterPanel) {
      this.originalFilters = this.viewFilterGroup.getRawValue();
      this.filterStateMessage = 'Filter panel opened.';
    } else this.filterStateMessage = 'Filter panel closed.';
    this.filterPanelService.changeFilterPanelState(this.showFilterPanel);
  }

  public doFiltering() {
    let currValue = this.totalCurrentDataList.value;
    this.toggleFilterPanel(true);

    const views = currValue as DataViewModel[];

    const { status } = this.viewFilterGroup.getRawValue();

    if (status?.length <= 0 || status === null) return this.currentDataList.next(currValue);

    currValue = views.filter((val) => status.includes(val.status));

    this.currentDataList.next(currValue);
  }

  private outletSourcesSub?: Subscription;
  private outletViewsSub?: Subscription;
  private outletCreateClickSub?: Subscription;

  ngAfterViewInit() {
    if (this.dataViewModal) {
      this.dataViewModalSubject.next(this.dataViewModal);
      this.cd.detectChanges();
    }

    if (this.currentList === 'sources') {
      document.getElementById('dataSourcesButton')?.focus();
    } else {
      document.getElementById('dataViewsButton')?.focus();
    }

    this.handleResume();
  }

  public editDataView(dataView: DataViewModel, pageIndex = 0) {
    this.logger.debug('Inside editDataView');
    this.dataViewModal?.open(dataView, false, pageIndex);
  }

  public viewDataView(dataView: DataViewModel) {
    this.logger.debug('Inside viewDataView');
    this.dataViewModal?.open(dataView, true);
  }

  public onClose(view?: DataViewModel) {
    this.logger.debug('Inside onClose');
    if (!view) return;

    this.adaptDataViewService.addDataView(view);

    // this.currentDataList.value.push(view as any)
    // this.currentDataList.next(this.currentDataList.value)
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.outletSourcesSub?.unsubscribe();
    this.outletViewsSub?.unsubscribe();
    this.outletCreateClickSub?.unsubscribe();
    this.dataViewModalSubject?.unsubscribe();
  }

  private handleResume() {
    if (!this.dataViewModal) return;
    const state = this.location.getState() as any;
    switch (state.mode) {
      case 'CREATION': {
        this.dataViewModal!.open(state.dataView, false, state.dataView.page);
        break;
      }
      case 'EDIT': {
        this.dataViewModal!.open(state.dataView, false, state.dataView.page);
      }
    }


    if('dataSource' in state){

      this.dataViewModal.open(undefined, false, 0, state.dataSource);

    }

  }
}
