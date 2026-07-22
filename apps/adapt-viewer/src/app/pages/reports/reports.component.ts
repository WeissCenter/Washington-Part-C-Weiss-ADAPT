import { ActivatedRoute, Params, Router } from '@angular/router';
import { AdaptDataService } from '../../services/adapt-data.service';
import { Component, computed, signal } from '@angular/core';
import { IReportModel } from '@adapt/types';
import { ViewerPagesContentService } from '../../services/content/viewer-pages-content.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'adapt-viewer-reports',
  standalone: false,
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private queryParams = toSignal(this.route.queryParams, { initialValue: {} as Params });

  public pageSize = signal(10);
  public page = computed(() => parseInt(this.queryParams()['page'] || '1'));
  public publishedSortDirection = computed<'asc' | 'desc'>(() => this.queryParams()['publishSort'] || 'desc');
  public alphaSortDirection = computed<'asc' | 'desc'>(() => this.queryParams()['alphaSort'] || 'asc');
  public totalItems = computed(() => this.reports$$().length || 0);
  public maxPages = computed(() => Math.max(1, Math.ceil(this.reports$$().length / this.pageSize())));
  public filterStatusMessage = '';
  public focusSortBtn = false;
  activeSort = signal<'updated' | 'alpha'>('updated');

  // public $reports = [];
  
  public loadingReports$$ = this.data.reports$$.isLoading;
  public reports$$ = computed(() => {
    return this.data.reports$$.value().toSorted((a: IReportModel, b: IReportModel) => {
              const updatedA = parseInt(a.published, 10); // Convert the string to an integer
              const updatedB = parseInt(b.published, 10);
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

              let sortResult = this.activeSort() === 'updated' ?
                sort(updatedA, updatedB, 'number', this.publishedSortDirection()) :
                sort(alphaA, alphaB, 'string', this.alphaSortDirection());

              return sortResult;
            });
  });

  $content = this.content.viewerContent$$.value;

  constructor(public data: AdaptDataService, private route: ActivatedRoute, private router: Router, public content: ViewerPagesContentService) {}

  public doSort(what: 'alpha' | 'updated') {
    const newPublishSort: 'asc' | 'desc' = what === 'updated'
      ? (this.publishedSortDirection() === 'asc' ? 'desc' : 'asc')
      : this.publishedSortDirection();
    const newAlphaSort: 'asc' | 'desc' = what === 'alpha'
      ? (this.alphaSortDirection() === 'asc' ? 'desc' : 'asc')
      : this.alphaSortDirection();

    this.activeSort.set(what);
    this.filterStatusMessage = this.content.$reportsContent()?.sortApplied || '';
    this.focusSortBtn = true;

    sessionStorage.setItem('focusSortBtn', true.toString());
    this.router.navigate(['./'], {
      queryParams: { publishSort: newPublishSort, alphaSort: newAlphaSort },
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }
}
