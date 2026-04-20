import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HomeComponent } from './pages/home/home.component';
import { RouterModule } from '@angular/router';
import { ReportsComponent } from './pages/reports/reports.component';
import { CreateReportComponent } from './pages/create-report/create-report.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataComponent } from './pages/data/data.component';
import { UploadDataComponent } from './pages/upload-data/upload-data.component';
import { ReportComponent } from './pages/report/report.component';
import { BarChartComponent } from './components/bar-chart/bar-chart.component';
import { CreateDatasetComponent } from './pages/create-dataset/create-dataset.component';
import { ViewDataSourceComponent } from './pages/view-data-source/view-data-source.component';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { CountBreakdownComponent } from './components/count-breakdown/count-breakdown.component';
import { DataSetsComponent } from './pages/data-sets/data-sets.component';
import { DataSetComponent } from './pages/data-set/data-set.component';
import { A11yModule } from '@angular/cdk/a11y';
import { FileInputComponent } from './components/file-input/file-input.component';
import { BannerComponent } from './components/banner/banner.component';
import { ListViewComponent } from './components/list-view/list-view.component';
import { SortPipe } from './pipes/sort.pipe';
import { AdaptPreviewDirective } from './directive/adapt-preview.directive';
import { OptOutModalComponent } from './components/opt-out-modal/opt-out-modal.component';
import { LimitToPipe } from './pipes/limitTo.pipe';
import { ImpactAnalysisComponent } from './components/impact-analysis/impact-analysis.component';
import { FullPageModalComponent } from './components/full-page-modal/full-page-modal.component';
import { DataViewModalComponent } from './components/data-view-modal/data-view-modal.component';
import { StepsIndicatorComponent } from './components/steps-indicator/steps-indicator.component';
import { StepsIndicatorStepComponent } from './components/steps-indicator-step/steps-indicator-step.component';
import { ValueLabelPipe } from './pipes/value-label.pipe';
import { S3FileSizePipe } from './pipes/s3-file-size.pipe';
import { SettingsComponent } from './pages/settings/settings.component';
import { InPageNavigationComponent } from './components/in-page-navigation/in-page-navigation.component';
import { AccessibilitySettingsComponent } from './pages/settings/accessibility-settings/accessibility-settings.component';
import { ReportModalComponent } from './components/report-modal/report-modal.component';
import { ListItemReportComponent } from './components/list-item-report/list-item-report.component';
import { ListItemDataComponent } from './components/list-item-data/list-item-data.component';
import { FooterComponent } from './components/footer/footer.component';
import { DataSourcesSettingsComponent } from './pages/settings/data-sources-settings/data-sources-settings.component';
import { DataSourceModalComponent } from './components/data-source-modal/data-source-modal.component';
import { BrandingSettingsComponent } from './pages/settings/branding-settings/branding-settings.component';
import { FooterLinksSettingsComponent } from './pages/settings/footer-links-settings/footer-links-settings.component';
import { ComponentsModule } from '../components/components.module';
import { HeroBannerComponent } from './components/hero-banner/hero-banner.component';
import { CircularJsonPipe } from './pipes/circular-json.pipe';
import { UserSettingsComponent } from './pages/settings/user-settings/user-settings.component';
import { ListItemUserComponent } from './components/list-item-user/list-item-user.component';
import { InactivityBannerComponent } from './components/inactivity-banner/inactivity-banner.component';
import { SecuritySettingsComponent } from './pages/settings/security-settings/security-settings.component';
import { SessionReloadBannerComponent } from './components/session-reload-banner/session-reload-banner.component';
import { LibModule } from '@adapt/adapt-shared-component-lib';
import { WeissAccessibilityCenterModule } from 'weiss-accessibility-center';
import { AccessControlDirective } from '../auth/directive/access-control.directive';
import { DataSuppressionSettingsComponent } from './pages/settings/data-suppression-settings/data-suppression-settings.component';
import { ErrorComponent } from './pages/error/error.component';
import { LanguageSettingsComponent } from './pages/settings/language-settings/language-settings.component';
import { AdaptDataService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data.service';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';
import { TemplateService } from '@adapt-apps/adapt-admin/src/app/services/template.service';
import { ValidationService } from '../services/validation.service';
import { DataCollectionTemplateService } from '../services/data-collection-template.service';
import { ReportTemplateService } from '../services/report-template.service';

@NgModule({
  declarations: [
    AdminComponent,
    SidebarComponent,
    HomeComponent,
    ReportsComponent,
    CreateReportComponent,
    SortPipe,
    DataComponent,
    ListViewComponent,
    ImpactAnalysisComponent,
    UploadDataComponent,
    ReportComponent,

    BarChartComponent,
    CreateDatasetComponent,
    ViewDataSourceComponent,
    ContextMenuComponent,
    CountBreakdownComponent,
    DataSetsComponent,
    DataSetComponent,
    FileInputComponent,
    BannerComponent,
    AdaptPreviewDirective,
    OptOutModalComponent,
    LimitToPipe,
    FullPageModalComponent,
    DataViewModalComponent,
    StepsIndicatorComponent,
    StepsIndicatorStepComponent,
    ValueLabelPipe,
    S3FileSizePipe,
    SettingsComponent,
    InPageNavigationComponent,
    AccessibilitySettingsComponent,
    ReportModalComponent,
    ListItemReportComponent,
    ListItemDataComponent,
    FooterComponent,
    DataSourcesSettingsComponent,
    DataSourceModalComponent,
    DataSourcesSettingsComponent,
    BrandingSettingsComponent,
    SettingsComponent,
    FooterLinksSettingsComponent,
    HeroBannerComponent,
    CircularJsonPipe,
    UserSettingsComponent,
    ListItemUserComponent,
    InactivityBannerComponent,
    DataSuppressionSettingsComponent,
    SecuritySettingsComponent,
    SessionReloadBannerComponent,
    ErrorComponent,
    LanguageSettingsComponent,
  ],
  exports: [BannerComponent, HeroBannerComponent, WeissAccessibilityCenterModule],
  //providers: [{provide: 'defaultContent', useValue: environment.loginContent}],
  imports: [
    CommonModule,
    AdminRoutingModule,
    AccessControlDirective,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    A11yModule,
    ComponentsModule,
    LibModule,
    WeissAccessibilityCenterModule,
  ],
  providers: [
    AdaptDataService,
    AdaptDataViewService,
    AdaptReportService,
    TemplateService,
    DataCollectionTemplateService,
    ReportTemplateService,
    ValidationService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminModule {}
