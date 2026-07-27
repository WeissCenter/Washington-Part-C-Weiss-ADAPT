import { DataSource, IReportModel, DataViewModel, PageMode } from '@adapt/types';
import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AdaptDataService } from '../../../../services/adapt-data.service';
import { BehaviorSubject, map, Observable, switchMap } from 'rxjs';
import { DataSourceModalComponent } from '../../../components/data-source-modal/data-source-modal.component';
import { LocationStrategy } from '@angular/common';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';

@Component({
  selector: 'adapt-data-sources-settings',
  standalone: false,
  templateUrl: './data-sources-settings.component.html',
  styleUrls: ['./data-sources-settings.component.scss'],
})
export class DataSourcesSettingsComponent implements AfterViewInit {
  PageMode = PageMode;
  @ViewChild(DataSourceModalComponent) public dataSourceModal!: DataSourceModalComponent;

  @ViewChild('visibleSourcesContent', { static: true })
  visibleSourcesRef?: TemplateRef<unknown>;
  @ViewChild('collapsedSourcesContent', { static: true })
  collapsedSourcesRef?: TemplateRef<unknown>;
  @ViewChild('actionSourcesContent', { static: true })
  actionSourcesRef?: TemplateRef<unknown>;
  @ViewChild('loadingSourcesContent', { static: true })
  loadingSourcesRef?: TemplateRef<unknown>;

  $pageContent = this.pagesContentService.getPageContentSignal('data-sources');

  public search = new BehaviorSubject('');
  public $search = this.search.asObservable();


  public $dataSources = this.$search.pipe(
    switchMap((query) =>
      this.adaptDataService.$dataSources.pipe(
        map((sources) =>
          sources.filter(
            (source) => source.description?.toLowerCase().includes(query) || source.name.toLowerCase().includes(query)
          )
        )
      )
    )
  );

  constructor(private adaptDataService: AdaptDataService,
              private adaptDataViewService: AdaptDataViewService,
              private adaptReportService: AdaptReportService,
              private location: LocationStrategy,
              public pagesContentService: PagesContentService) {}

  public onSave(dataSource: DataSource) {
    this.adaptDataService.addDataSource(dataSource);
  }

  private handleResume() {
    const state = this.location.getState() as any;
    switch (state.mode) {
      case 'CREATION': {
        this.dataSourceModal.open(state.dataSource, PageMode.CREATE, state.dataSource.page ?? 0, state.dirty);
        break;
      }
      case 'EDIT': {
        this.dataSourceModal.open(state.dataSource, PageMode.EDIT, state.dataSource.page ?? 0, state.dirty);
      }
    }
  }

  ngOnInit(): void {
    //console.log('Inside settings component ngOnInit');
  }

  ngAfterViewInit(): void {
    this.handleResume();
  }
}
