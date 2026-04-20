import { AdaptSettings, LanguageCode } from '@adapt/types';
import { computed, Inject, Injectable, signal } from '@angular/core';
import { BehaviorSubject, map, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from './language.service';
import { API_URL } from '../../index';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly DEFAULT_LANGUAGE: LanguageCode = 'en';

  private readonly DEFAULT_SETTINGS: AdaptSettings = {
    logo: '',
    footerLinks: [],
    copyright: '',
    nSize: 30,
    idleMinutes: 30,
    timeoutMinutes: 5,
    warningMinutes: 2,
  };

  private $_settings = signal<AdaptSettings>(this.DEFAULT_SETTINGS);

  constructor(private http: HttpClient, @Inject(API_URL) api: string) {
    this.getSettingsApi(api).subscribe((settings) => {
      this.next(settings);
    });
  }


  public getSettingsApi(api: string) {
    return this.http.get<{ data: AdaptSettings }>(`${api}settings`).pipe(map((resp) => resp.data));
  }

  public next(val: AdaptSettings) {
    this.$_settings.set(val);
  }

  public getSettings() {
    return this.$_settings();
  }
  
  public getSettingsSignal() {
    return this.$_settings.asReadonly();
  }

  public getDefaultLanguageSignal() {
    return computed(() => {
      return this.$_settings().defaultLanguage || this.DEFAULT_LANGUAGE;
    });
  }

  public getDefaultLanguage() {
    return this.getDefaultLanguageSignal()();
  }
}
