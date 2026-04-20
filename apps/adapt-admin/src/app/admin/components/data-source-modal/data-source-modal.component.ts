import { DataSource, DataSourceConnectionInfo, DataViewModel, IDataSource, IReportModel, PageMode } from '@adapt/types';
import { Component, computed, EventEmitter, HostListener, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { StepsIndicatorComponent } from '../steps-indicator/steps-indicator.component';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FullPageModalComponent } from '../full-page-modal/full-page-modal.component';
import { AdaptDataService } from '../../../services/adapt-data.service';
import { AlertService } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/services/alert.service';
import { ModalComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/modal/modal.component';
import { Observable, Subscription } from 'rxjs';
import { getFormErrors } from '../../../util';
import { Router } from '@angular/router';
import { Idle } from '@ng-idle/core';
import { UserService } from '../../../auth/services/user/user.service';
import { IdleStates } from '../../../auth/auth-model';
import { ConfirmModalComponent } from '../../../../../../../libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { LocationStrategy } from '@angular/common';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import {
  PageSectionContentText,
  PageContentText,
} from '@adapt-apps/adapt-admin/src/app/admin/models/admin-content-text.model';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';
import { AdaptReportService } from '@adapt-apps/adapt-admin/src/app/services/adapt-report.service';

@Component({
  selector: 'adapt-data-source-modal',
  standalone: false,
  templateUrl: './data-source-modal.component.html',
  styleUrls: ['./data-source-modal.component.scss'],
})
export class DataSourceModalComponent implements OnDestroy, OnInit {
  PageMode = PageMode;
  ConnectionTestState = ConnectionTestState;
  @ViewChild(StepsIndicatorComponent) stepsIndicator!: StepsIndicatorComponent;
  @ViewChild(FullPageModalComponent) modal!: FullPageModalComponent;
  @ViewChild('confirmModal') confirmModal!: ModalComponent;

  @ViewChild(ConfirmModalComponent) confirmCloseModal!: ConfirmModalComponent;

  @Output() save = new EventEmitter<DataSource>();

  public editJustificationForm: FormGroup;
  public currentDataSource?: DataSource;
  public connectionTestState = ConnectionTestState.READY;
  public mode = PageMode.CREATE;
  public currentStep = 0;
  public opened = false;
  public validConnection = false;
  public connectionTested = false;
  public subscriptions: Subscription[] = [];

  public editPassword = false;

  public createModeModalHeaders = [
    'Step 1: Define data source',
    'Step 2: Define soure connection',
    'Step 3: Data Source Summary',
  ];

  public editModeModalHeaders = [
    'Step 1: Define data source',
    'Step 2: Define soure connection',
    'Step 3: Impact analysis',
    'Step 4: Data Source Summary',
  ];

  public sourceTypeOptions = [{ label: 'Microsoft SQL Server', value: 'mssql' }];

  public refreshReasonOptions = [
    { value: 'quality', label: 'Data Quality' },
    { value: 'corrupted', label: 'Data/File is corrupted' },
    { value: 'update', label: 'Data needs to be updated' },
    { value: 'down', label: 'System is down / cannot collect for certain period of time' },
    { value: 'other', label: 'Other' },
  ];

