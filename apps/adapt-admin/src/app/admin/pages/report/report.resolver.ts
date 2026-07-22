import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { DataViewModel, IReportModel } from '@adapt/types';
import { forkJoin, map, take } from 'rxjs';
import { AdaptReportService } from '../../../services/adapt-report.service';
import { AdaptDataViewService } from '../../../services/adapt-data-view.service';
import { RecentActivityService } from '../../../services/recent-activity.service';

export interface ReportResolvedData {
  reports: IReportModel[];
  dataView: DataViewModel | undefined;
}

export const reportResolver: ResolveFn<ReportResolvedData> = (
  route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
  reportService: AdaptReportService = inject(AdaptReportService),
  dataViewService: AdaptDataViewService = inject(AdaptDataViewService),
  recentActivity: RecentActivityService = inject(RecentActivityService)
) => {
  const id = route.params['id'];
  const version = route.queryParams['version'] ?? 'draft';

  return reportService.getReport(id, version)
    .pipe(
      map((report) => {
        const reportItem = (report as IReportModel[])[0];
        if (reportItem) recentActivity.addRecentActivity(id, 'Report', reportItem);
        return {
          reports: report as IReportModel[],
          dataView: dataViewService.dataViews$$.value().find((view) => view.dataViewID === reportItem?.dataView),
        };
      })
    );
};
