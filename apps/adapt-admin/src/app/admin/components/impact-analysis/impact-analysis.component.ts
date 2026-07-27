import { Component, computed, effect, EventEmitter, Input, Output, Signal, signal } from '@angular/core';
import { DataViewModel, IReportModel } from '@adapt/types';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { PagesContentService } from '../../../auth/services/content/pages-content.service';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';


@Component({
  selector: 'adapt-impact-analysis',
  standalone: false,
  templateUrl: './impact-analysis.component.html',
  styleUrls: ['./impact-analysis.component.scss'],
})
export class ImpactAnalysisComponent {
  @Output() learnMore = new EventEmitter<string>();

  @Input() type: 'DataSource' | 'DataView' | 'Glossary' = 'DataSource';
  @Input() id = '';
  @Input() name = '';
  @Input() headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h3';
  @Input() inAccordion = false;

  public dataViews$$ = this.dataViewService.dataViews$$;
  public reports$$ = this.reportService.reports$$;

  public $content = computed(() => this.contentService.$sharedContent()?.impactAnalysis);

  public page = signal(1);
  public pageSize = signal(5);

  public items = computed(() => {
    switch (this.type) {
      case 'DataSource': {
        if (!this.dataViews$$.value() || !this.reports$$.value()) return [];
        const filteredViews = this.dataViews$$.value().filter((view) => view?.data?.dataSource === this.id);
        return filteredViews.map((view) => ({
          view,
          reports: this.reports$$.value().filter((report) => report.dataView === view.dataViewID),
        }));
      }
      case 'DataView': {
        if (!this.reports$$.value()) return [];
        return this.reports$$.value().filter((report) => report.dataView === this.id);
      }
      case 'Glossary':
        return [];
    }
  });

  public dataViewCount = computed(() => {
    if (this.type !== 'DataSource') return 0;
    return (this.items() as { view: DataViewModel; reports: IReportModel[] }[]).length;
  });

  public reportCount = computed(() => {
    if (this.type === 'DataSource') {
      return (this.items() as { view: DataViewModel; reports: IReportModel[] }[])
        .reduce((acc, item) => acc + item.reports.length, 0);
    }
    return (this.items() as IReportModel[]).length;
  });

  public totalItems = computed(() => this.items().length);
  public maxPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  constructor(private data: AdaptDataService, private contentService: PagesContentService, private dataViewService: AdaptDataViewService, private reportService: AdaptReportService) {}

  public onPageChange(page: number) {
    this.page.set(page);
  }

  public onPageSizeChange($event: any) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.pageSize.set(+$event.target.value);
  }
}
