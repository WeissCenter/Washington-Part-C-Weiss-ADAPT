import {
  ICondition,
  IFilter,
  IFilterGroup,
  IReportModel,
  IReportPreview,
  ISummaryTemplate,
  ITemplate,
  ITemplateFilters,
  LanguageCode,
  PageMode,
  ReportVersion,
  SelectFilter,
  cleanObject,
  flattenObject,
} from '@adapt/types';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy, OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subscription,
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  forkJoin,
  map,
  of,
  pairwise,
  skip,
  startWith,
  switchMap,
  tap,
  zip,
} from 'rxjs';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { RecentActivityService } from '../../../services/recent-activity.service';
import { FilterPanelService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/filterpanel.service';
import { TabViewComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/tab-view/tab-view.component';
import { FocusService } from '../../services/focus.service';
import { AlertService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/alert.service';
import { UserService } from '../../../auth/services/user/user.service';
import { Idle } from '@ng-idle/core';
import { IdleStates } from '../../../auth/auth-model';
import { LocationStrategy } from '@angular/common';
import { ConfirmModalComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { ContentService, ModalComponent, SettingsService } from '@adapt/adapt-shared-component-lib';
import { TemplateService } from '../../../services/template.service';
import { PagesContentService } from '../../../auth/services/content/pages-content.service';
import { getFormErrors, uniqueNameValidator } from '../../../util';
import slugify from 'slugify';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';
import { NGXLogger } from 'ngx-logger';
interface ReportFilter {
  [key: string]: any;
}

@Component({
  selector: 'adapt-report',
  standalone: false,
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit, AfterViewInit, OnDestroy {
  getFormErrors = getFormErrors;
  PageMode = PageMode;
  ReportVersion = ReportVersion;
  @ViewChild(TabViewComponent) tabView?: TabViewComponent;
  @ViewChild('editConfirmationModal') editConfirmationModal?: ModalComponent;
  @ViewChild('editPublishedConfirmationModal') editPublishedConfirmationModal?: ModalComponent;

  @Output() loaded = new EventEmitter<boolean>();

  @ViewChild(ConfirmModalComponent) confirmModal?: ConfirmModalComponent;
  @ViewChild('resetModal') resetModal?: ModalComponent;
  @ViewChild('unPublishModal') unPublishModal?: ModalComponent;
  @ViewChild('publishConfirmationModal') publishConfirmationModal?: ModalComponent;
  @Input() report?: any;

  @Input() preview = false;

  @Input() previewSuppress = false;
  reportTemplateHasSuppression = true;

  public slugPattern = new RegExp('[-a-z0-9]');
  public $formLang = signal(this.settings.getDefaultLanguage() as string);
  public $reportLang = signal(this.settings.getDefaultLanguage());

  public showFilters = false;
  public filtered = false;
  private intialLoad = true;
  public translationsGenerated = false;
  public submitted = false;

  public startTime = 0;

  public reportTabIndex = 0;

  public langIndex = 0;

  public mode = PageMode.VIEW;

  public radioSelectItems = [
    { label: 'Internal use only', value: 'internal' },
    { label: 'External public view', value: 'external' },
  ];
  showFilterButton: boolean;
  beforeEditFormValue: any;

  @HostListener('window:beforeunload')
  canDeactivate(isRouter = false, nextState?: RouterStateSnapshot): boolean {
    if (this.user.idleState === IdleStates.TIMED_OUT) return true;

    if (isRouter) this.confirmModal?.open(nextState?.url);

    return !(this.mode === PageMode.EDIT && this.editReportForm.dirty);
  }

  filterClass: 'filtered' | 'suppressed' = 'filtered';

  public templateSubject = new BehaviorSubject<ITemplate | ISummaryTemplate | null>(null);
  public templateErrorSubject = new ReplaySubject();
  public $template: Observable<any>;  //Observable<ITemplate | ISummaryTemplate | null>;


  // public $templateError = this.$template.pipe(
  //   catchError((err) => of({ success: false, err })),
  //   filter((val) => (val as { success: boolean })?.success === false),
  //   tap((err) => this.loaded.emit(false))
  // );

  @Output() templateUpdate = new EventEmitter<ITemplate | ISummaryTemplate | null>();

  // Filter panel toggle service logic
  private subscription: Subscription;
  public showFilterPanel = false;
  filterStatusMessage = '';
  filterStateMessage = '';
  existingFilters: ReportFilter = {};
  previousFilters: ReportFilter | null = null;
  filterGroupSelection: string | null = null;

  public unPublishJustificationForm: FormGroup;

  $englishReportPageContent = this.pages.getPageContentSignal('report-page', 'en');
  $reportPageContent = computed(() => {
    return this.pages.getPageContentSignal('report-page', this.$reportLang())();
  });
  $reportSharedContent = computed(() => {
    return this.pages.getSharedContentSignal(this.$reportLang())();
  });

  public $languageOptions = computed(() => {
    const englishReportPageContent = this.$englishReportPageContent();
    const contentLanguageOptions = englishReportPageContent?.sections?.[0].questions?.[1].options || [{ label: 'English', localizedLabel: 'English', value: 'en' }];
    const supportedLanguages = this.settings.getSettingsSignal()().supportedLanguages || ['en'];

    return contentLanguageOptions.filter((item) =>
      supportedLanguages.includes(item.value as LanguageCode)
    );
  });

  public dataModalOpen = false;

  onDataModalStateChange(isOpen: boolean) {
    this.dataModalOpen = isOpen;
  }

  toggleFilterPanel(close = false) {
    this.showFilterPanel = !this.showFilterPanel;
    if (close) this.showFilterPanel = false;
    if (this.showFilterPanel) {
      this.existingFilters = this.buildExistingFilters();
      this.filterStateMessage = 'Filter panel opened.';
    } else this.filterStateMessage = 'Filter panel closed.';
    this.filterPanelService.changeFilterPanelState(this.showFilterPanel);
  }

  applyFilterChanges(reset = false) {
    this.loading = true;
    this.filterStatusMessage = 'Filters changed.';
    this.toggleFilterPanel(true);
    this.previousFilters = { ...this.buildExistingFilters() };

    if (reset) {
      this.filterFormGroup.reset();
      this.intialLoad ? (this.showResetFilters = false) : (this.showResetFilters = true);
    }

    if (!this.intialLoad) this.onFilter.next(this.filterFormGroup.value);

    this.intialLoad = false;
  }

  showResetFilters = false;

  confirmResetFilters() {
    const confirmReset = window.confirm('Are you sure you want to reset all filters?');
    //   debugger;
    if (confirmReset) {
      this.applyFilterChanges(true);
    } else {
      // User cancelled, do nothing or handle cancellation
    }
  }

  usePreviousFilters() {
    this.loading = true;
    this.showResetFilters = false;
    this.toggleFilterPanel(true);
    this.filterStatusMessage = 'Previous filters applied.';
    this.filterFormGroup.reset(this.previousFilters);
    this.onFilter.next(this.filterFormGroup.value);
  }

  private subscriptions: Subscription[] = [];
  private routeSub!: Subscription;

  public filterFormGroup: FormGroup;
  public editReportForm: FormGroup;
  availableFilters!: any[];
  loadingAvailableFilters = false;

  public onFilter = new BehaviorSubject({});
  public $onFilter = this.onFilter.asObservable();

  loading = true;

  public originalOrder = (a: any, b: any): number => {
    return a?.value?.order - b?.value?.order;
  };

  constructor(
    private logger: NGXLogger,
    private temp: TemplateService,
    private router: Router,
    private user: UserService,
    private idle: Idle,
    private settings: SettingsService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private alert: AlertService,
    private location: LocationStrategy,
    private announcer: LiveAnnouncer,
    private adaptDataService: AdaptDataService,
    private adaptDataViewService: AdaptDataViewService,
    private adaptReportService: AdaptReportService,
    private recentActivity: RecentActivityService,
    private filterPanelService: FilterPanelService,
    private focusService: FocusService,
    private cd: ChangeDetectorRef,
    public pages: PagesContentService,
    public content: ContentService
  ) {
    this.logger.debug('Inside ReportComponent constructor');

    this.initializeReportTemplateListener();
    this.initializeFormAndChangeListeners();

    //Idle Detection: It monitors user interactions like mouse movements, keyboard inputs, and potentially other
    // application-specific activities (e.g., active HTTP requests).
    this.initializeUserSessionIdleTimeoutListener();

  }

  ngOnInit(): void {
    this.logger.debug('ReportComponent ngOnInit');
  }

  private initializeReportTemplateListener(): void {
    this.logger.debug('Inside initializeReportTemplateListener');

    this.$template = this.templateSubject.asObservable().pipe(filter((temp) => !!temp))
      .pipe(tap((template) => {
          this.loading = false;
          const reportTemplate = template as ITemplate;
          if (!this.preview) this.buildFilterFormGroup(reportTemplate.filters);
          //   this.onFilter.next(this.filterFormGroup.value);
          this.announcer.announce('Loading Report Preview');
          this.startTime = Date.now();
        })
      ).pipe(switchMap((temp) =>
          this.$onFilter.pipe(map((obj) => {
                return flattenObject(obj);
              })
            ).pipe(switchMap((changes) => {

                this.loading = true;

                if (!this.preview) {
                  if (this.intialLoad) this.applyFilterChanges(true);
                  this.existingFilters = this.buildExistingFilters();
                }

                const filters = changes !== undefined && Object.keys(cleanObject(changes)).length ? cleanObject(changes) : { ...this.existingFilters };

                this.filtered = changes !== undefined && Object.keys(cleanObject(changes)).length > 0;

                const pageId = (temp as ITemplate).pages?.[this.reportTabIndex]?.id || undefined;

                if (!this.preview) {

                  return this.adaptReportService.getReportData(
                    this.report.reportID,
                    this.report.version,
                    filters,
                    this.previewSuppress,
                    this.$reportLang(),
                    pageId
                  );
                }
                // assume new data view structure
                return this.temp.renderTemplateWithMultipleViews(
                  structuredClone(temp) as ITemplate,
                  this.report.dataView,
                  filters,
                  this.previewSuppress
                );
              })
            )
        )
      ).pipe(tap((temp) => {

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

          if (temp.filtersUsed) {

            this.filterFormGroup.reset(temp.filtersUsed);
            // function to determine if the onFilter value is the same as the temp.filtersUsed
            // check if the onFilter value is the same as the temp.filtersUsed
            // if not, emit the new filters temp.filtersUsed is the source of truth
            if (!sameObjects(this.onFilter.value, temp.filtersUsed)) {
              this.onFilter.next(temp.filtersUsed);
            }
          }
          this.loading = false;
          this.loaded.emit(true);

          // this.editTitle.setValue(temp.title);
          // this.editDescription.setValue(temp.description);
        }),
        catchError((err) => {

          this.logger.error('templateSubject, err: ', err);
          this.templateErrorSubject.next({ success: false, err });
          this.loaded.emit(false);
          return of();
        })
      ).pipe(distinctUntilChanged((a, b) => sameObjects(a!.filtersUsed, b!.filtersUsed) && a!.suppressed === b!.suppressed && a!.title === b!.title)); // prevents unnecessary reloads


  }

  private initializeFormAndChangeListeners(): void {
    this.logger.debug('Inside initializeFormAndChangeListeners');

    this.editReportForm = this.fb.group({
      reportTexts: this.fb.array([], [Validators.required]),
      audience: this.fb.control('internal', [Validators.required]),
      slug: this.fb.control('', [Validators.required]),
      suppressData: this.fb.control(false), // dummy only used to drive checkbox for suppression that is not saved
    });

    this.editSlug.disable();

    const editAudienceValueChanges = this.editAudience.valueChanges.subscribe((changes) => {
      if (changes === 'internal') {
        this.editSlug.disable();
      } else {
        this.editSlug.enable();
      }

      if (changes === 'external' && !this.editSlug.dirty && !this.editSlug.value?.length) {
        this.editSlug.setValue(
          slugify(this.editTitle.value, {
            strict: true,
            lower: true,
            trim: true,
          })
        );
      }
    });

    this.subscriptions.push(editAudienceValueChanges);

    this.unPublishJustificationForm = this.fb.group({
      justification: this.fb.control('', [Validators.required]),
    });

    this.filterFormGroup = this.fb.group({});
    this.subscription = this.filterPanelService.currentFilterPanelState.subscribe((state) => {
      this.showFilterPanel = state;
    });

    const filterFormChangesSub = this.filterFormGroup.valueChanges.subscribe((changes) => {
      this.logger.debug('Filter Form Group Changes');
      const templateFilters = (this.templateSubject.value as ITemplate).filters;
      const pageId = (this.templateSubject.value as ITemplate).pages?.[this.reportTabIndex]?.id || undefined;
      this.logger.debug('Changes:', changes);
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
      this.logger.debug(`Select Filter: ${selectFilter}`);

      if (!selectFilter) {
        this.logger.warn('No select filter found in the filterFormGroup');
      }

      if (selectFilter && selectFilter in changes && changes[selectFilter] !== this.filterGroupSelection) {
        // this.logger.debug(`Filter ${selectFilter} has changed from ${this.filterGroupSelection} to ${changes[selectFilter]}`);
        // set all values in changes to null except the selectFilter
        const resetFormValues: Record<string, any> = {};
        for (const filterKey in changes) {
          resetFormValues[filterKey] = filterKey === selectFilter ? changes[filterKey] : null;
        }
        this.loadingAvailableFilters = true;
        // this.logger.debug(`Resetting filter form group with values:`, resetFormValues);
        const defaultFilterGroupSelection = changes[selectFilter] === '' ? '' : null;
        this.filterGroupSelection = changes[selectFilter] || defaultFilterGroupSelection;
        this.filterFormGroup.reset(resetFormValues);
        setTimeout(() => {
          this.loadingAvailableFilters = false;
        }, 0);
        // console.groupEnd();
        return;
      }
      // console.groupEnd();
    });

    this.subscriptions.push(filterFormChangesSub);

  }

  private initializeUserSessionIdleTimeoutListener(): void {
    this.logger.debug('Inside InitializeUserSessionIdleTimeoutListener');

    // see the user.service for more info
    this.idle.onTimeout.subscribe(() => {

      this.logger.debug('Handle idle.onTimeout event to save any dirty values while the user was editing a report');

      if (this.editReportForm.dirty) {
        this.user.userInactivitySave({
          action: 'EDIT',
          type: 'Report',
          body: {
            reportID: this.report.reportID,
            version: this.route?.snapshot?.queryParams['version'] ?? 'draft',
            ...this.editReportForm.getRawValue(),
          },
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.routeSub?.unsubscribe();
  }

  private buildFilterFormGroup(filters: ITemplateFilters, group?: string) {
    this.logger.debug('Inside ReportComponent buildFilterFormGroup');

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

  public showFilter(template: ITemplate, filter: IFilter<unknown>) {
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
    //$any(child.value).condition.includes(filterFormGroup.get(filter.key)?.value)
  }

  public onTemplateChange(template: ITemplate) {
    this.templateUpdate.emit(template);
  }

  public onSuppress(toggle: boolean) {
    this.filterClass = toggle ? 'suppressed' : 'filtered';

    this.templateSubject.next(this.templateSubject.value);
  }

  async ngAfterViewInit() {

    this.logger.debug('Inside ReportComponent ngAfterViewInit, preview: ', this.preview);

    if (this.preview) {
      const reportPreview = this.report as IReportPreview;

      // const template = await firstValueFrom(this.temp.getTemplate(reportPreview!.template as string));

      this.report.template = reportPreview.template;

      this.templateSubject.next(this.report.template);
      this.reportTemplateHasSuppression = Object.keys(this.report.template?.suppression || {}).length !== 0;

      return;
    }

    // const data = await firstValueFrom(rawdata);
    // this.report = data['reportResolver'];
    this.routeSub = combineLatest([this.route.params, this.route.queryParams]).subscribe(
      async ([params, queryParams]) => {

        try {
          this.logger.debug('routeSub getReport: ', params['id'], queryParams['version']);

          const reportData = await firstValueFrom(
            this.adaptReportService.getReport(params['id'], queryParams['version']).pipe(tap((reports) => {

              this.logger.debug('reload reports:', reports);
              reports = reports as IReportModel[];

                const result = reports[0];
                this.recentActivity.addRecentActivity(params['id'], 'Report', reports[0]);

                const supportedLangs = this.settings.getSettings().supportedLanguages || ['en'];
                const maxLength = supportedLangs.length;

                const texts: any[] = [];

                for (let i = 0; i < maxLength; i++) {
                  const item = reports[i] || reports[0];

                  const text = {
                    title: item?.template.title,
                    description: item?.template.description,
                    verified: i === 0 || !!item?.translationsVerified,
                  };

                  texts.push(text);
                }

                for (const _ of texts) {
                  const newGrp = this.fb.group({
                    title: this.fb.control('', [Validators.required], [uniqueNameValidator('Report', this.adaptDataService, PageMode.EDIT)]
                    ),
                    description: this.fb.control('', [Validators.required]),
                    verified: this.fb.control(false, [Validators.requiredTrue]),
                  });

                  if (result?.visibility === 'internal') newGrp.get('verified')!.disable();

                  this.reportTexts.push(newGrp);
                }

                const resetVertificationStatuses = this.defaultReportText.valueChanges
                  .pipe(skip(3))
                  .subscribe((changes) => {
                    this.translationsGenerated = false;
                    this.reportTexts.controls.forEach((ctl, idx) =>
                      idx !== 0 ? ctl.get('verified')?.setValue(false, { emitEvent: false }) : null
                    );
                  });

                this.subscriptions.push(resetVertificationStatuses);

                this.editReportForm.setValue({
                  reportTexts: texts,
                  audience: result?.visibility,
                  slug: result?.slug ?? '',
                  suppressData: this.fb.control(this.previewSuppress||false),
                });
              })
            )
          );
          this.report = (reportData as IReportModel[])[0];

          this.logger.debug('Read report: ', this.report.name);

          this.reportTemplateHasSuppression = Object.keys((reportData as IReportModel[])[0]?.template?.suppression || {}).length !== 0;
          this.previewSuppress = (reportData as IReportModel[])[0]?.visibility === 'external' && this.reportTemplateHasSuppression;

          this.logger.debug('previewSuppress: ', this.previewSuppress);
          // resolve data view

          const state = this.location.getState() as any;

          if (state?.['editMode']) this.mode = PageMode.EDIT;

          this.report.dataView = await firstValueFrom(
            this.adaptDataViewService.getDataViews().pipe(
              map((views) => views.find((view) => view.dataViewID === this.report.dataView)))
          );

          this.templateSubject.next(this.report.template);

          this.existingFilters = this.buildExistingFilters();
        } catch (error) {
          console.error('Error fetching report data:', error);
        }
      }
    );
  }

  filterSummary = {
    totalFilters: 0,
    categoriesWithFilters: 0,
  };

  buildExistingFilters() {
    if (this.preview) return {};
    const existingSelections: { [key: string]: string[] } = {};
    let filterCount = 0;
    let categoryCount = 0;
    for (const key in this.filterFormGroup.value) {
      if (key in this.report.template.filters) {
        let hasValue = false;

        if (this.filterFormGroup.value[key] === 'all') {
          if (
            this.report.template.filters[key].filter &&
            Array.isArray(this.report.template.filters[key].filter.options)
          ) {
            existingSelections[key] = this.report.template.filters[key].filter.options
              .filter((option: { value: string }) => option.value !== 'all' && option.value !== '')
              .map((option: { value: any }) => option.value);
            hasValue = existingSelections[key].length > 0;
          } else {
            console.error(`Invalid structure for ${key} in report template filters`);
          }
        } else {
          if (this.filterFormGroup.value[key] !== null) {
            const values = [this.filterFormGroup.value[key]].flat().filter((value) => value !== '');
            if (values.length > 0) {
              existingSelections[key] = values;
              hasValue = true;
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

  handleUnSuppress(): void {
    this.previewSuppress = false;
    this.onSuppress(this.previewSuppress);
    this.focusService.moveToFirstFocusableElement('lib-adapt-checkbox#suppression-checkbox');
  }

  public onTabChange() {
    this.logger.debug('Inside ReportComponent onTabChange');

    this.filterFormGroup.reset();
    this.onFilter.next(this.filterFormGroup.value);
  }

  public editReport() {
    this.logger.debug('Inside ReportComponent editReport');

    if (this.isEditMode()) {
      this.mode = PageMode.VIEW;
      return;
    }

    if (this.report?.version === ReportVersion.FINALIZED) {
      this.editPublishedConfirmationModal?.open();
      return;
    }

    this.enableEditMode();
  }

  public isEditMode() {
    return this.mode === PageMode.EDIT;
  }

  public confirmCancel() {
    this.mode = PageMode.VIEW;
    this.editReportForm.reset(this.beforeEditFormValue);
  }

  public confirmEditPublishedReport() {
    this.editPublishedConfirmationModal?.close();
    this.enableEditMode();
  }

  public reset() {
    this.editReportForm.reset(this.beforeEditFormValue);
    this.resetModal?.close();
  }

  public cancel() {
    if (this.editReportForm.dirty) return this.confirmModal?.open();
    this.mode = PageMode.VIEW;
  }

  private enableEditMode() {
    this.mode = PageMode.EDIT;
    this.beforeEditFormValue = this.editReportForm.getRawValue();
  }

  public publishReport() {
    this.logger.debug('Inside ReportComponent publishReport');

    //  (this.editAudience.value === 'external' && this.defaultReportText.dirty && !this.translationsGenerated)

    // verify stuff

    for (const text of this.reportTexts.value) {
      if (!text.verified) return;
    }

    this.adaptReportService.startReportPublish(this.report).subscribe({
      next: () => {
        this.publishConfirmationModal?.close();
        this.alert.add({
          type: 'success',
          title: 'Report Publish Success',
          body: 'Report publish process has started. You will receive a notification when the published report is ready.',
        });
      },
      error: () => {
        this.publishConfirmationModal?.close();
        this.alert.add({
          type: 'error',
          title: 'Report Publish Failed',
          body: 'Report publish process failed to start, please try again later.',
        });
      },
    });
  }

  public confirmUnPublish() {
    this.logger.debug('Inside ReportComponent confirmUnPublish');

    this.unPublishModal?.close();
    this.adaptReportService.unPublishReport(this.report, this.unPublishJustificationForm.get('justification')?.value)
      .subscribe({
        next: () => {
          this.alert.add({
            type: 'success',
            title: 'Report Un-Publish Success',
            body: 'Report has been un-published.',
          });
          this.router.navigate(['..', this.report.reportID], {
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

  private blockEdit() {
    const errors = getFormErrors(this.editReportForm);

    if (errors?.['reportTexts']) {
      // check we only have verified errors
      const formErrors = Object.values(errors['reportTexts']);

      return formErrors.length > 0 && !formErrors.every((err: any) => 'verified' in err);
    }

    return this.editReportForm.invalid;
  }

  public onEditSave(confirmed = false) {

    this.logger.debug('Inside ReportComponent onEditSave');

    if (!confirmed) {
      this.editConfirmationModal?.open();
      return;
    }

    this.submitted = true;

    if (this.blockEdit()) return;

    const { reportTexts, audience, slug } = this.editReportForm.getRawValue();
    // const reportEdit = structuredClone(this.report) as IReport;

    const multipleLanguageReports = (reportTexts as any[]).reduce((accum, val, index) => {
      const lang = (this.settings.getSettings().supportedLanguages || ['en'])[index];

      if (!lang) {
        throw Error('failed to get lang for editing');
      }

      const accumObject = {
        template: val,
        name: val.title, // Keeping template title and name in sync
        visibility: audience,
        slug,
        lang,
        verified: val.verified,
      };

      return Object.assign({ [lang]: accumObject }, accum);
    }, {});

    this.logger.debug('Calling editReport, editObject: ', multipleLanguageReports);

    this.adaptReportService.editReport({ reportID: this.report.reportID, languages: multipleLanguageReports }).subscribe({
      next: (report) => {

        this.logger.debug('Report edits saved');

        this.alert.add({ type: 'success', title: 'Report Save Complete', body: `Your report edits have been saved` });
        this.mode = PageMode.VIEW;

        // this.templateSubject.next(this.report.template);

        // we need to load the reports again as the status of the reports can be changed back to unpublished and we need to show it on the screen
        this.adaptReportService.loadReportList();
        this.langIndex = 0;

        const languages = this.$englishReportPageContent()!.sections![0].questions![1].options;
        this.$formLang.set(languages[this.langIndex].value);
        this.translationsGenerated = false;
        this.reportTexts.markAsPristine();

        //this.logger.debug('next calling getReport for report: ', JSON.stringify(this.report, null, 4));
        // we need to load the draft because we remove the finalized version on a successful edit
        // this.adaptReportService.getReport(this.report.reportID, 'draft').subscribe((reportData) => {
        //
        //   this.logger.debug('next getReport response: ', reportData);
        //   if (reportData && reportData?.length > 0){
        //     this.report = (reportData as IReportModel[])[0];
        //   }
        // });

        // this.router.navigate(['admin', 'reports', this.report.reportID], {
        //   queryParams: { version: 'draft' },
        //   queryParamsHandling: 'merge' // Merges new query params with existing ones
        // });

        // this.router.navigate([], {
        //relativeTo: this.route,
        //   queryParams: { version: 'draft' },
        //   queryParamsHandling: 'merge' // Merges new query params with existing ones
        // });

        this.logger.debug('Navigate back to draft version of the report');
        // Navigate to parent (reports) and pass report id for child (report) and reload the report page for this report
        this.router.navigate(['..', this.report.reportID], {
          relativeTo: this.route, // need this when navigating from a relative path
          queryParams: { version: 'draft' },
        });
      },
      error: (err) => {
        this.alert.add({
          type: 'error',
          title: 'Report Save Failed',
          body: `Your report edits failed to saved, please try again`,
        });
      },
    });

    this.editConfirmationModal?.close();
  }

  public generateTranslations() {
    this.adaptDataService
      .translateReportText(this.report.reportID, {
        title: this.reportTexts.at(0).value['title'],
        description: this.reportTexts.at(0).value['description'],
      })
      .subscribe((result) => {
        this.reportTexts.markAsDirty();
        const settings = this.settings.getSettings();
        for (const key of Object.keys(result)) {
          const idx = (settings.supportedLanguages || ['en'])?.indexOf(key as LanguageCode);

          if (idx === -1) {
            // missing translation default to english?
          }

          this.reportTexts.at(idx).setValue({ ...result[key as LanguageCode], verified: false });
        }

        const content = this.$englishReportPageContent();

        this.alert.add({ type: 'success', body: content?.actions?.['translation_successful'] || '', title: 'Success' });

        this.translationsGenerated = true;
      });
  }

  public reportLanguageChange(val: string) {
    if (this.mode !== PageMode.EDIT) {
      // update top part!!
      const languages = this.$englishReportPageContent()!.sections![0].questions![1].options;

      const index = languages.findIndex((lang) => lang.value === val);

      this.langIndex = index;
    }

    this.onFilter.next(this.filterFormGroup.value);
  }

  public get defaultReportText() {
    return this.reportTexts.at(0);
  }

  public get reportTexts() {
    return this.editReportForm.get('reportTexts') as FormArray;
  }

  public get editTitle() {
    return this.reportTexts.at(this.langIndex).get('title') as FormControl;
  }

  public get editDescription() {
    return this.reportTexts.at(this.langIndex).get('description') as FormControl;
  }

  public get editAudience() {
    return this.editReportForm.get('audience') as FormControl;
  }

  public get editSlug() {
    return this.editReportForm.get('slug') as FormControl;
  }

  public copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  public getLangLabel(delta = 1) {
    const languages = this.$languageOptions()
    const index = languages.findIndex((lang) => lang.value === this.$formLang());

    if (index === -1 || index + delta > languages.length - 1 || index + delta < 0) {
      return null;
    }

    return languages[index + delta].label;
  }

  public showVerifcationErrors() {
    const languages = this.$languageOptions()
    return languages.length > 1 && this.reportTexts.controls.some((ct) => ct.get('verified')!.hasError('required'));
  }

  public getLang(delta = 0) {
    const languages = this.$languageOptions()
    const index = languages.findIndex((lang) => lang.value === this.$formLang());
    this.$formLang.set(languages[index + delta].value);
    this.langIndex = index + delta;
  }

  onReportLangChange(event: any) {
    this.content.requestNewLanguage(this.$reportLang());
    this.templateSubject.next(this.templateSubject.value);
  }
}

const sameObjects = (obj1: { [x: string]: any }, obj2: { [x: string]: any }) => {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;

    const val1 = obj1[key];
    const val2 = obj2[key];

    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((item, i) => item === val2[i]);
    }

    return val1 === val2;
  });
};
