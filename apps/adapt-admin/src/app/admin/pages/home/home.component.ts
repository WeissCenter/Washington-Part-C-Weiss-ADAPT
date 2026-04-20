import { DataSet, DataSource, DataViewModel, IReportModel } from '@adapt/types';
import { Component, computed, effect, OnInit, Signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { UserService } from '../../../auth/services/user/user.service';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { RecentActivityService } from '../../../services/recent-activity.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import {
  PageSectionContentText,
  PageContentText,
} from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';
import { RoleService } from '../../../auth/services/role/role.service';
import { environment } from '@adapt-apps/adapt-admin/src/environments/environment';
import { NGXLogger } from 'ngx-logger';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';

@Component({
  selector: 'adapt-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public dataSources = this.adaptDataService.getDataSources();

  public $dataViews: Observable<DataViewModel[]>;
  public $reports: Observable<IReportModel[]>;

  private $reportsSorted: any[] = [];
  private dataViews: DataViewModel[] = [];

  loadingReports = true;
  loadingDataViews = true;

  private reportSubscription: Subscription;

  public recentActivity = this.recent.history;

  organization = environment?.organizationName || 'Your Organization';

  // Input signal
  $pageContentSignal: Signal<PageContentText | null>; // = this.pagesContentService.getPageContentSignal('home', 'en');
  //$pageContent: Signal<PageContentText | null> = this.pagesContentService.getPageContentSignal('home');
  //$pageSections = computed<PageSectionContentText[]>(() => this.pagesContentService.getPageContentSignal('home')()?.sections || []);
  pageContent: PageContentText | null;
  pageSections:PageSectionContentText[]|undefined;
  pageContentLoaded: boolean = false;

  constructor(
    private logger: NGXLogger,
    public user: UserService,
    public role: RoleService,
    public route: ActivatedRoute,
    private router: Router,
    public adaptDataService: AdaptDataService,
    private adaptDataViewService: AdaptDataViewService,
    private adaptReportService: AdaptReportService,
    public recent: RecentActivityService,
    private metaService: Meta,
    public pagesContentService: PagesContentService
  ) {
    this.logger.debug('Inside HomeComponent constructor');

  this.$dataViews = this.adaptDataViewService.getDataViews();
  this.$reports = this.adaptReportService.getReportsListener();

    this.initializeComponentSignals();

    this.reportSubscription = this.$reports.subscribe((reports) => {
      this.loadingReports = false;
      // sort by updated field, latest at top
      this.$reportsSorted = [...reports].sort((a, b) => {
        const updatedA = parseInt(a.updated, 10); // Convert the string to an integer
        const updatedB = parseInt(b.updated, 10);
        return updatedB - updatedA;
      });
    });
    this.$dataViews.subscribe((views) => {
      this.loadingDataViews = false;
      this.dataViews = [...views];
    });

    this.route.params.subscribe((params) => {
      if ('slug' in params) {
        this.adaptDataService.loadSharedReport(params['slug'] as string).subscribe((result) => {
          this.router.navigate(['admin', 'reports', result.reportID], {
            queryParams: { ...result.filters, version: 'draft' },
          });
        });
      }
    });
  }

  public getImpactAnalysisForView(view: DataSet) {
    return this.$reportsSorted.filter((report) => report.dataSetID === view.dataSetID).length;
  }

  public getImpactAnalysisForSource(source: DataSource) {
    const dataViews = this.dataViews.filter((item) => item.data?.dataSource === source.dataSourceID);

    return {
      dataViewCount: dataViews.length,
      reportCount: this.$reportsSorted.filter((report) => dataViews.some((view) => view.dataViewID === report.dataView))
        .length,
    };
    //

    // return this.$dataViews.pipe(
    //   switchMap(
    //     (views) =>{

    //       return zip(dataViews.map(vt => this.getImpactAnalysisForView(vt)))
    //       .pipe(map(val => ({dataViewCount: dataViews.length, reportCount: val.reduce((accum, count) => accum + count, 0)})))

    //     }

    // ))
  }

  ngOnInit() {
    // Can update these variables with dynamical content pulled from the database if needed

    const description = 'A free tool for reporting IDEA data, fully accessible to individuals with disabilities.';

    this.metaService.updateTag({ name: 'description', content: description });
  }

  private initializeComponentSignals() {
    this.logger.debug('Inside data-view-modal initializeComponentSignals');

    this.$pageContentSignal = this.pagesContentService.getPageContentSignal('home');  //this.pagesContentService.getPageContentSignal('home', 'en');
    //this.$pageSectionsSignal = computed(() => this.$pageContentSignal()?.sections);

    // after we got a signal that the pageContent was loaded
    effect(() => {

      this.logger.debug('$pageContentSignal retrieved');
      this.pageContent = this.$pageContentSignal();

      this.logger.debug('pageContent: ', this.pageContent);

      if (this.pageContent) {

        this.logger.debug('Have page content');

        this.pageSections = this.pageContent.sections;

        if (!this.pageContent.title) {
          this.logger.error('Invalid page title');
        }

        if (!(this.pageSections && this.pageSections?.length > 0)) {
          this.logger.error('Invalid page sections');
        }
        else {
          this.logger.debug('Have page sections');
          this.pageContentLoaded = true;
        }
      }
      else {
        this.logger.debug('NO page content');
        this.pageContentLoaded = false;
      }

    });
  }
}
