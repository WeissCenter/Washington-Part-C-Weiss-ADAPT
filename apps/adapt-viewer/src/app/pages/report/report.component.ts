import {
  ITemplate,
  IFilter,
  ICondition,
  ViewerTemplate,
  IReportModel,
  SelectFilter,
  RadialFilter,
  IFilterGroup,
  ITemplateFilters,
  ISummaryTemplate,
  flattenObject,
  cleanObject,
} from '@adapt/types';
import { AdaptDataService } from '../../services/adapt-data.service';
import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  debounce,
  debounceTime,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  Observable,
  of,
  OperatorFunction,
  ReplaySubject,
  shareReplay,
  skip,
  startWith,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { AlertService, ContentService, FilterPanelService, LanguageService, ModalComponent } from '@adapt/adapt-shared-component-lib';
import { LocationStrategy } from '@angular/common';
import { ViewerPagesContentService } from '../../services/content/viewer-pages-content.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportPageContentText } from '../../models/content-text.model';

interface ReportFilter {
  [key: string]: any;
}

@Component({
  selector: 'adapt-viewer-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  @ViewChild('shareModal') shareModal?: ModalComponent;
  public filterStateMessage: string;
  public shareCopyStatusMessage = '';
  public loading = false;
  public reportTabIndex = 0;
  public shareURL?: Observable<string>;

  public _report: IReportModel;
  public _template: ViewerTemplate;

  $reportContent = this.content.$reportContent;
  showSuppressionWarning = false;

  showFilterButton: boolean;
  public filterFormGroup: FormGroup;
  public $report = this.route.params.pipe(switchMap((params) => this.data.getReport(params['slug'], this.language.$language())));

  public templateSubject = new BehaviorSubject<(ViewerTemplate & { slug: string }) | null>(null);

  public $template = this.templateSubject
    .asObservable()
    .pipe(filter((temp) => !!temp))
    .pipe(
      tap((template) => {
        const reportTemplate = template as ITemplate;
        this.buildFilterFormGroup(reportTemplate.filters);
        this._template = template;
        const state = this.location.getState() as Record<string, any>;

        this.reportTabIndex = state['page'] || 0;

        if ('filters' in state) {
          this.filterFormGroup.patchValue(state['filters']);
          this.onFilter.next(state['filters']);
          window.history.replaceState({}, '');
        }
      })
    )
    .pipe(
      switchMap((template) =>
        this.$onFilter
          .pipe(
            distinctUntilChanged((prev, curr) => {
              const cleanPrev = cleanObject(prev);
              const cleanCurr = cleanObject(curr);
              return JSON.stringify(cleanPrev) === JSON.stringify(cleanCurr);
            })
          )

          .pipe(
            map((obj) => {
              return flattenObject(obj);
            })
          )
          .pipe(
            switchMap((changes) => {
              this.loading = true;
              if (this.intialLoad) this.applyFilterChanges(true);
              this.existingFilters = this.buildExistingFilters();

              const cleanedChanges = cleanObject(changes);

              const filters =
                changes !== undefined && Object.keys(cleanedChanges).length
                  ? cleanedChanges
                  : { ...this.existingFilters };

              this.filtered = changes !== undefined && Object.keys(cleanObject(changes)).length > 0;

              // assume new data view structure
              return this.data.getData(template.slug, filters, this.language.getLang());
            })
          )
      )
    )
    .pipe(
      tap((temp) => {
        if (temp.filters) {
          this.showFilterButton = Object.values(temp.filters).some((filter) => {
            const typedFilter = filter as IFilter<unknown>;
            const pageId = (temp as ITemplate).pages?.[this.reportTabIndex]?.id || undefined;
            if (!pageId) return false; // no pageId, no filter condition
            return typedFilter?.condition?.pages?.includes(pageId) ?? true;
          });
        } else {
          // When creating a preview, there are no previews
          this.showFilterButton = false;
        }
      }),
      tap((template) => {
        this.showSuppressionWarning = template.suppressed || false;
      })
    )
    .pipe(
      tap(() => (this.loading = false)),
      catchError((err) => {
        console.error(err);
        this.templateErrorSubject.next({ success: false, err });
        return of();
      })
    );

  public templateErrorSubject = new ReplaySubject();

  public availableFilters!: any[];

  public filterSummary = {
    totalFilters: 0,
    categoriesWithFilters: 0,
  };

  public originalOrder = (a: any, b: any): number => {
    return a?.value?.order - b?.value?.order;
  };

  public filterClass: 'filtered' | 'suppressed' = 'filtered';

  public intialLoad = true;
  public filtered = false;
  public suppressed = true;

  public showResetFilters = false;
  public existingFilters: ReportFilter = {};
  public previousFilters: ReportFilter | null = null;
  public filterGroupSelection: string | null = null;
  public onFilter = new BehaviorSubject<Record<string, any>>({});
  public $onFilter = this.onFilter.asObservable().pipe();
  public showFilterPanel = false;
  public dataModalOpen = false;

  constructor(
    private route: ActivatedRoute,
    private data: AdaptDataService,
    private fb: FormBuilder,
    private router: Router,
    private filterPanelService: FilterPanelService,
    public language: LanguageService,
    private location: LocationStrategy,
    public content: ViewerPagesContentService,
    private alert: AlertService
  ) // private loc: Location
  {
    this.filterFormGroup = this.fb.group({});
    this.$report.subscribe({
      next: (rpt) => {
        this.templateSubject.next({ ...rpt.template, slug: rpt.slug } as ViewerTemplate & { slug: string });
      },
      error: (err) => {
        if(err instanceof HttpErrorResponse && err.status === 404) this.router.navigate(['404'])
      }
    });
    this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.showFilterPanel = state;
    });

    const filterFormChangesSub = this.filterFormGroup.valueChanges.subscribe((changes) => {
      // console.groupCollapsed('Filter Form Group Changes');
      const templateFilters = (this.templateSubject.value as ITemplate).filters;
      const pageId = (this.templateSubject.value as ITemplate).pages?.[this.reportTabIndex]?.id || undefined;
      // console.log('Changes:', changes);
      // console.log('formGroup:', this.filterFormGroup);
      // console.log('Template Filters:', templateFilters);
      // console.log('PageId:', pageId);

      // find the select filter that has the same key as the filterFormGroup
      const selectFilter = Object.keys(this.filterFormGroup.controls).find(
        (key) =>
          templateFilters[key] &&
          'type' in templateFilters[key] &&
          templateFilters[key].type === 'select' &&
          this.validateFilterCondition(key, pageId, changes, this.templateSubject.value as ITemplate)
      );
      // console.log(`Select Filter: ${selectFilter}`);

      if (!selectFilter) {
        console.warn('No select filter found in the filterFormGroup');
      }

      if (selectFilter && selectFilter in changes && changes[selectFilter] !== this.filterGroupSelection) {
        // console.log(`Filter ${selectFilter} has changed from ${this.filterGroupSelection} to ${changes[selectFilter]}`);
        // set all values in changes to null except the selectFilter
        const resetFormValues: Record<string, any> = {};
        for (const filterKey in changes) {
          resetFormValues[filterKey] = filterKey === selectFilter ? changes[filterKey] : null;
        }
        // this.loadingAvailableFilters = true;
        // console.log(`Resetting filter form group with values:`, resetFormValues);
        const defaultFilterGroupSelection = changes[selectFilter] === '' ? '' : null;
        this.filterGroupSelection = changes[selectFilter] || defaultFilterGroupSelection;
        this.filterFormGroup.reset(resetFormValues);
        setTimeout(() => {
          // this.loadingAvailableFilters = false;
        }, 0);
        // console.groupEnd();
        return;
      }
      // console.groupEnd();
    });

    // this.subscriptions.push(filterFormChangesSub);
  }

  onDataModalStateChange(isOpen: boolean) {
    this.dataModalOpen = isOpen;
  }

  public openShareModal() {
    this.shareModal?.open();

    const appliedFilters: any = this.onFilter.value;

    const validFilters = Object.keys(this.onFilter.value as Record<string, any>).reduce((accum, key) => {
      if (appliedFilters[key] !== null && appliedFilters[key] !== undefined && appliedFilters[key]?.length)
        return Object.assign(accum, { [key]: appliedFilters[key] });

      return accum;
    }, {});

    this.shareURL = this.data
      .shareReport(this.route.snapshot.params['slug'], validFilters, this.reportTabIndex)
      .pipe(switchMap((slug) => of(`${location.protocol}//${location.host}/share/${slug}`)));
  }

  public toggleFilterPanel(close = false) {
    this.showFilterPanel = !this.showFilterPanel;
    if (close) this.showFilterPanel = false;
    if (this.showFilterPanel) {
      this.existingFilters = this.buildExistingFilters();
      setTimeout(() => {
        this.filterStateMessage = 'Filter panel opened.';
      }, 0);
    } else {
      setTimeout(() => {
        this.filterStateMessage = 'Filter panel closed.';
      }, 0);
    }
    this.filterPanelService.changeFilterPanelState(this.showFilterPanel);
  }

  confirmResetFilters() {
    const confirmReset = window.confirm('Are you sure you want to reset all filters?');
    //   debugger;
    if (confirmReset) {
      this.applyFilterChanges(true);
    } else {
      // User cancelled, do nothing or handle cancellation
    }
  }

  validateFilterCondition(
    filterKey: string,
    pageId: string | undefined,
    filters: any,
    reportTemplate: ITemplate
  ): boolean {
    const reportFilter = reportTemplate.filters[filterKey] as IFilter<unknown>;
    if (!reportFilter?.condition) return true;
    const { pages, conditions, operator } = reportFilter.condition;

    if (pages?.length && pageId && !pages.includes(pageId)) return false; // If the filter is not applicable to the current page, skip validation
    if (!conditions?.length) return true; // No conditions, no validation needed

    // if the conditions are defined filter based on the validity of the parent filter
    const validConditions = conditions.filter((cond: ICondition) => {
      return cond.parent;
    });

    if (!validConditions.length) return true; // No valid conditions, no validation needed
    switch (operator) {
      case 'AND': {
        return validConditions.every((cond: ICondition) => {
          const parentValue = filters[cond.parent];
          return cond.value.includes(parentValue);
        });
      }
      case 'OR': {
        return validConditions.some((cond: ICondition) => {
          const parentValue = filters[cond.parent];
          return cond.value.includes(parentValue);
        });
      }
      case 'NOR': {
        return !validConditions.some((cond: ICondition) => {
          const parentValue = filters[cond.parent];
          return cond.value.includes(parentValue);
        });
      }
      case 'NAND': {
        return !validConditions.every((cond: ICondition) => {
          const parentValue = filters[cond.parent];
          return cond.value.includes(parentValue);
        });
      }
    }
  }

  usePreviousFilters() {
    this.loading = true;
    this.showResetFilters = false;
    this.toggleFilterPanel(true);
    setTimeout(() => {
      this.filterStateMessage = 'Previous filters applied.';
    }, 0);
    this.filterFormGroup.reset(this.previousFilters);
    this.onFilter.next(this.filterFormGroup.value);
  }

  applyFilterChanges(reset = false) {
    this.loading = true;
    setTimeout(() => {
      this.filterStateMessage = 'Filters changed.';
    }, 0);
    this.toggleFilterPanel(true);
    this.previousFilters = { ...this.buildExistingFilters() };

    if (reset) {
      this.filterFormGroup.reset();
      this.intialLoad ? (this.showResetFilters = false) : (this.showResetFilters = true);
    }

    if (!this.intialLoad){
      this.onFilter.next(this.filterFormGroup.value);
    }

    this.intialLoad = false;
  }

  public onTabChange(event: number) {
    this.filterFormGroup.reset();

    // this.router.navigate([], {relativeTo: this.route})
    this.onFilter.next({});
    this.showFilterButton = Object.values(this._template.filters).some((filter) => {
      const typedFilter = filter as IFilter<unknown>;
      const pageId = (this._template as ITemplate).pages?.[event]?.id || undefined;
      if (!pageId) return false; // no pageId, no filter condition
      return typedFilter?.condition?.pages?.includes(pageId) ?? true;
    });
  }

  public showFilter(template: ViewerTemplate, filter: IFilter<unknown>) {
    if (!filter?.condition) return true;

    const { pages, conditions, operator } = filter.condition;

    const show = () => {
      if (!conditions?.length) return true;

      const validConditions = conditions.filter((cond) => {
        const filter = template.filters[cond.parent] as IFilter<unknown>;

        const pageID = template.pages?.[this.reportTabIndex].id;

        return filter.condition?.pages?.includes(pageID || '');
      });

      if (!validConditions.length) return true;

      switch (operator) {
        case 'AND': {
          return validConditions?.every((cond: ICondition) => {
            const parent = this.filterFormGroup.get(cond.parent)?.value;

            return cond.value.includes(parent);
          });
        }
        case 'OR': {
          return validConditions?.some((cond: ICondition) => {
            const parent = this.filterFormGroup.get(cond.parent)?.value;

            return cond.value.includes(parent);
          });
        }
      }
      return true;
    };

    if (pages?.length) {
      const page = template?.pages?.[this.reportTabIndex];

      return pages.includes(page!.id) && show();
    }

    return show();
  }

  buildExistingFilters() {
    const existingSelections: { [key: string]: string[] } = {};
    let filterCount = 0;
    let categoryCount = 0;
    for (const key in this.filterFormGroup.value) {
      if (key in this._template.filters) {
        let hasValue = false;
        const tempFilterParent = this._template.filters[key] as IFilter<SelectFilter | RadialFilter>;
        if (this.filterFormGroup.value[key] === 'all') {
          if (tempFilterParent.filter && Array.isArray(tempFilterParent.filter.options)) {
            existingSelections[key] = tempFilterParent.filter.options
              .filter((option: { value: string }) => option.value !== 'all' && option.value !== '')
              .map((option: { value: any }) => option.value);
            hasValue = existingSelections[key].length > 0;
          } else {
            console.error(`Invalid structure for ${key} in report template filters`);
          }
        } else {
          if (this.filterFormGroup.value[key] !== null) {

            const pageID = this._template.pages?.[this.reportTabIndex].id;

            if (!tempFilterParent.condition?.pages?.length || tempFilterParent?.condition?.pages?.includes(pageID!)) {
              const values = [this.filterFormGroup.value[key]].flat().filter((value) => value !== '');
              if (values.length > 0) {
                existingSelections[key] = values;
                hasValue = true;
              }
            }
          }
        }

        if (hasValue) {
          filterCount += existingSelections[key].length;
          categoryCount++;
        }
      } else {
        console.log(`Key ${key} not found in report template filters`);
      }
    }

    this.filterSummary = {
      totalFilters: filterCount,
      categoriesWithFilters: categoryCount,
    };
    return existingSelections;
  }

  private buildFilterFormGroup(filters: ITemplateFilters, group?: string) {
    if (!filters) return;
    const targetGroup = group?.length ? (this.filterFormGroup.get(group)! as FormGroup) : this.filterFormGroup;
    Object.keys(filters).forEach((key) => {
      if ('code' in filters[key]) {
        const newControl = new FormControl((filters[key] as IFilter<any>)?.filter?.default ?? '');
        const code = `${(filters[key] as IFilter<unknown>).code}`;
        // iFilter
        targetGroup.addControl(code, newControl);

        if ((filters[key] as IFilter<unknown>).children) {
          this.buildFilterFormGroup((filters[key] as IFilter<unknown>).children);
        }
      } else if ('exclusive' in filters[key]) {
        // IFilterGroup
        const newGroup = new FormGroup({});

        this.filterFormGroup.addControl(key, newGroup);

        this.buildFilterFormGroup((filters[key] as IFilterGroup).filters, key);
      }
    });

    this.availableFilters = this.filterFormGroup.value;
  }

  public copy(text: string) {
    navigator.clipboard.writeText(text);
    // Reset then set so the same message is re-announced on repeated presses.
    this.shareCopyStatusMessage = '';
    setTimeout(() => {
      this.shareCopyStatusMessage = 'Link copied to clipboard.';
    }, 0);
    this.alert.add({type: 'success', title: 'Success', body: 'The URL has been successfully copied to your clipboard.'})
  }
}
