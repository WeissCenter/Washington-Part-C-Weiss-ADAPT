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

  return forkJoin([
    reportService.getReport(id, version),
    dataViewService.getDataViews().pipe(take(1)),
  ]).pipe(
    map(([reports, dataViews]) => {
      const report = (reports as IReportModel[])[0];
      if (report) recentActivity.addRecentActivity(id, 'Report', report);
      return {
        reports: reports as IReportModel[],
        dataView: dataViews.find((view) => view.dataViewID === report?.dataView),
      };
    })
  );
};
