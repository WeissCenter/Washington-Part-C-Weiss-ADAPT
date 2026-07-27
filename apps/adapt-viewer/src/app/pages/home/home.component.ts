import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, NgZone, OnInit } from '@angular/core';

import { QuestionContentText } from '../../models/content-text.model';
import { ViewerPagesContentService } from '../../services/content/viewer-pages-content.service';
import { AdaptDataService } from '../../services/adapt-data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IReportModel } from '@adapt/types';

@Component({
  selector: 'adapt-viewer-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  $content = this.viewerPagesContentService.viewerContent$$.value;

  $selFreqAskedQuestions = computed(() => {
    const shared = this.viewerPagesContentService.$sharedContent();
    if (!shared) return [];
    // now get the selected frequently asked questions
    return shared.frequentlyAskedQuestions.categories.flatMap((c) => {
      const qList = c.questions.filter((q) => q.addToLanding === true);

      return qList.map((q) => {
        return ({
          ...q,
          categoryName: c.name,
        } as QuestionContentText);
      });
    });
  });

  reportsLoadedComplete: boolean = false;
  reports$$ = this.adaptDataService.reports$$;
  latestReports$$ = computed(() => (this.reports$$.value().sort((a, b) => Number(b.published) - Number(a.published)).slice(0, 5) as IReportModel[]));

  ready = computed(() => {
    return !this.viewerPagesContentService.viewerContent$$.isLoading() && !this.reports$$.isLoading();
  });

  constructor(
    public viewerPagesContentService: ViewerPagesContentService,
    private adaptDataService: AdaptDataService,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {

    this.route.params.subscribe((params) => {
      if ('slug' in params) {
        this.adaptDataService.loadSharedReport(params['slug'] as string).subscribe((result) => {
          this.router.navigate(['reports', result.reportSlug], {
            state: { filters: result.filters, page: result.tabIndex },
          });
        });
      }
    });
  }

  /*

  comparisonContent = {
    title: 'Comparison mode',
    description: `Evaluate school districts side-by-side and compare how data points differ between the two.`,
    compareButtonLabel: 'Generate Comparison',
    cancelButtonLabel: 'Cancel',
    triggerButtonLabel: 'Compare',
    comparison1Label: 'Comparison item 1',
    comparison2Label: 'Comparison item 2',
    validationMessages: {
      required: 'All fields are required.',
    },
  };


  comparisonOptions = [
    {
      label: 'Bentonville School District',
      value: 'bentonville',
    },
    {
      label: 'Fayetteville School District',
      value: 'fayetteville',
    },
    {
      label: 'Springdale School District',
      value: 'springdale',
    },
    {
      label: 'Rogers School District',
      value: 'rogers',
    },
  ];

   */

  comparisonData = [
    {
      label: 'Bentonville School District',
      value: 'bentonville',
      raw:
        {
          dataLabel: 'Education Environment',
          description:
            'The following shows the distribution of children, 5-21, with disabilities in various Educational Environments in your State.',
          explainTemplate:
            'In the reported data, the top three Educational Environments categories students are in with disabilities in your State are, {{first}}, {{second}}, and {{third}}.',
          noDataDescription:
            "Unfortunately, there is no data to display for this section. This is due to how the Office of Special Education Programs (OSEP) requires the State's data to be organized.",
          title: 'Educational Environments',
          chart: {
            yAxisLabel: 'Child Count',
            xAxisLabel: 'IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE',
            filterOn: 'x',
            xAxisValue: 'IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE',
            yAxisValue: 'StudentCount',
            data: [
              {
                StudentCount: 0,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC39',
                suppressed: false,
                percentage: 12.711279124713752,
                largest: true,
                flexAmount: 1,
              },
              {
                StudentCount: 3483,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'HH',
                suppressed: false,
                percentage: 12.660390389298826,
                largest: false,
                flexAmount: 0.9959965684872748,
              },
              {
                StudentCount: 3470,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC80',
                suppressed: false,
                percentage: 12.613136563556395,
                largest: false,
                flexAmount: 0.9922790963683157,
              },
              {
                StudentCount: 3446,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'CF',
                suppressed: false,
                percentage: 12.525898731416524,
                largest: false,
                flexAmount: 0.9854160709179296,
              },
              {
                StudentCount: 3421,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'SS',
                suppressed: false,
                percentage: 12.435025989604158,
                largest: false,
                flexAmount: 0.9782670860737775,
              },
              {
                StudentCount: 3412,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC79TO40',
                suppressed: false,
                percentage: 12.402311802551706,
                largest: false,
                flexAmount: 0.9756934515298827,
              },
              {
                StudentCount: 3392,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RF',
                suppressed: false,
                percentage: 12.329613609101814,
                largest: false,
                flexAmount: 0.9699742636545611,
              },
              {
                StudentCount: 3390,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'PPPS',
                suppressed: false,
                percentage: 12.322343789756825,
                largest: false,
                flexAmount: 0.9694023448670289,
              },
            ],
            total: 27511,
            subTotals: [
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC39',
                sum: 0,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'HH',
                sum: 3483,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC80',
                sum: 3470,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'CF',
                sum: 3446,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'SS',
                sum: 3421,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC79TO40',
                sum: 3412,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RF',
                sum: 3392,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'PPPS',
                sum: 3390,
              },
            ],
          },
        },
    },
    {
      label: 'Fayetteville School District',
      value: 'fayetteville',
      raw:
        {
          dataLabel: 'Education Environment',
          description:
            'The following shows the distribution of children, 5-21, with disabilities in various Educational Environments in your State.',
          explainTemplate:
            'In the reported data, the top three Educational Environments categories students are in with disabilities in your State are, {{first}}, {{second}}, and {{third}}.',
          noDataDescription:
            "Unfortunately, there is no data to display for this section. This is due to how the Office of Special Education Programs (OSEP) requires the State's data to be organized.",
          title: 'Educational Environments',
          chart: {
            yAxisLabel: 'Child Count',
            xAxisLabel: 'IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE',
            filterOn: 'x',
            xAxisValue: 'IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE',
            yAxisValue: 'StudentCount',
            data: [
              {
                StudentCount: 6497,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC39',
                suppressed: false,
                percentage: 12.711279124713752,
                largest: true,
                flexAmount: 1,
              },
              {
                StudentCount: 7483,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'HH',
                suppressed: false,
                percentage: 12.660390389298826,
                largest: false,
                flexAmount: 0.9959965684872748,
              },
              {
                StudentCount: 7470,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC80',
                suppressed: false,
                percentage: 12.613136563556395,
                largest: false,
                flexAmount: 0.9922790963683157,
              },
              {
                StudentCount: 6446,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'CF',
                suppressed: false,
                percentage: 12.525898731416524,
                largest: false,
                flexAmount: 0.9854160709179296,
              },
              {
                StudentCount: 7421,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'SS',
                suppressed: false,
                percentage: 12.435025989604158,
                largest: false,
                flexAmount: 0.9782670860737775,
              },
              {
                StudentCount: 6412,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC79TO40',
                suppressed: false,
                percentage: 12.402311802551706,
                largest: false,
                flexAmount: 0.9756934515298827,
              },
              {
                StudentCount: 6392,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RF',
                suppressed: false,
                percentage: 12.329613609101814,
                largest: false,
                flexAmount: 0.9699742636545611,
              },
              {
                StudentCount: 5390,
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'PPPS',
                suppressed: false,
                percentage: 12.322343789756825,
                largest: false,
                flexAmount: 0.9694023448670289,
              },
            ],
            total: 27511,
            subTotals: [
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC39',
                sum: 6497,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'HH',
                sum: 7483,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC80',
                sum: 7470,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'CF',
                sum: 6446,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'SS',
                sum: 7421,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RC79TO40',
                sum: 6412,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'RF',
                sum: 6392,
              },
              {
                IDEAEDUCATIONALENVIRONMENTFORSCHOOLAGE: 'PPPS',
                sum: 5390,
              },
            ],
          },
        },
    },
    {
      label: 'Springdale School District',
      value: 'springdale',
      reports: [
        {
          title: 'Child Count and Settings by Age',
          data: [
            { label: 'Home', value: 78901 },
            { label: 'Community-based setting', value: 2345 },
            { label: 'Other setting', value: 6789 },
          ],
        },
        {
          title: 'Child Count by Gender',
          data: [
            { label: 'Male', value: 12345 },
            { label: 'Female', value: 17890 },
          ],
        },
      ],
    },
    {
      label: 'Rogers School District',
      value: 'rogers',
      reports: [
        {
          title: 'Child Count and Settings by Age',
          data: [
            { label: 'Home', value: 45678 },
            { label: 'Community-based setting', value: 1234 },
            { label: 'Other setting', value: 5678 },
          ],
        },
        {
          title: 'Child Count by Gender',
          data: [
            { label: 'Male', value: 23456 },
            { Label: 'Female', value: 34567 },
          ],
        },
      ],
    },
  ];

  comparisonTextContent = {
    suppressionWarning: {
      heading: 'How are we protecting the children’s privacy?',
      description:
        'Specific data has been suppressed to protect the privacy of individuals in accordance with FERPA guidelines. Details that could lead to the identification of individuals in small population groups are not disclosed. ',
    },
    quickSummary: {
      header: 'Quick Summary',
    },
    filterPopup: {
      header: 'Filters Applied',
      description: 'There are {{filter_count}} filters applied across {{category_count}} categories.',
    },
    dataRepModal: {
      description:
        'Specific data has been suppressed to protect the privacy of individuals in accordance with FERPA guidelines. Details that could lead to the identification of individuals in small population groups are not disclosed.',
    },
    actions: {
      close_button: 'Close',
      explain: 'Explain',
      glossary: 'Glossary',
      success: 'Success',
      share: 'share',
      percent: 'Percent (%)',
      download_csv: 'Download CSV',
      download_excel: 'Download Excel (XLSX)',
      value_label: 'Value',
      filter: 'Filter',
      note: 'Note:',
      section_unavailable: 'This Section is Unavailable.',
      of: 'of',
      verified: 'Verified',
      selected: 'selected',
      filter_description: 'Make your filtering selections and hit apply.',
      filter_controls_description: 'Hit apply to save your changes.',
      apply_and_close: 'Apply And Close',
      reset: 'Reset',
      cancel: 'Cancel',
      open_filter_panel: 'Open Filter Panel',
      reset_all_filters: 'Reset All Filters',
      plain_language_summary: 'Plain language summary',
      data: 'Data',
      preset_hint:
        'Please note: Due to how the data is organized, custom filtering is limited to the preset options provided below.',
      filter_groups: 'Choose from the preset filter groups below to customize your report.',
      suppressed: 'Suppressed',
      filtered: 'Filtered',
      close: 'Close',
      total_label: 'Total',
    },
  };

  comparisonMode = false;
  comparisonSelection: any = {};

  onComparisonSelection(event: any) {
    this.comparisonSelection = {
      comparison1: event[0],
      comparison2: event[1],
    };
    this.comparisonMode = true;
    // Find the data for the selected comparisons
    const comparison1Data = this.comparisonData.find(
      (item) => item.value === this.comparisonSelection.comparison1.value
    );
    const comparison2Data = this.comparisonData.find(
      (item) => item.value === this.comparisonSelection.comparison2.value
    );
     this.comparisonSelection.comparison1.data = comparison1Data ? comparison1Data.raw : null;
     this.comparisonSelection.comparison2.data = comparison2Data ? comparison2Data.raw : null;
    console.log('Comparison selection changed:', event);
    console.log('Comparison selection:', this.comparisonSelection);
  }

  ngOnInit() {}
}
