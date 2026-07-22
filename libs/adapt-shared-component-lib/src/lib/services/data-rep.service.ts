import { ElementRef, Injectable } from '@angular/core';
import { LanguageCode, chartExplainTemplateParse } from '@adapt/types';
import { GlossaryService } from '../services/glossary.service';
import * as XLSX from 'xlsx';
import { xlsx_delete_row } from '../util';

export interface DataRepSettings {
  showPlainLanguage: boolean;
  showGlossary: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DataRepService {
  constructor(private glossary: GlossaryService) {}

  public downloadData(
    what: 'csv' | 'xlsx',
    header: string,
    dataTable: HTMLTableElement,
    updatedLabels?: string[]
  ): void {
    // If updatedLabels are provided, update the table headers to replace "Item 1" with updatedLabels[0] and "Item 2" with updatedLabels[1]
    // Need to make a shallow copy of the dataTable to avoid modifying the original table
    const dataTableCopy = dataTable.cloneNode(true) as HTMLTableElement;
    if (updatedLabels && updatedLabels.length === 2) {
      const headers = dataTableCopy.querySelectorAll('thead th');
      if (headers.length >= 5) {
        // First column is the item name, second column is the count for item 1, third column is the percentage for item 1, fourth column is the count for item 2, and fifth column is the percentage for item 2
        headers[1].textContent = updatedLabels[0] + ' Count';
        headers[2].textContent = updatedLabels[0] + ' (%)';
        headers[3].textContent = updatedLabels[1] + ' Count';
        headers[4].textContent = updatedLabels[1] + ' (%)';
      }
    }

    const fileName = `${header}.${what}`;
    const workbook = XLSX.utils.table_to_book(dataTableCopy);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(worksheet['!ref']!);

    xlsx_delete_row(worksheet, range.e.r);

    XLSX.writeFile(workbook, fileName, { bookType: what });
  }

  retreiveSettingsLocally(): DataRepSettings {
    const settings = localStorage.getItem('adapt-data-rep-settings');
    if (settings) {
      try {
        return JSON.parse(settings) as DataRepSettings;
      } catch (e) {
        console.error('Error parsing data rep settings from localStorage:', e);
        // Return default settings if parsing fails
        return {
          showPlainLanguage: false,
          showGlossary: false,
        };
      }
    }
    // Return default settings if no settings found
    return {
      showPlainLanguage: false,
      showGlossary: false,
    };
  }

  saveSettingsLocally(dataRepSettings: DataRepSettings) {
    localStorage.setItem(
      'adapt-data-rep-settings',
      JSON.stringify(
        dataRepSettings ?? {
          showPlainLanguage: false,
          showGlossary: false,
        }
      )
    );
  }

  public mapHeadingLvl(lvl: 1 | 2 | 3 | 4 | 5 | 6): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' {
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

  public filterOrSuppress(content: any, filtered: boolean, suppressed: boolean): string {
    const suppressedText = content?.actions?.['suppressed'] || 'Suppressed';
    const filteredText = content?.actions?.['filtered'] || 'Filtered';

    if (filtered && suppressed) {
      return `(${suppressedText}, ${filteredText})`;
    } else if (filtered) {
      return `(${filteredText})`;
    } else if (suppressed) {
      return `(${suppressedText})`;
    }
    return '';
  }

  public checkForDefinitions(data: any[]): boolean {
    // Check if the data has a definition property
    return data?.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'definition');
  }

  /**
   * Set up tab-trapping logic between three elements:
   *  - backwardTrigger (e.g. toggle button)
   *  - region (e.g. expanded panel)
   *  - forwardTrigger (e.g. next button in bar)
   *
   * Returns a teardown function to remove all listeners.
   */
  public setupTabbing(
    enable: boolean,
    elements: {
      region: ElementRef;
      backwardTrigger: ElementRef;
      forwardTrigger: ElementRef;
    }
  ): () => void {
    const { region, backwardTrigger, forwardTrigger } = elements;

    // Do nothing if not enabled
    if (!enable) {
      // No teardown needed when tabbing is not enabled
      return function noop() {
        /* intentionally empty */
      };
    }

    const panelHandler = this.createPanelHandler(backwardTrigger, forwardTrigger);
    const forwardFromBtn = this.createForwardTabOnlyHandler(region);
    const backFromGlossary = this.createBackwardTabOnlyHandler(region);

    region.nativeElement.addEventListener('keydown', panelHandler);
    backwardTrigger.nativeElement.addEventListener('keydown', forwardFromBtn);
    forwardTrigger.nativeElement.addEventListener('keydown', backFromGlossary);

    return () => {
      region.nativeElement.removeEventListener('keydown', panelHandler);
      backwardTrigger.nativeElement.removeEventListener('keydown', forwardFromBtn);
      forwardTrigger.nativeElement.removeEventListener('keydown', backFromGlossary);
    };
  }

