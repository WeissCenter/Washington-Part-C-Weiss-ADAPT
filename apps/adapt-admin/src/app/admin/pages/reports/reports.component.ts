import { DataViewModel, IReportModel, ReportFilterCriteriaModel, ReportVersion } from '@adapt/types';
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, effect, OnDestroy, OnInit, Signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable, Subscription, map, switchMap, of, BehaviorSubject } from 'rxjs';
import { RoleService } from '../../../auth/services/role/role.service';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { ReportModalComponent } from '../../components/report-modal/report-modal.component';
import { AlertService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/alert.service';
import { LocationStrategy } from '@angular/common';
import { ModalComponent } from '@adapt/adapt-shared-component-lib';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';
import { NGXLogger } from 'ngx-logger';
import { PageContentText } from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';

@Component({
  selector: 'adapt-reports',
  standalone: false,
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit, AfterViewChecked, OnDestroy, AfterViewInit {
  ReportStatus = ReportVersion;

  Math = Math;
  public selectedReport?: IReportModel;

  @ViewChild(ReportModalComponent) reportModal?: ReportModalComponent;
  @ViewChild('unPublishModal') unPublishModal?: ModalComponent;
  @ViewChild('publishConfirmationModal') publishConfirmationModal?: ModalComponent;
  public reportStatuses = [
    { label: 'Draft', value: 'draft' },
    { label: 'Finalized', value: 'finalized' },
  ];

  public reportAudience = [
    { label: 'Internal', value: 'internal' },
    { label: 'External', value: 'external' },
  ];

  private routeChangeListener: Subscription;

  public reportFiltersForm: FormGroup;

  public page = 1;
  public pageSize = 5;
  public maxPages = 1;
  public totalItems = 0;

  public $reportsBehaviorSubject = new BehaviorSubject<IReportModel[]>([]);

  listOfAllReports: IReportModel[] = [];
  listOfFilteredReports: IReportModel[] = [];
  reportFilterCriteria: ReportFilterCriteriaModel;
  reportsLoadedComplete = false;
  filterChanged = false;

  public updatedSortDirection: 'asc' | 'desc' = 'desc';
  public alphaSortDirection: 'asc' | 'desc' = 'desc';
  focusSortBtn = sessionStorage.getItem('focusSortBtn') === 'true' ? true : false;
  public activeSort = 'updated';

  public statuses = [
    {
      label: 'Draft',
      value: 'draft',
    },
    {
      label: 'Finalized',
      value: 'finalized',
    },
  ];

  // public visibilities = [
  //   {
  //     label: 'Internal',
  //     value: 'internal',
  //   },
  //   {
  //     label: 'External',
  //     value: 'external',
  //   },
  // ];

  // Filter panel toggle service logic
  private subscription: Subscription;
  public showFilterPanel = false;
  filterStatusMessage = '';
  filterStateMessage = '';
  originalFilters!: ReportFilterCriteriaModel;
  //#################################

  public unPublishJustificationForm: FormGroup;
  // Input signal
  $pageContentSignal: Signal<PageContentText | null>;
  pageContent: PageContentText | null;
  pageContentLoaded = false;

  constructor(
    private logger: NGXLogger,
    public router: Router,
    public route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private fb: FormBuilder,
    public role: RoleService,
    private location: LocationStrategy,
    public alert: AlertService,
    private filterPanelService: FilterPanelService,
    private adaptReportService: AdaptReportService,
    public pagesContentService: PagesContentService
  ) {
    this.logger.debug('Inside ReportsComponent constructor');

    this.initializeFilterPanel();
    this.initializeRouteChangeListener();
    this.initializeComponentSignals();
  }

  ngOnInit(): void {
    this.logger.debug('ReportsComponent ngOnInit');

    //this.initializeReportFilterListener();
    this.subscribeToReportsListener();
  }

  private initializeRouteChangeListener() {
    this.logger.debug('Inside initializeRouteChangeListener');

    // this is called when the tabs are changed
    this.routeChangeListener = this.route.queryParams.subscribe((params) => {
      this.logger.debug('Inside ReportsComponent tab change, params: ', params);

      // Update component state based on params if needed
      // TODO: conditional views for filtered state and active search, etc.

      const navigation = this.router.currentNavigation();

      this.logger.debug('navigation: ', navigation);

      if (navigation?.extras.state?.['dataView']) {
        setTimeout(() => this.openModal(navigation?.extras.state?.['dataView']));
      }

      this.readRouteQueryParams(params);

      // notify filter listener to filter and sort new results. See filterAndSortReports()
      this.$reportsBehaviorSubject.next(this.listOfAllReports);

      // We need to check to see if we need to pull the latest data views from the server
      if (this.adaptReportService.isPolling()) {
        this.logger.debug('Polling is ongoing');
      } else {
        this.adaptReportService.startPollingReportStatuses(); // force a refresh of the data views
      }
    });
  }

  private initializeComponentSignals() {
    this.logger.debug('Inside ReportComponent initializeComponentSignals');

    this.$pageContentSignal = this.pagesContentService.getPageContentSignal('reports');

    // after we got a signal that the pageContent was loaded
    effect(() => {
      this.logger.debug('$pageContentSignal retrieved');
      this.pageContent = this.$pageContentSignal();

      this.logger.debug('pageContent: ', this.pageContent);

      if (this.pageContent) {
        this.logger.debug('Have page content');

        if (!this.pageContent.title) {
          this.logger.error('Invalid page title');
        }

        this.pageContentLoaded = true;
      } else {
        this.logger.debug('NO page content');
        this.pageContentLoaded = false;
      }
    });
  }

  private initializeFilterPanel() {
    this.logger.debug('Inside ReportsComponent initializeFilterPanel');

    this.subscription = this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.showFilterPanel = state;
    });

    this.unPublishJustificationForm = this.fb.group({
      justification: this.fb.control('', [Validators.required]),
    });

    this.reportFiltersForm = this.fb.group({
      search: this.fb.control(''),
      version: this.fb.control([]),
      visibility: this.fb.control(''),
    });
  }

  private readRouteQueryParams(params: Params): void {
    this.logger.debug('Inside ReportsComponent readRouteQueryParams, params: ', params);

    this.filterChanged = true;

    // Extract parameters
    const search = params['search'] || '';
    this.page = parseInt(params['page'] || '1');
    let version = params['status'];
    let visibility = params['visibility'];
    this.updatedSortDirection = params['updatedSort'] || 'desc';
    this.alphaSortDirection = params['alphaSort'] || 'desc';
    // if single status or visibility, convert to array

    this.logger.debug('version: ', version, ', visibility: ', visibility);

    if (version) {
      if (!Array.isArray(version)) {
        version = [version];
      }
    }
    if (visibility) {
      if (!Array.isArray(visibility)) {
        visibility = [visibility];
      }
    }

    this.reportFiltersForm.setValue({
      search: search || '',
      version: version || [],
      visibility: visibility || [],
    });

    this.reportFilterCriteria = {
      visibility: visibility,
      search: search,
      version: version,
    };

    this.logger.debug('reportFilterCriteria: ', this.reportFilterCriteria);
  }

  ngAfterViewInit(): void {
    this.logger.debug('Inside ReportsComponent ngAfterViewInit');

    const state = this.location.getState() as any;
    if ('report' in state) {
      this.reportModal?.open(undefined, state.report, state.report.page);
    }
  }

  public onPageSizeChange() {
    this.maxPages = Math.ceil(this.totalItems / this.pageSize);
  }

  private subscribeToReportsListener() {
    this.logger.debug('Inside subscribeToReportsListener');

    this.setReportsLoadingStatus(false);

    this.adaptReportService.getReportsListener().subscribe((reports) => {
      this.logger.debug('Getting notification of updated reports from service', reports?.length);

      this.listOfAllReports = reports;

      // notify filter listener to filter and sort new results. See filterAndSortReports()
      this.$reportsBehaviorSubject.next(reports);
    });

    // this will lister for any changes from the BehaviorSubject $reportsBehaviorSubject
    // we do this because we need to trigger a new fiter and update when the route query parameters change in
    // the method initializeRouteChangeListener() as well as in the getReportsListener() above
    this.$reportsBehaviorSubject.asObservable().subscribe({
      next: (latestReports) => {
        this.logger.debug('latestReports: ', latestReports?.length);
        this.filterAndSortReports();
      },
      error: () => {
        this.alert.add({ type: 'error', title: 'Reports listener Failed', body: 'Reports listener failed.' });
      },
    });

    // this.$reportsBehaviorSubject.asObservable().pipe(map((reports) => {
    //
    //     this.logger.debug('Start filtering and sorting');
    //
    //     return this.filterAndSortReports();
    //
    //   })
    // );
  }

  private filterAndSortReports() {
    this.logger.debug('Inside filterAndSortReports, reportFilterCriteria: ', this.reportFilterCriteria);

    if (this.listOfAllReports?.length > 0) {
      let visibility: any;
      let search: any;
      let version: any;

      if (this.reportFilterCriteria) {
        visibility = this.reportFilterCriteria.visibility;
        search = this.reportFilterCriteria.search;
        version = this.reportFilterCriteria.version;
      } else {
        this.logger.debug('No filter criteria found');
      }

      // Filter reports based on the status and visibility
      const filtered = this.listOfAllReports.filter((item: IReportModel) => {
        const versionMatch = this.handleFilterParam(version, item.version);
        const visibilityMatch = this.handleFilterParam(visibility, item.visibility);
        const searchMatch = !search?.length || item.name.toLowerCase().includes(search) || item.version.toLowerCase().includes(search) || item.author.toLowerCase().includes(search);

        return versionMatch && searchMatch && visibilityMatch;
      }) as IReportModel[];

      // filtered.sort((a, b) =>
      //   this.sortDirection === 'asc'
      //     ? a.name.localeCompare(b.name)
      //     : b.name.localeCompare(a.name)
      // );

      filtered.sort((a, b) => {
        const updatedA = parseInt(a.updated, 10); // Convert the string to an integer
        const updatedB = parseInt(b.updated, 10);
        const alphaA = a.name;
        const alphaB = b.name;

        const sort = (a: any, b: any, type: string, direction: 'asc' | 'desc') => {
          const left = direction === 'asc' ? a : b;
          const right = direction === 'asc' ? b : a;

          switch (type) {
            case 'string': {
              return left.localeCompare(right);
            }
            case 'number': {
              return left - right;
            }
          }
        };

        const sortResult = this.activeSort === 'updated' ? sort(updatedA, updatedB, 'number', this.updatedSortDirection) : sort(alphaA, alphaB, 'string', this.alphaSortDirection);

        return sortResult;
      });

      if (this.focusSortBtn) {
        const sortBtn = document.getElementById('sortButton');
        if (sortBtn) {
          sortBtn.focus();
          sessionStorage.removeItem('focusSortBtn');
        }
      }

      // Store the processed data for later use
      this.listOfFilteredReports = filtered;
      // Update maxPages for pagination
      this.maxPages = Math.max(1, Math.ceil(this.listOfFilteredReports.length / this.pageSize));
      this.totalItems = this.listOfFilteredReports.length;
      this.setReportsLoadingStatus(true);
      return filtered;
    } else {
      this.logger.debug('nothing to filter');
      return [];
    }
  }

  private setReportsLoadingStatus(reportsLoadedStatus: boolean) {
    this.logger.debug('Inside setReportsLoadingStatus: ', reportsLoadedStatus);
    //setTimeout(() => {
    this.reportsLoadedComplete = reportsLoadedStatus;
    // }, 1); // Adjust this delay as needed
  }

  toggleFilterPanel(close = false) {
    this.logger.debug('Toggle filter panel');

    this.showFilterPanel = !this.showFilterPanel;
    if (close) {
      this.showFilterPanel = false;
    }

    if (this.showFilterPanel) {
      this.originalFilters = this.reportFiltersForm.getRawValue();
      this.filterStateMessage = 'Filter panel opened.';
    } else this.filterStateMessage = 'Filter panel closed.';

    this.filterPanelService.changeFilterPanelState(this.showFilterPanel);
  }

  public applyFilters(announce = false) {
    this.logger.debug('Applying filters');

    sessionStorage.setItem('focusSortBtn', true.toString());

    this.toggleFilterPanel(true);

    this.router.navigate(['./'], {
      queryParams: {
        updatedSort: this.updatedSortDirection,
        alphaSort: this.alphaSortDirection,
        ...this.reportFiltersForm.getRawValue(),
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });

    if (announce) {
      this.filterStatusMessage = 'Filters have been applied.';
    }
  }

  // private _getStatusAndApprovalCounts(
  //   items: IReport[]
  // ): [number, number, number, number] {
  //   const counts = new Array(4).map((item) => 0) as [
  //     number,
  //     number,
  //     number,
  //     number
  //   ];

  //   for (const item of items) {

  //     switch (item.version) {
  //       case 'draft': {
  //         counts[ReportVersion.DRAFT]++;
  //         break;
  //       }
  //       case 'published': {
  //         counts[ReportVersion.FINALIZED]++;
  //         break;
  //       }
  //       case 'unpublished': {
  //         counts[ReportVersion.ARCHIVED]++;
  //         break;
  //       }
  //     }

  //     if (item.approval === 'pending') {
  //       counts[counts.length - 1]++;
  //     }
  //   }

  //   return counts;
  // }

  public doSort(what: 'alpha' | 'updated') {
    if (what === 'alpha') {
      this.alphaSortDirection = this.alphaSortDirection === 'asc' ? 'desc' : 'asc';
    } else if (what === 'updated') {
      this.updatedSortDirection = this.updatedSortDirection === 'asc' ? 'desc' : 'asc';
    }

    this.filterStatusMessage = 'Sort has been applied.';
    this.focusSortBtn = true;
    this.activeSort = what;
    this.applyFilters();
  }

  ngAfterViewChecked(): void {
    this.cd.detectChanges();
  }

  public openModal(dataView?: DataViewModel) {
    if (!this.reportModal) return;
    this.reportModal.open(dataView);
  }

  private handleFilterParam(param: string | string[], value: string) {
    if (!param?.length) return true;

    if (Array.isArray(param)) {
      return param.includes(value);
    }

    return param === value;
  }

  // public get version() {
  //   return this.reportFilters.get('version') as FormControl;
  // }

  ngOnDestroy() {
    // Close filter panel if open and the user navigates away
    this.filterPanelService.changeFilterPanelState(false);
    this.subscription.unsubscribe();
    this.routeChangeListener.unsubscribe();
  }

  public startUnPublish(report: IReportModel) {
    this.logger.debug('Inside ReportsComponent startUnPublish');

    this.unPublishModal?.open();
    this.selectedReport = report;
  }

  public publishReport() {
    this.logger.debug('Inside ReportsComponent publishReport');

    this.publishConfirmationModal?.close();
    this.adaptReportService.startReportPublish(this.selectedReport!).subscribe({
      next: () => {
        this.alert.add({
          type: 'success',
          title: 'Report Publish Success',
          body: 'Report publish process has started. You will receive a notification when the published report is ready.',
        });
      },
      error: () => {
        this.alert.add({
          type: 'error',
          title: 'Report Publish Failed',
          body: 'Report publish process failed to start, please try again later.',
        });
      },
    });
  }

  public confirmUnPublish() {
    this.logger.debug('Inside ReportsComponent confirmUnPublish');

    if (!this.selectedReport) return;

    this.unPublishModal?.close();
    this.adaptReportService.unPublishReport(this.selectedReport, this.unPublishJustificationForm.get('justification')?.value).subscribe({
      next: () => {
        this.alert.add({
          type: 'success',
          title: 'Report Un-Publish Success',
          body: 'Report has been un-published.',
        });
        this.router.navigate(['..', this.selectedReport!.reportID], {
          relativeTo: this.route,
          queryParams: { version: 'draft' },
        });
      },
      error: () => {
        this.alert.add({
          type: 'error',
          title: 'Report Un-Publish Failed',
          body: 'Failed to Un-Publish report, please try again later.',
        });
      },
    });
  }
}
