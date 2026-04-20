import { Component, effect, ViewChild } from '@angular/core';

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AdaptDataService } from '../../../../services/adapt-data.service';
import { SettingsService } from 'libs/adapt-shared-component-lib/src/lib/services/settings.service';
import { AlertService } from '@adapt/adapt-shared-component-lib';
import { ConfirmModalComponent } from 'libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';

@Component({
  selector: 'adapt-data-suppression-settings',
  standalone: false,
  templateUrl: './data-suppression-settings.component.html',
  styleUrl: './data-suppression-settings.component.scss',
})
export class DataSuppressionSettingsComponent {
  @ViewChild(ConfirmModalComponent) confirmModal!: ConfirmModalComponent;
  public editSuppression = false;

  public suppressionForm: FormGroup;

  public $content = this.pages!.getPageContentSignal('data-suppression');

  constructor(
    private fb: FormBuilder,
    private data: AdaptDataService,
    private settings: SettingsService,
    private alert: AlertService,
    public pages: PagesContentService
  ) {
    this.suppressionForm = this.fb.group({
      nSize: this.fb.control(30, [Validators.required]),
    });

    effect(() => {
      const settings = this.settings.getSettingsSignal()();
      if (settings && settings.nSize) {
        this.nSize.setValue(settings.nSize);
      }
    });
  }

  public onSave() {
    if (this.suppressionForm.invalid) return;

    let nSize = this.nSize.getRawValue() || 30;

    if(typeof nSize === 'string'){
      try{
        nSize = parseInt(nSize);

        if(isNaN(nSize)) nSize = 30;
      }catch(err){
        nSize = 30;
      }
    }

    this.data.updateSettings({ nSize }).subscribe({
      next: (result) => {
        this.alert.add({ type: 'success', title: 'N-Size Saved', body: 'N-Size changes have been saved' });
        this.settings.next(result);
        this.suppressionForm.markAsPristine();
      },
      error: (err) => {
        this.alert.add({
          type: 'error',
          title: 'N-Size Save Failed',
          body: 'N-Size changes have failed to save',
        });
      },
    });
  }

  public toggleNSizeSetting() {
    if (this.suppressionForm.dirty && this.editSuppression) return this.confirmModal.open();

    this.editSuppression = !this.editSuppression;
  }

  public get nSize() {
    return this.suppressionForm.get('nSize') as FormControl;
  }

  public cancel(what: 'nSize' = 'nSize') {
    switch (what) {
      case 'nSize': {
        this.editSuppression = false;
        this.nSize.setValue(this.settings.getSettings().nSize);
      }
    }
  }
}