  private createPanelHandler(backwardTarget: ElementRef, forwardTarget: ElementRef): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        forwardTarget.nativeElement.focus();
      } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        backwardTarget.nativeElement.focus();
      }
    };
  }

  private createForwardTabOnlyHandler(forwardTarget: ElementRef): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        forwardTarget.nativeElement.focus();
      }
    };
  }

  private createBackwardTabOnlyHandler(backwardTarget: ElementRef): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        backwardTarget.nativeElement.focus();
      }
    };
  }

  public processChartData(rawData: any, id: string): { data: any[]; total: number; glossaryIdsString: string } {
    let data = (rawData.chart.data.length === 1 && 'value' in rawData.chart.data[0]) ? rawData.chart.data[0].value : rawData.chart.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      data = [];
      console.warn('DataRepService.processChartData: No data available to process for id:', id);
    }

    // Calculate total
    const total = data.reduce((acc: any, item: { [x: string]: any }) => acc + item[rawData.chart.yAxisValue], 0);

    // Find largest value
    const largestValue = data.reduce(
      (max: number, item: { [x: string]: number }) => Math.max(max, item[rawData.chart.yAxisValue]),
      -Infinity
    );

    // Collect a list of the unique IDs for each definition for proper ARIA labeling
    const glossaryItemIds: string[] = [];

    data = data.map(
      (
        item: {
          [x: string]: number | string | boolean;
          percentage: string | number;
          largest: boolean;
          flexAmount: number;
        },
        index: string
      ) => {
        const value = Number(item[rawData.chart.yAxisValue]);
        const totalNum = Number(total);
        item.percentage = isNaN((value / totalNum) * 100) ? '0.00' : (value / totalNum) * 100;
        item.largest = value === largestValue;
        item.flexAmount = value / largestValue;
        glossaryItemIds.push(id + '-series-item-definition-' + index);
        return item;
      }
    );
    // Sort the array from largest to smallest
    data.sort(
      (a: { [x: string]: number }, b: { [x: string]: number }) =>
        b[rawData.chart.yAxisValue] - a[rawData.chart.yAxisValue]
    );

    const glossaryIdsString = glossaryItemIds.join(' ');

    return {
      data,
      total,
      glossaryIdsString,
    };
  }

  public reorderArrayToMatch<T>(referenceArray: T[], arrayToReorder: T[], matchKey: keyof T): T[] {
    // This function reorders `arrayToReorder` to match the order of `referenceArray` based on a key.
    // It assumes that both arrays contain objects with a common key specified by `matchKey`.
    if (!referenceArray || !arrayToReorder || !matchKey) {
      return [];
    }
    const reorderMap = new Map(arrayToReorder.map((item) => [item[matchKey], item]));

    return referenceArray.map((item) => {
      const match = reorderMap.get(item[matchKey]);
      if (!match) {
        console.warn(`No match found for key: ${item[matchKey]}`);
      }
      return match!;
    });
  }

  public generatePlainLanguage(data: any, total: number, maxCount: number, lang: string, suppressed: boolean, suppressedText = 'Suppressed') {
    const sumValue = data.chart.yAxisValue === data.chart.groupBy ? data.chart.xAxisValue : data.chart.yAxisValue;

    // TODO: replace with elegant solution to the data-rep vs data-rep-comparison component
    if (data.chart.data.length === 1 && 'value' in data.chart.data[0]) {
      // console.warn('DataRepService.generatePlainLanguage: data.chart.data is an array of objects with a single value');
      // If the data is an array of objects with a single value, we need to handle it differently
      data.chart.data = data.chart.data[0].value;
    }

    // Sort the data by the 'sumValue' in descending order to get the top items
    data.chart.data.sort((a: { [x: string]: number }, b: { [x: string]: number }) => b[data.chart.yAxisValue] - a[data.chart.yAxisValue]);
    // Slice the array to include only the top items as per plainLanguageMaxCount
    const topItems = data.chart.data.slice(0, maxCount);

    // get the fileSpec associated with the data in the case of fileSpec specific glossaryTerm
    const fileSpec = this.getFileSpecFromBarChartContent(data);

    // Convert each item into a plain language string
    const plainLanguageItems = topItems.map((item: { [x: string]: string }) => {
      // Convert the value to a percentage string with two decimal places
      const percentageResult =
        (Number(item[data.chart.yAxisValue]) /
          data.chart.data.reduce(
            (acc: any, cur: { [x: string]: any }) => acc + Number(cur[data.chart.yAxisValue]),
            0
          )) *
        100;
      
      const percentage = isNaN(percentageResult) ? '0.00' : percentageResult.toFixed(2);

      // console.log(this.glossary.getTermSafe(item[this.raw.chart.xAxisValue], undefined, this.lang as LanguageCode))

      // Format the string with the label and the percentage
      return `${this.glossary.getGlossaryTerm(item[data.chart.xAxisValue], lang as LanguageCode, fileSpec).label} (${percentage}%)`;
    });

    const explainTemplate = data?.explainTemplate as string;

    return chartExplainTemplateParse(
      data.chart.xAxisValue,
      total,
      sumValue,
      data.chart.data,
      explainTemplate,
      plainLanguageItems,
      suppressed,
      suppressedText
    );
  }

  generatePlainLanguageForZeroTotalItems(data: any, lang: string, noDataContent: string = 'Data is not collected for this category in your State.'): { count: number; summary: string } {
    // Build a plain language sentence detailing which items have no data to show when suppression is off, but items still have no data
    // Get items with no data
    const noDataItems = data.chart.data.filter((item: { [x: string]: number }) => item[data.chart.yAxisValue] <= 0);
    const noDataItemCount = noDataItems.length;
    if (data.chart.data.length === 0) {
      return {
        count: 0,
        summary: noDataContent,
      };
    }

    let noDataSummary = '';
    // Get the plain language label for each item

    // attempt to get the filespec associated with the data in the case of fileSpec specific glossaryTerm
    const fileSpec = this.getFileSpecFromBarChartContent(data);

    const plainLanguageItems = noDataItems.map((item: { [x: string]: string }) => this.glossary.getGlossaryTerm(item[data.chart.xAxisValue], lang as LanguageCode, fileSpec).label);
    if (plainLanguageItems.length > 2) {
      // Join all items with commas, but the last item with 'and'
      const allButLast = plainLanguageItems.slice(0, -1).join(', ');
      const lastItem = plainLanguageItems[plainLanguageItems.length - 1];
      noDataSummary += `${allButLast}, and ${lastItem}`;
    } else if (plainLanguageItems.length === 2) {
      // No comma, just 'and'
      noDataSummary += `${plainLanguageItems[0]} and ${plainLanguageItems[1]}`;
    } else if (plainLanguageItems.length === 1) {
      // If there's only one item, just add it
      noDataSummary += `${plainLanguageItems[0]}`;
    }
    if (noDataSummary) noDataSummary += '.';

    return {
      count: noDataItemCount,
      summary: noDataSummary,
    };
  }

  public getFileSpecFromBarChartContent(content: any): string | undefined {
    // attempt to get the filespec associated with the data in the case of fileSpec specific glossaryTerm
    let fileSpec = undefined;
    if (content && content.fileSpec) {
      fileSpec = content.fileSpec;
    } else if (content && content.chart.dataRetrievalOperations && content.chart.dataRetrievalOperations.length === 1 && content.chart.dataRetrievalOperations[0].arguments) {
      // find the filespec inside of arguments where field is ReportCode
      const reportCodeValue = content.chart.dataRetrievalOperations[0].arguments.find((arg: any) => arg.field === 'ReportCode')?.value;
      const formattedReportCodeValue = Array.isArray(reportCodeValue) ? reportCodeValue[0] : reportCodeValue;
      fileSpec = formattedReportCodeValue;

      // remove leading 'c' character from filespec if present
      fileSpec = fileSpec?.replace(/^[cC]/, '');
    } else {
      console.warn('No fileSpec or ReportCode found in content');
    }
    return fileSpec;
  }
}
