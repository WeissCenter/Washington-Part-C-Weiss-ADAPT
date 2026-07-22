import { Component, computed, effect, OnDestroy, OnInit, Signal, ViewChild } from '@angular/core';
import { ConfirmModalComponent } from 'libs/adapt-shared-component-lib/src/lib/components/confirm-modal/confirm-modal.component';
import { PageContentText, SupportedLanguageOption } from '../../../models/admin-content-text.model';
import { PagesContentService } from '@adapt-apps/adapt-admin/src/app/auth/services/content/pages-content.service';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LanguageCode } from '@adapt/types';
import { AlertService, SettingsService } from '@adapt/adapt-shared-component-lib';
import { BehaviorSubject } from 'rxjs';
import { AdaptDataService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'adapt-language-settings',
  standalone: false,
  templateUrl: './language-settings.component.html',
  styleUrl: './language-settings.component.scss',
})
export class LanguageSettingsComponent implements OnInit, OnDestroy {
  @ViewChild(ConfirmModalComponent) confirmModal!: ConfirmModalComponent;

  // Input signal
  $pageContentSignal: Signal<PageContentText|null>;
  pageContent: PageContentText|null;
  pageContentLoaded: boolean = false;

  public editAccess = false;
  public confirmed = false;

  public langForm: FormGroup;

  public $supportedLanguages = computed(() => {
    const defaultLang = this.settings.getDefaultLanguageSignal()();
    const supportedLangs = this.pagesContentService.$sharedContent()?.languageAccess.supportedLanguages || []
    return supportedLangs.filter(lang => lang.value !== defaultLang);
  })

  // public _availableDefaultLangOptions = new BehaviorSubject<SupportedLanguageOption[]>([]);
  // public $availableDefaultLangOptions = this._availableDefaultLangOptions.asObservable();

  constructor(
    private pagesContentService: PagesContentService,
    private fb: FormBuilder,
    private settings: SettingsService,
    private data: AdaptDataService,
    private alert: AlertService,
    private logger: NGXLogger
  ) {
    logger.debug('Inside LanguageSettingsComponent constructor');

    this.$pageContentSignal = this.pagesContentService.getPageContentSignal('language-access');

    effect(() => {
      logger.debug('$pageContentSignal retrieved');
      this.pageContent = this.$pageContentSignal();
      this.pageContentLoaded = true;

      if (!this.pageContent?.title){
        this.logger.error('Invalid page title');
      }

      if (!(this.pageContent?.sections && this.pageContent?.sections?.length > 0)){
        this.logger.error('Invalid page sections');
      }
    })

    this.langForm = this.fb.group({
      enabledLangs: this.fb.array([], [Validators.required]),
    });

    // this.enabledLangs.valueChanges.subscribe((changes) => this.handleDefaultOptions(changes));

    effect(() => {
      logger.debug('sharedContentSignal content retrieved');
      this.enabledLangs.clear();

      for (const lang of this.$supportedLanguages()) {
        this.enabledLangs.push(
          this.fb.control(!!(this.settings.getSettings()?.supportedLanguages?.includes(lang.value as LanguageCode)))
        );
      }
      // this.handleDefaultOptions(this.enabledLangs.value);
      // requestAnimationFrame(() => {
      //   this.default.setValue(this.settings.getSettings()?.defaultLanguage);
      // })
    })


  }

  // private handleDefaultOptions(changes: any) {
  //   const sharedContent = this.pagesContentService.getSharedContentSignal()();

  //   if (changes.every((change: boolean) => !change)) {
  //     this.default.reset();
  //   }

  //   const filtered = sharedContent?.languageAccess.supportedLanguages.filter((lang, idx) => changes[idx]) || [];

  //   if (!filtered.some((lang) => lang.value === this.default.value)) this.default.reset();

  //   // this._availableDefaultLangOptions.next(filtered);
  // }

  ngOnInit(): void {}

  ngOnDestroy(): void {}


  public onSubmit() {
    if (this.langForm.invalid) return;
    const supportedLanguageCodes = this.$supportedLanguages().filter((lang, idx) => this.enabledLangs.value[idx]).map(lang => lang.value as LanguageCode);
    this.data.updateSettings({ supportedLanguages: [this.settings.getDefaultLanguage(), ...supportedLanguageCodes] }).subscribe({
      next: (res) => {
        this.alert.add({
          type: 'success',
          title: 'Language Translation Options Saved',
          body: 'Language Translation Options changes have been saved.',
        });
      },
      error: (err) => {
        this.alert.add({
          type: 'error',
          title: 'Error',
          body: 'Failed to update settings',
        });
      },
    });
  }

  // public get default() {
  //   return this.langForm.get('default') as FormControl;
  // }

  public get enabledLangs() {
    return this.langForm.get('enabledLangs') as FormArray;
  }
}