  public dataSourceForm: FormGroup;

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: any) {
    if (this.dataSourceForm.dirty && this.user.idleState !== IdleStates.TIMED_OUT) {
      event.returnValue = 'You have unsaved changes!';
    }
  }

  public $dataViews: Observable<DataViewModel[]>;
  public $reports: Observable<IReportModel[]>;

  //public dataViews = this.data.getDataViews();
  //public reports = this.data.getReports();

  $pageContent = this.pagesContentService.getPageContentSignal('data-sources', 'en');
  $pageSections = computed(() => this.$pageContent()?.sections || [])

  constructor(
    private fb: FormBuilder,
    private idle: Idle,
    private user: UserService,
    private adaptDataService: AdaptDataService,
    private alert: AlertService,
    private location: LocationStrategy,
    private router: Router,
    public pagesContentService: PagesContentService,
    private adaptDataViewService: AdaptDataViewService,
    private adaptReportService: AdaptReportService,
  ) {

    this.$dataViews = this.adaptDataViewService.getDataViews(); //  this.adaptDataService.$dataViews;
    this.$reports = this.adaptReportService.getReportsListener();

    this.dataSourceForm = this.fb.group({
      type: this.fb.control('mssql', [Validators.required]),
      name: this.fb.control('', [Validators.required]),
      description: this.fb.control('', [Validators.required]),
      address: this.fb.control('', [Validators.required]),
      port: this.fb.control('', [Validators.required]),
      database: this.fb.control('', [Validators.required]),
      username: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required]),
      testConnection: this.fb.control(undefined, [Validators.required]),
    });

    this.location.onPopState((event) => {
      if (event.type === 'popstate') this.internalClose();
    });

    this.editJustificationForm = fb.group({
      reason: this.fb.control('', [Validators.required]),
      justification: this.fb.control(''),
    });

    const justificationReasonSub = this.reason.valueChanges.subscribe((val) => {
      val === 'other' ? this.justification.addValidators(Validators.required) : this.justification.clearValidators();
    });

    const resetConnectionFlagSub = this.dataSourceForm.valueChanges.subscribe((result) => {
      this.testCon.setValue(undefined, { emitEvent: false });
    });

    const timeOutSub = this.idle.onTimeout.subscribe(() => {
      if (!this.dataSourceForm.dirty) return;

      switch (this.mode) {
        case PageMode.CREATE: {
          this.user.userInactivitySave({
            action: 'CREATION',
            type: 'DataSource',
            body: { ...this.dataSourceForm.getRawValue(), page: this.stepsIndicator.step },
          });
          break;
        }
        case PageMode.EDIT: {
          this.user.userInactivitySave({
            action: 'EDIT',
            type: 'DataSource',
            body: {
              dataSourceID: this.currentDataSource?.dataSourceID,
              page: this.stepsIndicator.step,
              ...this.dataSourceForm.getRawValue(),
            },
          });
          break;
        }
      }
    });

    this.subscriptions.push(justificationReasonSub, timeOutSub, resetConnectionFlagSub);

    this.address.disable();
    this.port.disable();
    this.database.disable();
    this.username.disable();
    this.testCon.disable();
    this.password.disable();
  }

  ngOnInit() {
    // Can update these variables with dynamical content pulled from the database if needed

    console.log('Inside report-modal component ngOnInit');

  }

  public open(
    dataSource?: DataSource | (DataSource & DataSourceConnectionInfo),
    mode = PageMode.CREATE,
    page = 0,
    dirty = false
  ) {
    this.opened = true;
    this.mode = mode;



    if (dataSource) {
      this.currentDataSource = dataSource;

      if (!dirty) {

        this.adaptDataService.getDataSource(dataSource!.dataSourceID!, true).subscribe((result) => {

          this.dataSourceForm.patchValue({
            name: dataSource?.name,
            description: dataSource?.description,
            address: dataSource.path,
            type: (result as DataSourceConnectionInfo).type,
            port: (result as DataSourceConnectionInfo).port,
            database: (result as DataSourceConnectionInfo).database,
            username: (result as DataSourceConnectionInfo).username,
            password: '',
          });

        })


      }

      if (this.mode === PageMode.EDIT) {
        this.loadConnectionData(dataSource, dirty);
      }
    }

    this.modal.open();
    this.stepsIndicator.setStep(page);
    this.currentStep = page;

    this.handleCurrentStep();
  }

  private loadConnectionData(dataSource: DataSource | (DataSource & DataSourceConnectionInfo), dirty: boolean) {
    this.adaptDataService.getDataSource(dataSource.dataSourceID as string, true).subscribe({
      next: (result) => {
        const connectionInfo = result as DataSourceConnectionInfo;
        const dataSource = result as DataSource;

        let patch = {
          type: connectionInfo.type,
          port: connectionInfo.port,
          database: connectionInfo.database,
          username: connectionInfo.username,
          password: '',
        };

        if (dirty) {
          patch = Object.assign(patch, {
            name: dataSource?.name,
            description: dataSource?.description,
            address: dataSource.path,
            password: '',
          });
        }

        this.dataSourceForm.patchValue(patch);
      },

      error: () => {
        this.alert.add({
          type: 'error',
          title: 'Failed to load data source',
          body: 'data source connection information failed to load, please try again later',
        });
        this.internalClose();
      },
    });
  }

  private handleCurrentStep() {
    switch (this.currentStep) {
      case 1: {
        this.type.disable();
        this.name.disable();
        this.description.disable();

        this.dataSourceForm.markAsUntouched();
        this.testCon.enable();
        this.address.enable();
        this.port.enable();
        this.database.enable();
        this.username.enable();
        this.password.enable();
        break;
      }
      case 2: {
        this.connectionTestState = ConnectionTestState.READY;
        break;
      }
    }
  }

  public reset() {
    this.currentStep = 0;
    this.dataSourceForm.reset(undefined, { emitEvent: false });
    this.dataSourceForm.markAsPristine();
    this.dataSourceForm.enable();
    this.address.disable();
    this.confirmCloseModal.close();
    this.confirmModal.close();
    this.port.disable();
    this.database.disable();
    this.testCon.disable();
    this.username.disable();
    this.password.disable();
    this.connectionTestState = ConnectionTestState.READY;
    this.opened = false;
    this.editPassword = false;
  }

  public confirmEdits() {
    if (this.editJustificationForm.invalid) {
      return;
    }

    this.confirmModal.close();
    this.doSave(true, true);
  }

  public async doSave(close = false, confirmed = false) {

    const handleClose = () => {
      if (close) {
        this.modal.close();
      }

      this.reset();
    }


    if(!this.dataSourceForm.dirty){
      handleClose();
      return;
    }

    if (this.dataSourceForm.invalid) return;

    if (!confirmed && this.mode === PageMode.EDIT) {
      this.confirmModal.open();
      return;
    }

    const body = {
      name: this.name.value,
      description: this.description.value,
      path: this.address.value,
      connectionInfo: {
        type: this.type.value,
        database: this.database.value,
        port: this.port.value,
        username: this.username.value,
        password: this.password.value,
      },
    };

    if (!this.password.value.length) {
      delete body.connectionInfo.password;
    }

    try{

      if (this.mode === PageMode.EDIT && this.currentDataSource) {
        const editedDataSource = await this.adaptDataService.editDataSourcePromise(
          this.currentDataSource.dataSourceID as string,
          body
        );

        this.alert.add({type: 'success', title: 'Edit save success', body: 'Data Source edits were saved'})
        this.save.emit(editedDataSource);
      } else if (this.mode === PageMode.CREATE) {
        const newDataSource = await this.adaptDataService.createDataSourcePromise(body);
        this.save.emit(newDataSource);
        this.alert.add({type: 'success', title: 'Data source created successfully', body: 'Data Source was successfully created'})
      }

    }catch(err){
      this.alert.add({type: 'error', title: 'Failed to create data source', body: 'Failed to create data source'})
      return;
    }

    handleClose();
  }

  public next() {
    this.dataSourceForm.markAllAsTouched();

    if ( this.dataSourceForm.dirty && this.dataSourceForm.invalid ||
         (this.currentStep === 1 && this.editPassword && this.connectionTestState !== ConnectionTestState.SUCCESS)
    ) {
      return;
    }

    this.stepsIndicator.next();

    this.handleCurrentStep();
  }

  public previous() {
    this.stepsIndicator.prev();

    switch (this.currentStep) {
      case 0: {
        this.type.enable();
        this.name.enable();
        this.description.enable();
        this.testCon.disable();
        this.address.disable();
        this.port.disable();
        this.database.disable();
        this.username.disable();
        this.password.disable();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  public internalClose() {
    this.modal.close();
    this.confirmCloseModal.close();
    this.reset();
  }

  public createDataView() {
    this.internalClose();
    this.router.navigate(['/admin', 'data-management'], {
      state: { dataSource: this.currentDataSource?.dataSourceID },
    });
  }

  public testConnection() {
    this.connectionTestState = ConnectionTestState.READY;
    this.adaptDataService
      .testDBConnection({
        url: this.address.value,
        type: this.type?.value,
        port: this.port?.value,
        database: this.database.value,
        username: this.username.value,
        password: this.password.value,
      })
      .subscribe({
        next: () => {
          this.connectionTestState = ConnectionTestState.SUCCESS;
          this.testCon.setValue(this.connectionTestState, { emitEvent: false });
        },
        error: () => {
          this.connectionTestState = ConnectionTestState.FAILED;
          this.testCon.setValue(undefined, { emitEvent: false });
        },
      });
  }

  public editPasswordToggle() {
    this.editPassword = !this.editPassword;

    this.editPassword ? this.password.enable() : this.password.disable();
  }

  public switchToEditMode(){
    this.mode = PageMode.EDIT;


    this.loadConnectionData(this.currentDataSource!, false)

  }

  get type() {
    return this.dataSourceForm.get('type') as FormControl;
  }

  get name() {
    return this.dataSourceForm.get('name') as FormControl;
  }

  get description() {
    return this.dataSourceForm.get('description') as FormControl;
  }

  get address() {
    return this.dataSourceForm.get('address') as FormControl;
  }

  get port() {
    return this.dataSourceForm.get('port') as FormControl;
  }

  get database() {
    return this.dataSourceForm.get('database') as FormControl;
  }

  get username() {
    return this.dataSourceForm.get('username') as FormControl;
  }

  get password() {
    return this.dataSourceForm.get('password') as FormControl;
  }

  get reason() {
    return this.editJustificationForm.get('reason') as FormControl;
  }

  get justification() {
    return this.editJustificationForm.get('justification') as FormControl;
  }

  get testCon() {
    return this.dataSourceForm.get('testConnection') as FormControl;
  }
}

enum ConnectionTestState {
  READY,
  SUCCESS,
  FAILED,
}
