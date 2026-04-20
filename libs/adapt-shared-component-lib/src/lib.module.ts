import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { RouterModule } from '@angular/router';
import { GlossaryPipe, OkinaPipe, PaginatePipe } from './lib/pipes';
import { EditableDirective } from './lib/directive';
import { DataRepGroupedComponent } from './lib/report-components/data-rep-grouped/data-rep-grouped.component';
import { ModalComponent } from './lib/components/modal/modal.component';
import { HElementComponent } from './lib/components/h-element/h-element.component';
import { DataRepComponent } from './lib/report-components/data-rep/data-rep.component';
import { PaginationComponent } from './lib/components/pagination/pagination.component';
import { GridViewComponent } from './lib/report-components/grid-view/grid-view.component';
import { ReportConditionPipe } from './lib/pipes/report-condition.pipe';
import { QuickSummaryComponent } from './lib/report-components/quick-summary/quick-summary.component';
import { AccordionComponent } from './lib/components/accordion/accordion.component';
import { BreadcrumbComponent } from './lib/components/breadcrumb/breadcrumb.component';
import { ComboBoxComponent } from './lib/form-components/combo-box/combo-box.component';
import { ConfirmModalComponent } from './lib/components/confirm-modal/confirm-modal.component';
import { ExpandableListItemComponent } from './lib/components/expandable-list-item/expandable-list-item.component';
import { ListSelectComponent } from './lib/form-components/list-select/list-select.component';
import { MultiSelectComponent } from './lib/form-components/multi-select/multi-select.component';
import { RadioSelectComponent } from './lib/form-components/radio-select/radio-select.component';
import { ToggleSwitchComponent } from './lib/form-components/toggle-switch/toggle-switch.component';
import { TextInputComponent } from './lib/form-components/text-input/text-input.component';
import { TagComponent } from './lib/components/tag/tag.component';
import { TableComponent } from './lib/components/table/table.component';
import { TabComponent } from './lib/components/tab/tab.component';
import { TabViewComponent } from './lib/components/tab-view/tab-view.component';
import { RightSidePanelComponent } from './lib/components/right-side-panel/right-side-panel.component';
import { FilterPanelService } from './lib/services/filterpanel.service';
import { ReportHeadingBlockComponent } from './lib/report-components/report-heading-block/report-heading-block.component';
import { ReportCommentBlockComponent } from './lib/report-components/report-comment-block/report-comment-block.component';
import { AlertService } from './lib/services/alert.service';
import { GlossaryService } from './lib/services/glossary.service';
import { LoadingPipe } from './lib/services/loading.pipe';
import { AlertComponent } from './lib/components/alert/alert.component';
import { CheckboxComponent } from './lib/form-components/checkbox/checkbox.component';
import { SecondaryNavigationComponent } from './lib/components/secondary-navigation/secondary-navigation.component';
import { SecondaryNavigationItemComponent } from './lib/components/secondary-navigation-item/secondary-navigation-item.component';
import { FieldLengthSortPipe } from './lib/pipes/field-length-sort.pipe';
import { InlineSvgComponent } from './lib/components/inline-svg/inline-svg.component';
import { SidePanelComponent } from './lib/components/side-panel/side-panel.component';
import { API_URL } from '.';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { PageAlertComponent } from './lib/components/page-alert/page-alert.component';
import { ParseStringTemplatePipe } from './lib/pipes/parse-string-template.pipe';
import { StripQuotesPipe } from './lib/pipes/strip-quotes.pipe';
import { DataRepComparisonComponent } from './lib/report-components/data-rep-comparison/data-rep-comparison.component';
import { DataRepComparisonTriggerComponent } from './lib/report-components/data-rep-comparison/controls/data-rep-comparison-trigger.component';
import { DataRepComparisonControlsComponent } from './lib/report-components/data-rep-comparison/controls/data-rep-comparison-controls.component';
import { DataRepService } from './lib/services/data-rep.service';
import { FilterMissingPropertyPipe } from './lib/pipes/filter-missing-property.pipe';

@NgModule({
  declarations: [
    HElementComponent,
    CheckboxComponent,
    AlertComponent,
    InlineSvgComponent,
    PageAlertComponent,
    ReportHeadingBlockComponent,
    LoadingPipe,
    PaginatePipe,
    ReportCommentBlockComponent,
    RightSidePanelComponent,
    TabComponent,
    TabViewComponent,
    TagComponent,
    TableComponent,
    ToggleSwitchComponent,
    TextInputComponent,
    RadioSelectComponent,
    ToggleSwitchComponent,
    MultiSelectComponent,
    ListSelectComponent,
    ExpandableListItemComponent,
    ComboBoxComponent,
    ConfirmModalComponent,
    AccordionComponent,
    BreadcrumbComponent,
    ReportConditionPipe,
    QuickSummaryComponent,
    DataRepComponent,
    GridViewComponent,
    GlossaryPipe,
    OkinaPipe,
    FilterMissingPropertyPipe,
    DataRepGroupedComponent,
    PaginationComponent,
    ModalComponent,
    EditableDirective,
    SecondaryNavigationComponent,
    SecondaryNavigationItemComponent,
    FieldLengthSortPipe,
    InlineSvgComponent,
    SidePanelComponent,
    ParseStringTemplatePipe,
    StripQuotesPipe,
    DataRepComparisonComponent,
    DataRepComparisonTriggerComponent,
    DataRepComparisonControlsComponent
  ],
  exports: [
    HElementComponent,
    InlineSvgComponent,
    SecondaryNavigationComponent,
    SecondaryNavigationItemComponent,
    CheckboxComponent,
    AlertComponent,
    ReportConditionPipe,
    FieldLengthSortPipe,
    TableComponent,
    LoadingPipe,
    ParseStringTemplatePipe,
    StripQuotesPipe,
    SidePanelComponent,
    PaginatePipe,
    ReportHeadingBlockComponent,
    ReportCommentBlockComponent,
    RightSidePanelComponent,
    TabComponent,
    TabViewComponent,
    TagComponent,
    ToggleSwitchComponent,
    TextInputComponent,
    RadioSelectComponent,
    ToggleSwitchComponent,
    MultiSelectComponent,
    ListSelectComponent,
    ExpandableListItemComponent,
    ComboBoxComponent,
    ConfirmModalComponent,
    AccordionComponent,
    BreadcrumbComponent,
    DataRepComponent,
    QuickSummaryComponent,
    GlossaryPipe,
    OkinaPipe,
    FilterMissingPropertyPipe,
    GridViewComponent,
    EditableDirective,
    ModalComponent,
    PaginationComponent,
    DataRepGroupedComponent,
    InlineSvgComponent,
    PageAlertComponent,
    DataRepComparisonComponent,
    DataRepComparisonTriggerComponent,
    DataRepComparisonControlsComponent
  ],
  providers: [AlertService, FilterPanelService, DecimalPipe, DataRepService],
  imports: [CommonModule, NgxMaskDirective, NgxMaskPipe, RouterModule, FormsModule, ReactiveFormsModule, A11yModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LibModule {
  static forRoot(api: string) {
    return {
      ngModule: LibModule,
      providers: [{ provide: API_URL, useValue: api, multi: true }],
    };
  }
}
