import { SettingsService } from '@adapt/adapt-shared-component-lib';

import { computed, effect, Inject, Injectable, signal, WritableSignal, DOCUMENT } from '@angular/core';
import {WeissAccessibilityCenterService} from 'weiss-accessibility-center'

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  $_selectedLanguage: WritableSignal<string | null> = signal(null);

  public $language = computed(() => {
    // const localStorageLang = localStorage.getItem('lang');
    // if (localStorageLang) {
    //   return localStorageLang;
    // }
    if (this.$_selectedLanguage() !== null) {
      return this.$_selectedLanguage() as string;
    }
    // If no language selected, use default from settings
    const settingsSignal = this.settings.getSettingsSignal();
    const defaultLanguage = settingsSignal().defaultLanguage;
    if (defaultLanguage) {
      return defaultLanguage;
    }
    // Fallback to 'en' if no default language set
    return 'en';
  });


  constructor(private settings: SettingsService, @Inject(DOCUMENT) private document: Document, private weiss: WeissAccessibilityCenterService) {}

  public changeLanguage(lang: string){
    this.$_selectedLanguage.set(lang);
    this.document.documentElement.lang = lang;
    this.weiss.updateSettings({language: lang})
  }

  public getLang(){
    return this.$language();
  }

}
