import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  OnInit,
  signal,
  Signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { RoleService } from '../../../auth/services/role/role.service';
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
import { ModalComponent } from '@adapt/adapt-shared-component-lib';

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
  @ViewChild('deleteDataViewConfirmationModal') deleteDataViewConfirmationModal?: ModalComponent;
  @ViewChild('deleteDataViewBlockedModal') deleteDataViewBlockedModal?: ModalComponent;

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

  loadingSources = true;

  public dataViews$$ = this.adaptDataViewService.dataViews$$;
  public reports$$ = this.adaptReportService.reports$$;
  public selectedDataView?: DataViewModel;

  // #### Filter panel toggle service logic ##########
  private subscriptions: Subscription[] = [];
  public showFilterPanel = false;
  filterStateMessage = '';
  originalFilters!: DataViewFilter;
  //#########################################
  
  private filterStatus = signal<string[]>([]);

  public filterDataViews = computed(() => {
    const status = this.filterStatus();
    return (dataView: DataViewModel): boolean => {
      if (!status?.length) return true;
      return status.includes(dataView.status);
    };
  });

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
    private alert: AlertService,
    private cd: ChangeDetectorRef,
    private fb: FormBuilder,
    private filterPanelService: FilterPanelService,
    public pagesContentService: PagesContentService
  ) {
    this.logger.debug('Inside DataComponent constructor');

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
    this.originalFilters = this.viewFilterGroup.getRawValue();

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
    const { status } = this.viewFilterGroup.getRawValue();
    this.filterStatus.set(status ?? []);
    this.toggleFilterPanel(true);
  }


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

    // this.currentDataList.value.push(view as any)
    // this.currentDataList.next(this.currentDataList.value)
  }

  public startDeleteDataView(dataView: DataViewModel) {
    this.logger.debug('Inside startDeleteDataView');

    this.selectedDataView = dataView;

    if (this.hasAssociatedReports(dataView)) {
      this.deleteDataViewBlockedModal?.open();
      return;
    }

    this.deleteDataViewConfirmationModal?.open();
  }

  public confirmDeleteDataView() {
    this.logger.debug('Inside confirmDeleteDataView');

    if (!this.selectedDataView) return;

    const dataViewName = this.selectedDataView.name;

    this.deleteDataViewConfirmationModal?.close();
    this.adaptDataViewService.deleteDataView(this.selectedDataView.dataViewID).subscribe({
      next: () => {
        this.alert.add({
          type: 'info',
          title: 'Data View Deleted',
          body: `${dataViewName} has been deleted.`,
        });
        this.selectedDataView = undefined;
      },
      error: () => {
        this.alert.add({
          type: 'error',
          title: 'Data View Delete Failed',
          body: 'Failed to delete data view, please try again later.',
        });
      },
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
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

  private hasAssociatedReports(dataView: DataViewModel) {
    return this.reports$$.value().some((report) => report.dataView === dataView.dataViewID);
  }
}
