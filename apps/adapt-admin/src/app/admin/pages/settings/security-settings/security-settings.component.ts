import { Component, computed, effect, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors } from '@angular/forms';
import { AdaptDataService } from 'apps/adapt-admin/src/app/services/adapt-data.service';
import { SettingsService } from '@adapt/adapt-shared-component-lib';
import { AlertService } from '@adapt/adapt-shared-component-lib';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';

@Component({
  selector: 'adapt-security-settings',
  standalone: false,
  templateUrl: './security-settings.component.html',
  styleUrl: './security-settings.component.scss',
})
export class SecuritySettingsComponent implements OnDestroy {
  public editTimeout = false;

  public timeOutForm: FormGroup;

  public readonly $page = computed(() => this.content.$adminContent()?.pages?.[8] ?? null);

  constructor(
    private fb: FormBuilder,
    private data: AdaptDataService,
    private settings: SettingsService,
    private alert: AlertService,
    public content: PagesContentService
  ) {
    this.timeOutForm = this.fb.group({
      idleMinutes: this.fb.control(30),
      warningMinutes: this.fb.control(2),
      timeoutMinutes: this.fb.control(5),
    }, { validators: this.timeOutValidator.bind(this) });

    effect(() => {
      const settings = this.settings.getSettingsSignal()();
      if (settings) {
        this.timeOutForm.setValue({
          idleMinutes: `${settings.idleMinutes}`,
          warningMinutes: `${settings.warningMinutes}`,
          timeoutMinutes: `${settings.timeoutMinutes}`,
        });
      }
    });
  }

  ngOnDestroy(): void {}

  public onSave() {
    if (this.timeOutForm.invalid) return;

    this.data
      .updateSettings({
        idleMinutes: Number(this.timeOutForm.get('idleMinutes')!.value),
        warningMinutes: Number(this.timeOutForm.get('warningMinutes')!.value),
        timeoutMinutes: Number(this.timeOutForm.get('timeoutMinutes')!.value),
      })
      .subscribe({
        next: () => this.alert.add({ type: 'success', title: 'Settings Saved', body: 'Timeout settings were saved successfully.' }),
        error: () => this.alert.add({ type: 'error', title: 'Settings Save Failed', body: 'Timeout settings failed to save, please try again.' }),
      });
  }

  private timeOutValidator(group: AbstractControl): ValidationErrors | null {
    if (!group) return null;
    const { warningMinutes, timeoutMinutes } = (group as FormGroup).controls;
    if (Number(warningMinutes.value) > Number(timeoutMinutes.value)) {
      return { timeout: 'Warning minutes must be lower than timeout minutes' };
    }
    return null;
  }
}
