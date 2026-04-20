import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  signal,
  effect,
  ViewChild,
  ViewEncapsulation,
  Signal,
} from '@angular/core';
import { GlossaryService } from '../../services/glossary.service';
import * as XLSX from 'xlsx';

import { chartExplainTemplateParse, handleDynamicVariables, LanguageCode } from '@adapt/types';
import { xlsx_delete_row } from '../../util';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PageContentText } from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';

interface ChartDataItem {
  [key: string]: string | number;
}

@Component({
  selector: 'lib-adapt-data-rep-grouped',
  standalone: false,
  templateUrl: './data-rep-grouped.component.html',
  styleUrls: ['./data-rep-grouped.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DataRepGroupedComponent implements OnInit {
  @ViewChild('explainationRegion') explainationRegion!: ElementRef;
  @ViewChild('explanationSwitch') explanationSwitch!: ElementRef;
  @ViewChild('dataModal') dataModal!: ElementRef;
  @ViewChild('dataModalCloseBtn') dataModalCloseBtn!: ElementRef;
  @ViewChild('dataModalSwitch') dataModalSwitch!: ElementRef;
  @ViewChild('bars') barPanel!: ElementRef;
  @ViewChild('dataTable', { static: false }) dataTable!: ElementRef;

  @Output() dataModalStateChange = new EventEmitter<boolean>();

  @Input() raw: any;
  @Input() content?: PageContentText | null = null;
  @Input() suppressed = false;
  @Input() noData = false;
  @Input() lang = 'en';

  @Input() rawDataType = 'normal';

  @Input() id = crypto.randomUUID();

  @Input() filtered = false;
  @Input() filterClass: 'filtered' | 'suppressed' = 'filtered';
  @Input() headingLvl: 1 | 2 | 3 | 4 = 2;
  headingLvl2: 2 | 3 | 4 | 5 = (this.headingLvl + 1) as 2 | 3 | 4 | 5;

  public noDataItemCount = 0;
  public noDataSummary = '';
  shouldAnnouncePlainLanguage = false;
  isDataModalOpen = false;

  $fileSpec = computed(() => this.raw.fileSpec);

  $currentFilter = signal('all');
  $currentSection = signal('all');
  $header = computed(() => (this.$currentFilter() === 'all' ? this.raw.title || this.raw.name : this.$currentFilter()));
  $sumValue = signal('');
  $currentFilterIdx = signal(0);
  $rawChartDataAtIdx = computed(() => this.raw.chart.data[this.$currentFilterIdx()]);

  $currentFilterIsAll = computed(() => this.$currentFilter() === 'all');

  $filterBy = computed(() =>
    Array.isArray(this.raw.chart['filterBy'])
      ? this.raw.chart['filterBy'][this.$currentFilterIdx()]
      : this.raw.chart['filterBy']
  );

  // Un-suppressed Total
  $selectedTotal = computed(() => {
    if (this.$currentFilter() === 'all') {
      return this.$dataTotal();
    }

    // handle the case where the data is grouped by a filter
    return this.$rawChartDataAtIdx().value.reduce((acc: any, item: any) => {
      if (item[this.$filterBy()] === this.$currentFilter()) {
        return acc + item[this.$sumValue()];
      }
      return acc;
    }, 0);
  });

  $currentSectionDataIdMap = computed(() => {
    const dataIDMap = this.raw.chart.data.reduce(
      (accum: any, value: any) => Object.assign(accum, { [value.id]: value.value }),
      {}
    );
    if (this.$currentFilter() === 'all') {
      return dataIDMap[this.raw.chart.data[this.$currentFilterIdx()].id];
    }
    return dataIDMap[this.$currentSection()];
  });

  $largestValue = computed(() => {
    const { yAxisValue } = this.raw.chart;
    return this.$currentSectionDataIdMap().reduce((max: any, item: any) => Math.max(max, item[yAxisValue]), -Infinity);
  });

  $unsortedData: Signal<any[]> = computed(() => {
    const { groupBy, yAxisValue } = this.raw.chart;
    let unmappedData: any = [];
    if (this.$currentFilter() === 'all') {
      // Generate consolidated "all" view
      const consolidatedData = this.consolidateData(this.$currentSectionDataIdMap(), groupBy, this.$sumValue());
      unmappedData = Object.values(consolidatedData);
    } else {
      unmappedData = this.$rawChartDataAtIdx().value.filter(
        // (itm: any) => itm[this.raw.chart.filterBy] === this.$currentFilter()
        (itm: any) => itm[this.$filterBy()] === this.$currentFilter()
      );
    }
    return unmappedData.map((item: any, index: any) => {
      item.percentage = (item[yAxisValue] / this.$selectedTotal()) * 100;
      item.largest = item[yAxisValue] === this.$largestValue();
      item.flexAmount = item[yAxisValue] / this.$largestValue();
      return item;
    });
  });

  $glossaryIdsString = computed(() => {
    const glossaryItemIds: string[] = [];
    this.$unsortedData().forEach((item: any, index: any) => {
      glossaryItemIds.push(this.id + 'series-item-definition-' + index);
    });
    return glossaryItemIds.join(' ');
  });

  $data = computed(() => {
    const dataToSort = [...this.$unsortedData()];
    dataToSort.sort((a: any, b: any) => {
      const primarySort = b[this.raw.chart.yAxisValue] - a[this.raw.chart.yAxisValue];
      if (primarySort !== 0) {
        return primarySort;
      }
      return a[this.raw.chart.groupBy].localeCompare(b[this.raw.chart.groupBy], undefined, { numeric: true });
    });
    return dataToSort;
  });

  $filteredData = computed(() => {
    if (this.suppressed) {
      return this.$data()
    }
    return this.$data().filter((item: any) => item[this.raw.chart.yAxisValue] > 0);
  });

  $dataTotal = computed(() => {
    // eslint-disable-next-line no-prototype-builtins
    if (this.$rawChartDataAtIdx().hasOwnProperty('total')) {
      return this.$rawChartDataAtIdx().total;
    }
    return this.$rawChartDataAtIdx().value.reduce((acc: any, item: any) => acc + item[this.$sumValue()], 0);
  });

  $plainLanguage = computed(() => {
    // const items = this.$data();
    const plainLanguageItems = this.$data().flatMap((item: any) => {
      // Convert the value to a percentage string with two decimal places
      const percentageResult =
        (item[this.raw.chart.yAxisValue] /
          // items.reduce((acc: any, cur: { [x: string]: any }) => acc + cur[this.raw.chart.yAxisValue], 0)) *
          this.$selectedTotal()) *
        100;
      const plainLanguage = this.glossary.getGlossaryTermSignal(item[this.raw.chart.groupBy], 'en', this.raw?.fileSpec)().label;
      if (this.suppressed && (isNaN(percentageResult) || percentageResult === 0)) {
        return `${plainLanguage} (${this.content?.actions?.['suppressed'] || 'Suppressed'})`;
      }

      if (isNaN(percentageResult) || percentageResult === 0) {
        return `${plainLanguage} (0%)`;
      }

      return `${plainLanguage} (${percentageResult.toFixed(2) || 0}%)`;
    });
    const explainTemplate = this.raw?.explainTemplate as string;

    return chartExplainTemplateParse(
      this.raw.chart.xAxisValue,
      this.$selectedTotal(),
      this.$sumValue(),
      this.$data(),
      explainTemplate,
      plainLanguageItems,
      this.suppressed,
      this.content?.actions?.['suppressed'] || 'Suppressed'
    );
  });

  actuallyNoData = false;

  $insight = computed(() => {
    if (this.$data().length === 0) {
      this.actuallyNoData = true;
      return this.content?.actions?.['report-filter-no-data'] || 'FIXME: report-filter-no-data';
    }
    this.actuallyNoData = false;
    if (this.raw.descriptionTemplate) {
      const parseRegex = /{{(.+?)}}/g;
      const suppress = this.suppressed && this.$selectedTotal() === 0;

      return this.raw.descriptionTemplate.replaceAll(parseRegex, (match: string, code: string) => {
        if (code === 'total') {
          // handle suppressing the total if necessary
          if (suppress) {
            return '';
            // return this.content?.actions?.['suppressed'] || 'Suppressed';
          }
          return this.$selectedTotal();
        } else if (code === 'percentage') {
          // handle suppressing the percentage if necessary
          if (suppress) {
            return this.content?.actions?.['suppressed'] || 'Suppressed';
          }
          const percentage = (this.$selectedTotal() / this.$dataTotal()) * 100 || 0;
          return `${percentage.toFixed(2)}%`;
        } else if (code === 'filter') {
          const glossaryTerm = this.glossary.getGlossaryTerm(this.$currentFilter(), this.lang as LanguageCode, this.raw?.fileSpec)?.label;
          return this.$currentFilterIsAll() ? this.raw.allMap : `${this.raw.prefix || ''} ${glossaryTerm}`;
        }
        // handle dynamic variables; assume the format is in {variable-name}-{type} type can be total/percentage for now
        return (
          handleDynamicVariables(
            code,
            this.$sumValue(),
            this.raw.chart.xAxisValue,
            this.$data(),
            this.$selectedTotal(),
            this.suppressed,
            this.content?.actions?.['suppressed'] || 'Suppressed'
          )
        );
      });
    }
    return this.raw.subtitle ?? this.raw.description;
  });

  $noDataItems = computed(() => {
    // Get items with no data
    if (this.suppressed) {
      return [];
    }
    const noDataItems = this.$data().filter((item) => item[this.raw.chart.yAxisValue] <= 0 && !item['suppressed']);
    return noDataItems;
  });

  $noDataSummary = computed(() => {
    let noDataSummary = ''; // reset message
    // Build a plain language sentence detailing which items have no data to show when suppression is off, but items still have no data
    // Get items with no data
    // Get the plain language label for each item
    const plainLanguageItems = this.$noDataItems().map((item) => this.glossary.getGlossaryTermSignal(item[this.raw.chart.groupBy], this.lang as LanguageCode, this.raw?.fileSpec)().label);
    if (plainLanguageItems.length > 2) {
      // Join all items with commas, but the last item with 'and'
      const allButLast = plainLanguageItems.slice(0, -1).join(', ');
      const lastItem = plainLanguageItems[plainLanguageItems.length - 1];
      noDataSummary += `${allButLast}, and ${lastItem}`;
    } else if (plainLanguageItems.length === 2) {
      // No comma, just 'and'
      noDataSummary += `${plainLanguageItems[0]} or ${plainLanguageItems[1]}`;
    } else if (plainLanguageItems.length === 1) {
      // If there's only one item, just add it
      noDataSummary += `${plainLanguageItems[0]}`;
    }
    noDataSummary += '.';
    return noDataSummary;
  });

  $showNoData = computed(() => {
    // Never show no data message if the data is suppressed
    if (this.suppressed) {
      return false;
    }

    // Show no data message if there are items with no data and suppression is off
    if (this.$noDataItems().length > 0 && !this.suppressed) {
      return true;
    }
    return false;
  });

  public expanded = true;

  quickFilters: Record<string, { filters: string[]; metadata: { sectionName: string; filterOptions?: string[] } }> = {};

  plainLanguageMaxCount = 5;
  showGlossary = false;
  showGlossaryBtn = false;
  glossaryIdsString = '';
  dataRepSettings = {
    showPlainLanguage: false,
    showGlossary: false,
  };

  description = '';

  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private focusableElementsString =
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable], li[tabindex="0"], li[tabindex="-1"], tr[tabindex="0"], tr[tabindex="-1"]';

  localization = 'en-US';

  constructor(private glossary: GlossaryService) {
    // TODO: Fix this settings to not be set on a global level
    const saved = JSON.parse(localStorage.getItem('adapt-data-rep-settings') || '{}');
    if (saved.showPlainLanguage || saved.showGlossary) this.dataRepSettings = saved;

    // effect(() => {
    //   console.group('effect');
    //   console.log(this.raw);
    //   console.log('currentFilterIdx', this.$currentFilterIdx());
    //   console.log('currentSection', this.$currentSection());
    //   console.log('$currentFilter', this.$currentFilter());
    //   console.log('$filterBy', this.$filterBy())
    //   console.log('$currentSectionDataIdMap', this.$currentSectionDataIdMap());
    //   console.log('$data', this.$data());
    //   console.log('$total', this.$selectedTotal());
    //   console.log('$plainLanguage', this.$plainLanguage());
    //   console.log('$insight', this.$insight());
    //   console.log('$noDataSummary', this.$noDataSummary());
    //   console.log('$noDataItems', this.$noDataItems());
    //   console.groupEnd();
    // });
  }

  mapHeadingLvl(lvl: 1 | 2 | 3 | 4 | 5 | 6) {
    switch (lvl) {
      case 1:
        return 'h1';
      case 2:
        return 'h2';
      case 3:
        return 'h3';
      case 4:
        return 'h4';
      case 5:
        return 'h5';
      case 6:
        return 'h6';
    }
  }

  saveSettingsLocally() {
    localStorage.setItem(
      'adapt-data-rep-settings',
      JSON.stringify(
        this.dataRepSettings ?? {
          showPlainLanguage: false,
          showGlossary: false,
        }
      )
    );
  }

  // This function is used to convert an array of objects into an array of label/value objects for the dmeo on 11/13/23
  mapToLabelValueArray(array: any[]) {
    return array.map((item) => {
      let label = '';
      let value = 0;
      const definition = 'Pipe in definition here';

      Object.keys(item).forEach((key) => {
        if (typeof item[key] === 'string') {
          label = item[key];
        } else if (typeof item[key] === 'number') {
          value = item[key];
        }
      });

      return { label, value, definition };
    });
  }

  public onGroupSelect(filter: any, idx: number) {
    const prevSection = this.$currentSection();

    if (this.$currentFilterIdx() === idx) return (this.expanded = !this.expanded);

    this.expanded = true;
    this.$currentFilterIdx.set(idx);
    this.$currentSection.set(filter.key);
    this.$currentFilter.set('all');

    if (prevSection !== filter.key) {
      this.processData();
    }

    return;
  }

  noSort() {
    return 0;
  }

  processData(currentSection?: string) {
    const { groupBy, xAxisValue, yAxisValue } = this.raw.chart;
    const sumValue = yAxisValue === groupBy ? xAxisValue : yAxisValue;
    // set sumValue to trigger the generation of
    this.$sumValue.set(sumValue);

    this.$currentSection.set(currentSection ?? this.$rawChartDataAtIdx().id);
  }

  private consolidateData(data: any[], groupBy: string, sumValue: string) {
    // Group the data by the specified key (groupby) and sum the values (sumValue)
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data provided for consolidation');
      return [];
    }

    return data.reduce((acc: any, item: any) => {
      const key = item[groupBy];

      if (!acc[key]) {
        acc[key] = { ...item, [groupBy]: key, [sumValue]: 0 };
      }
      acc[key][sumValue] += item[sumValue];
      // console.log(acc);
      return acc;
    }, {} as Record<string, any>);
  }

  togglePlainLanguage() {
    this.dataRepSettings.showPlainLanguage = !this.dataRepSettings.showPlainLanguage;
    this.saveSettingsLocally();
    // Only announce when user explicitly toggles explain on.
    this.shouldAnnouncePlainLanguage = this.dataRepSettings.showPlainLanguage;
  }

  toggleGlossary() {
    this.dataRepSettings.showGlossary = !this.dataRepSettings.showGlossary;
    this.saveSettingsLocally();
  }

  openDataModal() {
    this.dataModal.nativeElement.hidden = false;
    // const focusableElements = this.dataModal.nativeElement.querySelectorAll(
    //   this.focusableElementsString
    // ) as NodeListOf<HTMLElement>;
    // this.firstFocusableElement = focusableElements[0];
    // this.lastFocusableElement = focusableElements[focusableElements.length - 1];

    this.dataModalCloseBtn.nativeElement.focus();
    this.dataModal.nativeElement.addEventListener('keydown', this.trapTabKey);
    this.isDataModalOpen = true;
    this.dataModalStateChange.emit(true);
  }

  trapTabKey = (event: KeyboardEvent) => {
    // const deepActiveElement = document.activeElement;

    if (event.key === 'Tab') {
      // if (event.shiftKey) {
      //   /* shift + tab */
      //   if (deepActiveElement === this.firstFocusableElement) {
      //     event.preventDefault();
      //     this.lastFocusableElement!.focus();
      //   }
      // } else {
      //   /* tab */
      //   if (deepActiveElement === this.lastFocusableElement) {
      //     event.preventDefault();
      //     this.firstFocusableElement!.focus();
      //   }
      // }
    } else if (event.key === 'Escape') {
      this.closeModal();
    }
  };

  closeModal() {
    this.dataModal.nativeElement.hidden = true;
    this.dataModal.nativeElement.removeEventListener('keydown', this.trapTabKey);
    this.isDataModalOpen = false;
    this.dataModalSwitch.nativeElement.focus(); // Return focus to the element that opened the modal
    this.dataModalStateChange.emit(false);
  }

  applyQuickFilter(filter: string) {
    // Be sure the filter has no quotes around it
    // For some reason trying to use the pipe here is giving injection errors, so we'll just do it manually
    const trimmed = filter.trim();
    const match = trimmed.match(/^(['"])(.*)\1$/);
    this.$currentFilter.set(match ? match[2] : trimmed);
    this.processData(this.$currentSection());
  }

  ngOnInit(): void {
    // this.$header.set(this.raw.title || this.raw.name);
    this.processData();

    const sortFilters = (data: any, idx: any) => {
      const newFilters = Array.from(
        new Set(
          data.map(
            (item: ChartDataItem) =>
              item[Array.isArray(this.raw.chart.filterBy) ? this.raw.chart.filterBy[idx] : this.raw.chart.filterBy]
          )
        ),
        (value) => String(value)
      ).sort(
        (a, b) =>
          Number(/^[0-9]/.test(a)) - Number(/^[0-9]/.test(b)) || a.localeCompare(b, undefined, { numeric: true })
      );

      return newFilters;
    };

    this.quickFilters = this.raw.chart.data.reduce(
      (accum: any, val: any, idx: number) =>
        Object.assign(accum, { [val.id]: { filters: sortFilters(val.value, idx), metadata: val.metadata } }),
      {}
    );
  }

  public downloadData(what: 'csv' | 'xlsx') {
    const fileName = `${this.$header()}.${what}`;
    const workbook = XLSX.utils.table_to_book(this.dataTable.nativeElement);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(worksheet['!ref']!);

    xlsx_delete_row(worksheet, range.e.r);

    XLSX.writeFile(workbook, fileName, { bookType: what });
  }

  public isNoData() {
    if (this.suppressed) {
      // If the data is suppressed, we don't want to show the no data message
      return false;
    } else {
      if (this.$currentFilter() === 'all') {
        return this.$selectedTotal() === 0;
      }
      return this.$noDataItems().length > 0 || this.$rawChartDataAtIdx().total === 0;
    }
  }

  public get filterOrSuppress() {
    const filtered = this.filtered || this.$currentFilter() !== 'all';
    if (filtered && this.suppressed) {
      return `(${this.content?.actions?.['suppressed']}, ${this.content?.actions?.['filtered']})`;
    } else if (filtered) {
      return `(${this.content?.actions?.['filtered']})`;
    } else if (this.suppressed) {
      return `(${this.content?.actions?.['suppressed']})`;
    }
    return '';
  }

  currentFilterIsAllOrValue(value: string) {
    return this.$currentFilter() === 'all' || this.$currentFilter() === value;
  }

  suppressedItem(item: any) {
    if (!this.suppressed) {
      return false;
    }
    return (
      ('value' in item && item.value === 0) ||
      ('suppressed' in item && item.suppressed) ||
      ('percentage' in item && (item.percentage === 0 || isNaN(item.percentage)))
    )
  }
}
