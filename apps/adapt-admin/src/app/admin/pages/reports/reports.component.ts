import { DataViewModel, IReportModel, ReportVersion } from '@adapt/types';
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, computed, effect, OnDestroy, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoleService } from '../../../auth/services/role/role.service';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReportModalComponent } from '../../components/report-modal/report-modal.component';
import { AlertService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/alert.service';
import { LocationStrategy } from '@angular/common';
import { ModalComponent } from '@adapt/adapt-shared-component-lib';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'adapt-reports',
  standalone: false,
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements AfterViewChecked, OnDestroy, AfterViewInit {
  ReportStatus = ReportVersion;
  public reports$$ = this.adaptReportService.reports$$;
  public reportStatus$$ = signal(['draft']);
  public reportAudience$$ = signal<('internal' | 'external')[] | undefined>(undefined);
  public sortBy$$ = signal<'updated' | 'alpha'>('updated');
  public sortDirection$$ = signal<'asc' | 'desc'>('desc');
  public filteredReports$$ = computed(() => {
    const status = this.reportStatus$$();
    const audience = this.reportAudience$$();
    return this.reports$$
      .value()
      .filter((report) => {
        return (status ? status.includes(report.version) : true) && (audience && audience.length > 0 ? audience.includes(report.visibility) : true);
      })
      .sort((a, b) => {
        let sortA: string | number = '';
        let sortB: string | number = '';

        if (this.sortBy$$() === 'updated') {
          sortA = parseInt(a.updated, 10);
          sortB = parseInt(b.updated, 10);
        } else if (this.sortBy$$() === 'alpha') {
          sortA = a.name.toLowerCase();
          sortB = b.name.toLowerCase();
        } else {
          return 0;
        }
        if (typeof sortA === 'string' && typeof sortB === 'string') {
          return this.sortDirection$$() === 'asc' ? sortA.localeCompare(sortB) : sortB.localeCompare(sortA);
        } else if (typeof sortA === 'number' && typeof sortB === 'number') {
          return this.sortDirection$$() === 'asc' ? sortA - sortB : sortB - sortA;
        }
        return 0;
      });
  });
  pageSize$$ = signal(5);
  maxPages$$ = computed(() => Math.max(1, Math.ceil(this.filteredReports$$().length / this.pageSize$$())));
  totalItems$$ = computed(() => this.filteredReports$$().length);

  public selectedReport?: IReportModel;

  @ViewChild(ReportModalComponent) reportModal?: ReportModalComponent;
  @ViewChild('unPublishModal') unPublishModal?: ModalComponent;
  @ViewChild('publishConfirmationModal') publishConfirmationModal?: ModalComponent;
  @ViewChild('deleteReportConfirmationModal') deleteReportConfirmationModal?: ModalComponent;
  @ViewChild('deleteReportBlockedModal') deleteReportBlockedModal?: ModalComponent;
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

  public updatedSortDirection: 'asc' | 'desc' = 'desc';
  public alphaSortDirection: 'asc' | 'desc' = 'desc';
  focusSortBtn = sessionStorage.getItem('focusSortBtn') === 'true' ? true : false;
  public activeSort = 'updated';

  public statuses = [
    { label: 'Draft', value: 'draft' },
    { label: 'Finalized', value: 'finalized' },
  ];

  private subscription: Subscription;
  public showFilterPanel = false;
  filterStatusMessage = '';
  filterStateMessage = '';

  public unPublishJustificationForm: FormGroup;
  pageContent$$ = this.pagesContentService.getPageContentSignal('reports');

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
  }

  private initializeRouteChangeListener() {
    this.logger.debug('Inside initializeRouteChangeListener');

    this.routeChangeListener = this.route.queryParams.subscribe((params) => {
      this.logger.debug('Inside ReportsComponent tab change, params: ', params);

      const navigation = this.router.currentNavigation();
      this.logger.debug('navigation: ', navigation);

      if (navigation?.extras.state?.['dataView']) {
        setTimeout(() => this.openModal(navigation?.extras.state?.['dataView']));
      }

      this.readRouteQueryParams(params);
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

    const search = params['search'] || '';
    this.page = parseInt(params['page'] || '1');
    let version = params['status'];
    let visibility = params['visibility'];
    this.updatedSortDirection = params['updatedSort'] || 'desc';
    this.alphaSortDirection = params['alphaSort'] || 'desc';
    this.sortBy$$.set(params['sortBy'] || 'updated');
    this.sortDirection$$.set(this.sortBy$$() === 'updated' ? this.updatedSortDirection : this.alphaSortDirection);
    
    if (version && !Array.isArray(version)) {
      version = [version];
    }
    if (visibility && !Array.isArray(visibility)) {
      visibility = [visibility];
    }
    this.reportStatus$$.set(version);
    this.reportAudience$$.set(visibility);

    this.reportFiltersForm.setValue({
      search: search || '',
      version: version || [],
      visibility: visibility || [],
    });
  }

  ngAfterViewInit(): void {
    this.logger.debug('Inside ReportsComponent ngAfterViewInit');

    const state = this.location.getState() as any;
    if ('report' in state) {
      this.reportModal?.open(undefined, state.report, state.report.page);
    }
  }

  toggleFilterPanel(close = false) {
    this.logger.debug('Toggle filter panel');

    this.showFilterPanel = !this.showFilterPanel;
    if (close) {
      this.showFilterPanel = false;
    }

    if (this.showFilterPanel) {
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
        sortBy: this.sortBy$$(),
        ...this.reportFiltersForm.getRawValue(),
      },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });

    if (announce) {
      this.filterStatusMessage = 'Filters have been applied.';
    }
  }

  public doSort(what: 'alpha' | 'updated') {
    if (what === 'alpha') {
      this.alphaSortDirection = this.alphaSortDirection === 'asc' ? 'desc' : 'asc';
    } else if (what === 'updated') {
      this.updatedSortDirection = this.updatedSortDirection === 'asc' ? 'desc' : 'asc';
    }

    this.filterStatusMessage = 'Sort has been applied.';
    this.focusSortBtn = true;
    this.activeSort = what;
    this.sortDirection$$.set(what === 'updated' ? this.updatedSortDirection : this.alphaSortDirection);
    this.sortBy$$.set(what);
    this.applyFilters();
  }

  ngAfterViewChecked(): void {
    this.cd.detectChanges();
  }

  public openModal(dataView?: DataViewModel) {
    if (!this.reportModal) return;
    this.reportModal.open(dataView);
  }

  ngOnDestroy() {
    this.filterPanelService.changeFilterPanelState(false);
    this.subscription.unsubscribe();
    this.routeChangeListener.unsubscribe();
  }

  public startUnPublish(report: IReportModel) {
    this.logger.debug('Inside ReportsComponent startUnPublish');

    this.unPublishModal?.open();
    this.selectedReport = report;
  }

  public startDeleteReport(report: IReportModel) {
    this.logger.debug('Inside ReportsComponent startDeleteReport');

    this.selectedReport = report;

    if (this.canDeleteReport(report)) {
      this.deleteReportConfirmationModal?.open();
      return;
    }

    this.deleteReportBlockedModal?.open();
  }

  public confirmDeleteReport() {
    this.logger.debug('Inside ReportsComponent confirmDeleteReport');

    if (!this.selectedReport) return;

    const reportName = this.selectedReport.name;

    this.deleteReportConfirmationModal?.close();
    this.adaptReportService.deleteReport(this.selectedReport.reportID).subscribe({
      next: () => {
        this.alert.add({
          type: 'info',
          title: 'Report Deleted',
          body: `${reportName} has been deleted.`,
        });
        this.adaptReportService.refreshReports();
        this.selectedReport = undefined;
      },
      error: () => {
        this.alert.add({
          type: 'error',
          title: 'Report Delete Failed',
          body: 'Failed to delete report, please try again later.',
        });
      },
    });
  }

  private canDeleteReport(report: IReportModel) {
    return report.version === ReportVersion.DRAFT && (!report.status || report.status.toLowerCase() === 'unpublished');
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
