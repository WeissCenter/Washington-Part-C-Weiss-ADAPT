import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  input,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Resource,
  signal,
  TemplateRef,
} from '@angular/core';
import { Observable, Subject, Subscription, tap } from 'rxjs';
import { RoleService } from '../../../auth/services/role/role.service';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { ActivatedRoute } from '@angular/router';
import { DataViewModalComponent } from '../data-view-modal/data-view-modal.component';
import { DataSourceModalComponent } from '../data-source-modal/data-source-modal.component';
import { ConfirmModalComponent } from 'libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import {
  AdaptListViewContentText,
  PageContentText,
} from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'adapt-list-view',
  standalone: false,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListViewComponent implements OnDestroy, OnInit {
  @Output() createButtonClick = new EventEmitter();
  @Output() deleteView = new EventEmitter();

  @Input() $reports!: any;
  @Input() $dataViews!: any;
  @Input() public dataList?: Observable<any[]>;
  @Input() public dataResource?: Resource<any[]>;
  filterFunc = input<(item: any) => boolean>(() => true);
  @Input() public loadingText = 'Loading...';

  // content refs

  @Input() public visibleRef?: TemplateRef<unknown>;
  @Input() public collapsedRef?: TemplateRef<unknown>;
  @Input() public actionRef?: TemplateRef<unknown>;
  @Input() public loadingRef?: TemplateRef<unknown>;
  @Input() public currentList: 'sources' | 'views' | 'users' = 'sources';
  @Input() public recentSortField = 'created';

  @Input() public sortIcon = 'fa-sort-amount';
  @Input() public altIcon = true;

  @Input() dataViewModal!: any;
  @Input() dataSourceModal!: DataSourceModalComponent;

  @Input() confirmModal?: ConfirmModalComponent;
  @Input() confirm?: Subject<boolean>;

  public page = 1;
  public query = '';
  public maxPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  public pageSize = signal(5);
  @Input() sortDirection: 'asc' | 'desc' = 'desc';
  public showFilterPanel = false;
  public totalItems = computed(() => this.dataResource ? this.filteredDataResourceLength() : this.dataListLength());
  private subscriptions: Subscription[];
  
  public dataListTap?: Observable<any[]>;
  private dataListLength = signal(0);
  
  listViewContent = this.pagesContentService.$listViewContent();
  filteredDataResource = computed(() => {
    // Implement your filtering logic here
    if (!this.dataResource || !this.dataResource.value()) return [];
    return this.dataResource.value()
    .filter((item) => {
      return this.filterFunc()(item);
    });
  });
  private filteredDataResourceLength = computed(() => {
    if (!this.filteredDataResource || !this.filteredDataResource()) return 0;
    return this.filteredDataResource().length;
  });

  toggleFilterPanel() {
    this.logger.debug('Inside toggleFilterPanel');
    this.showFilterPanel = !this.showFilterPanel;
    this.filterPanelService.changeFilterPanelState(this.showFilterPanel);
  }

  constructor(
    private logger: NGXLogger,
    public role: RoleService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private filterPanelService: FilterPanelService,
    public pagesContentService: PagesContentService
  ) {

    this.logger.debug('Inside ListViewComponent constructor');
    this.subscriptions = [];
    this.subscriptions[0] = this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.showFilterPanel = state;
    });
  }

  // Define the trackBy function
  identify(item: any, property: any = 'id'): any {
    if (typeof item === 'object' && item !== null && property in item) {
      return item[property];
    } else {
      return item;
    }
  }

  public icon() {
    const alt = this.altIcon ? '-alt' : '';
    return (this.sortDirection === 'asc' ? this.sortIcon + '-up' : this.sortIcon + '-down') + alt;
  }

  ngOnInit(): void {
    this.dataListTap = this.dataList?.pipe(
      tap((list) => {
        this.dataListLength.set(list.length);
      })
    );

    const pageSub = this.route.queryParams.subscribe((params) => {
      let page = 1;
      try {
        page = parseInt(params['page']);
      } catch (err) {
        page = 1;
      }

      this.page = isNaN(page) ? 1 : page;
    });

    this.subscriptions.push(pageSub);
  }

  track(idx: number, item: any) {
    return item.id;
  }

  public onPageSizeChange() {
    // this.maxPages = Math.ceil(this.totalItems() / this.pageSize);
  }

  public doSort() {
    this.logger.debug('Inside doSort');
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
