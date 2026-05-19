import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { HomeComponent } from './pages/home/home.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { DataComponent } from './pages/data/data.component';
import { UploadDataComponent } from './pages/upload-data/upload-data.component';
import { ReportComponent } from './pages/report/report.component';
import { reportResolver } from './pages/report/report.resolver';
import { ViewDataSourceComponent } from './pages/view-data-source/view-data-source.component';
import { dataSetResolver } from './pages/data-set/data-set.resolver';
import { DataSetComponent } from './pages/data-set/data-set.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AccessibilitySettingsComponent } from './pages/settings/accessibility-settings/accessibility-settings.component';
import { DataSourcesSettingsComponent } from './pages/settings/data-sources-settings/data-sources-settings.component';
import { BrandingSettingsComponent } from './pages/settings/branding-settings/branding-settings.component';
import { FooterLinksSettingsComponent } from './pages/settings/footer-links-settings/footer-links-settings.component';
import { FooterLinksSettingsGuard } from './pages/settings/footer-links-settings/footer-links-settings.guard';
import { UserSettingsComponent } from './pages/settings/user-settings/user-settings.component';
import { SecuritySettingsComponent } from './pages/settings/security-settings/security-settings.component';
import { DataSuppressionSettingsComponent } from './pages/settings/data-suppression-settings/data-suppression-settings.component';
import { roleGuard } from '../auth/guards/role.guard';
import { ErrorComponent } from './pages/error/error.component';
import { LanguageSettingsComponent } from './pages/settings/language-settings/language-settings.component';

const routes: Routes = [
  {
    path: '',
    data: { breadcrumbLabel: null },
    component: AdminComponent,
    children: [
      { path: '', title: 'ADAPT Admin - Home', component: HomeComponent },
      { path: 'share/:slug', title: 'ADAPT Admin - Home', component: HomeComponent },
      {
        path: 'reports',
        title: 'ADAPT Admin - Reports',
        component: ReportsComponent,
        data: { breadcrumbLabel: 'Reports' },
        children: [
          {
            path: ':id',
            title: 'ADAPT Admin - Viewing Report',
            component: ReportComponent,
            resolve: { reportResolver },
            runGuardsAndResolvers: 'always',
            data: { breadcrumbLabel: 'View Report' },
            canDeactivate: [
              (
                component: ReportComponent,
                currentRoute: ActivatedRouteSnapshot,
                currentState: RouterStateSnapshot,
                nextState: RouterStateSnapshot
              ) => component.canDeactivate(true, nextState),
            ],
          },
        ],
      },

      {
        path: 'data-management',
        title: 'ADAPT Admin - Data Management',
        component: DataComponent,
        data: { breadcrumbLabel: 'Data Management' },
      },

      {
        path: 'data-source',
        data: { breadcrumbLabel: 'Data Source' },
        children: [
          { path: '', redirectTo: '/admin/data-management/sources', pathMatch: 'full' },
          {
            path: 'new',
            title: 'ADAPT Admin - New Data Source',
            component: UploadDataComponent,
            data: { breadcrumbLabel: 'Upload' },
          },
          {
            path: ':dataSourceID',
            title: 'ADAPT Admin - Viewing Data Source',
            component: ViewDataSourceComponent,
            data: { breadcrumbLabel: '{dataSourceID}' },
          },
        ],
      },

      {
        path: 'data-view',
        data: { breadcrumbLabel: 'Data Views' },
        children: [
          { path: '', redirectTo: '/admin/data-management/views', pathMatch: 'full' },
          {
            path: 'new',
            title: 'ADAPT Admin - New Data View',
            component: DataSetComponent,
            data: { breadcrumbLabel: 'New Data View' },
          },
          { path: ':dataSetID', redirectTo: ':dataSetID/view', pathMatch: 'full' },
          {
            path: ':dataSetID/view',
            title: 'ADAPT Admin - Viewing Data Set',
            component: DataSetComponent,
            resolve: { dataSetResolver },
            data: { breadcrumbLabel: '{dataSetID}' },
          },
          {
            path: ':dataSetID/edit',
            title: 'ADAPT Admin - Editing Data Set',
            component: DataSetComponent,
            resolve: { dataSetResolver },
            data: { breadcrumbLabel: '{dataSetID}' },
          },
        ],
      },

      {
        path: 'settings',
        data: { breadcrumbLabel: 'Settings' },
        title: 'ADAPT Admin - Settings',

        component: SettingsComponent,
        children: [
          {
            path: 'accessibility',
            component: AccessibilitySettingsComponent,
            data: { breadcrumbLabel: 'Accessibility' },
          },
          {
            path: 'data-sources',
            component: DataSourcesSettingsComponent,
            data: { breadcrumbLabel: 'Data Sources' },
            canActivate: [roleGuard('Data Sources', 'Read')],
          },
          {
            path: 'data-suppression',
            component: DataSuppressionSettingsComponent,
            data: { breadcrumbLabel: 'Data Suppression' },
            canActivate: [roleGuard('Tool Settings', 'Write')],
          },
          {
            path: 'language-access',
            component: LanguageSettingsComponent,
            data: { breadcrumbLabel: 'Language Translation Options' },
            canActivate: [roleGuard('Tool Settings', 'Write')],
          },
          {
            path: 'branding',
            component: BrandingSettingsComponent,
            data: { breadcrumbLabel: 'Branding' },
            canActivate: [roleGuard('Tool Settings', 'Write')],
          },
          {
            path: 'footer-links',
            component: FooterLinksSettingsComponent,
            data: { breadcrumbLabel: 'Footer Links' },
            canActivate: [roleGuard('Tool Settings', 'Write')],
            canDeactivate: [FooterLinksSettingsGuard],
          },
          {
            path: 'user-management',
            component: UserSettingsComponent,
            data: { breadcrumbLabel: 'User Management' },
            canActivate: [roleGuard('Users', 'Read')],
          },
          {
            path: 'security',
            component: SecuritySettingsComponent,
            data: { breadcrumbLabel: 'Security' },
            canActivate: [roleGuard('Tool Settings', 'Write')],
          },
        ],
      },
      {
        path: 'error',
        component: ErrorComponent
      },
      {
        path: '**',
        redirectTo: 'error',
  
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
