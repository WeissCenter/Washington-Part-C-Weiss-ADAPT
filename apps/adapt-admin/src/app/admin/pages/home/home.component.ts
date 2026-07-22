import { DataSet, DataSource, DataViewModel, IReportModel } from '@adapt/types';
import { Component, computed, OnInit } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { UserService } from '../../../auth/services/user/user.service';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { RecentActivityService } from '../../../services/recent-activity.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
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

  public reports$$ = this.adaptReportService.reports$$;
  public dataViews$$ = this.adaptDataViewService.dataViews$$;


  public recentActivity = this.recent.history;

  organization = environment?.organizationName || 'Your Organization';

  readonly $pageContent = this.pagesContentService.getPageContentSignal('home');
  readonly $pageSections = computed(() => this.$pageContent()?.sections);

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
    return this.reports$$.value().filter((report) => report.dataSetID === view.dataSetID).length;
  }

  public getImpactAnalysisForSource(source: DataSource) {
    const dataViews = this.dataViews$$.value().filter((item) => item.data?.dataSource === source.dataSourceID);

    return {
      dataViewCount: dataViews.length,
      reportCount: this.reports$$.value().filter((report) => dataViews.some((view) => view.dataViewID === report.dataView)).length,
    };
  }

  ngOnInit() {
    // Can update these variables with dynamical content pulled from the database if needed

    const description = 'A free tool for reporting IDEA data, fully accessible to individuals with disabilities.';

    this.metaService.updateTag({ name: 'description', content: description });
  }

}
