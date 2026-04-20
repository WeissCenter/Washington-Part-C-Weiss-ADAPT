import { Component, ElementRef, Input, ViewChild, OnInit, EventEmitter, Output } from '@angular/core';
import { DataRepService, DataRepSettings } from '../../services/data-rep.service';
import { PageContentText } from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';

@Component({
  selector: 'lib-data-rep-comparison',
  standalone: false,
  templateUrl: './data-rep-comparison.component.html',
  styleUrl: './data-rep-comparison.component.scss',
})
export class DataRepComparisonComponent implements OnInit {
  constructor(public dataRepService: DataRepService) {
    this.dataRepSettings = this.dataRepService.retreiveSettingsLocally();
  }

  dataRepSettings!: DataRepSettings;

  @ViewChild('explainationRegion') explainationRegion!: ElementRef;
  @ViewChild('explanationSwitch') explanationSwitch!: ElementRef;
  @ViewChild('dataModal') dataModal!: ElementRef;
  @ViewChild('dataModalCloseBtn') dataModalCloseBtn!: ElementRef;
  @ViewChild('dataModalSwitch') dataModalSwitch!: ElementRef;
  @ViewChild('bars') barPanel!: ElementRef;
  @ViewChild('dataTable', { static: false }) dataTable!: ElementRef;

  @Input() lang = 'en';
  @Input() localization = 'en-US';

  @Input() id = 'data-rep-comparison-' + crypto.randomUUID();
  @Input() headingLvl: 1 | 2 | 3 | 4 = 2;
  headingLvl2: 2 | 3 | 4 | 5 = (this.headingLvl + 1) as 2 | 3 | 4 | 5;
  headingLvl3: 3 | 4 | 5 | 6 = (this.headingLvl2 + 1) as 3 | 4 | 5 | 6;
  @Input() header = 'Title';
  @Input() insight = 'Description of the comparison between the two items.';

  plainLanguageMaxCount = 5;
  showGlossary = false;
  showGlossaryBtn = false;
  glossaryIdsString = '';
  shouldAnnouncePlainLanguage = false;
  isDataModalOpen = false;

  @Input() suppressed = false;
  @Input() filtered = false;
  @Input() filterClass: 'filtered' | 'suppressed' = 'filtered';

  @Input() content?: PageContentText;

  noData = false;
  @Input() noDataItemCount = 0;
  @Input() noDataSummary = '';

  @Input() comparisonItem1Label = 'Comparison Item 1';
  @Input() comparisonItem1Raw!: any;
  @Input() comparisonItem1Data: any[] = [];
  @Input() comparisonItem1Total = 0;
  comparisonItem1PlainLanguage = 'Plain Language';
  comparisonItem1NoDataSummary: any = {
    count: 0,
    summary: '',
  };

  @Input() comparisonItem2Label = 'Comparison Item 2';
  @Input() comparisonItem2Raw!: any;
  @Input() comparisonItem2Data: any[] = [];
  @Input() comparisonItem2Total = 0;
  comparisonItem2PlainLanguage = 'Plain Language';

  @Output() dataModalStateChange = new EventEmitter<boolean>();

  togglePlainLanguage() {
    this.dataRepSettings.showPlainLanguage = !this.dataRepSettings.showPlainLanguage;
    this.dataRepService.saveSettingsLocally(this.dataRepSettings);
    // Only announce when user explicitly toggles explain on.
    this.shouldAnnouncePlainLanguage = this.dataRepSettings.showPlainLanguage;
  }

  toggleGlossary() {
    this.dataRepSettings.showGlossary = !this.dataRepSettings.showGlossary;
    this.dataRepService.saveSettingsLocally(this.dataRepSettings);
  }

   openDataModal() {
    this.dataModal.nativeElement.hidden = false;
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

  ngOnInit(): void {
    if (!this.comparisonItem1Raw) {
      return;
    }
    this.header = this.comparisonItem1Raw.title ?? this.comparisonItem1Raw.name;
    this.insight = this.comparisonItem1Raw.subtitle ?? this.comparisonItem1Raw.description;
    const value = this.dataRepService.processChartData(this.comparisonItem1Raw, this.id);
    this.showGlossaryBtn = this.dataRepService.checkForDefinitions(value.data);

    this.comparisonItem1NoDataSummary = this.dataRepService.generatePlainLanguageForZeroTotalItems(
      this.comparisonItem1Raw,
      this.lang
    );

    this.comparisonItem1PlainLanguage = this.dataRepService.generatePlainLanguage(
      this.comparisonItem1Raw,
      value.total,
      this.plainLanguageMaxCount,
      this.lang,
      this.suppressed,
      `(${this.content?.actions?.['suppressed']})`
    );

    this.comparisonItem1Data = value.data;
    this.comparisonItem1Total = value.total;
    this.glossaryIdsString = value.glossaryIdsString;

    const value2 = this.dataRepService.processChartData(this.comparisonItem2Raw, this.id);

    this.comparisonItem2PlainLanguage = this.dataRepService.generatePlainLanguage(
      this.comparisonItem2Raw,
      value2.total,
      this.plainLanguageMaxCount,
      this.lang,
      this.suppressed,
      `(${this.content?.actions?.['suppressed']})`
    );

    this.comparisonItem2Data = this.dataRepService.reorderArrayToMatch(
      this.comparisonItem1Data,
      value2.data,
      this.comparisonItem1Raw.chart.xAxisValue
    );
    this.comparisonItem2Total = value2.total;
  }
}
