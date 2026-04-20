import { AdaptSettings, IGlossaryTerm, LanguageCode, Response } from '@adapt/types';
import { HttpClient } from '@angular/common/http';
import { computed, effect, Inject, Injectable, Optional, signal, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, exhaustMap, filter, firstValueFrom, map, Observable, take, tap } from 'rxjs';
import { API_URL, SettingsService } from '../../index';

@Injectable({
  providedIn: 'root',
})
export class GlossaryService {
  // private $glossary = signal<{ [lang: string]: { [key: string]: IGlossaryTerm } }>({});
  api: string;
  private glossaryResource = resource<{ [lang: string]: { [key: string]: IGlossaryTerm } }, { settings: AdaptSettings }>({
    params: () => ({
      settings: this.settings.getSettingsSignal()(),
    }),
    loader: async ({ params }) => {
      const langs = params.settings.supportedLanguages || ['en'];
      const glossarySet: { [lang: string]: { [key: string]: IGlossaryTerm } } = {};
      for (const lang of langs) {
        glossarySet[lang] = await this.getGlossaryFromApi(this.api, lang);
      }
      return glossarySet;
    },
  });

  public glossary$ = toObservable(this.glossaryResource.value).pipe(filter((glossary): glossary is { [lang: string]: { [key: string]: IGlossaryTerm } } => glossary !== undefined));

  constructor(private http: HttpClient, @Inject(API_URL) api: string, private settings: SettingsService) {
    this.api = api;
  }

  private async getGlossaryFromApi(api: string, lang: LanguageCode) {
    const response = await firstValueFrom(this.http.get<Response<any>>(`${api}/settings/glossary`.replace(/([^:]\/)\/+/g, '$1'), { params: { lang } }));
    return response.data.terms as { [key: string]: IGlossaryTerm };
  }

  public getGlossaryTerm(key: string, lang: LanguageCode = 'en', fileSpec?: string): IGlossaryTerm {
    const glossary = this.glossaryResource.value();
    return this.glossaryLookup(glossary, key, lang, fileSpec);
  }

  public getGlossaryTermSignal(key: string, lang: LanguageCode = 'en', fileSpec?: string) {
    return computed(() => {
      const glossary = this.glossaryResource.value();
      return this.glossaryLookup(glossary, key, lang, fileSpec);
    });
  }

  public getGlossaryTerm$(key: string, lang: LanguageCode = 'en', fileSpec?: string): Observable<IGlossaryTerm> {
    return this.glossary$.pipe(map((glossary) => this.glossaryLookup(glossary, key, lang, fileSpec)));
  }

  private glossaryLookup(glossary: { [lang: string]: { [key: string]: IGlossaryTerm } } | undefined, key: string, lang: LanguageCode = 'en', fileSpec?: string) {
    if (!glossary) {
      return { label: key, definition: key };
    }

    const fileSpecLookupKey = `${fileSpec?.toLowerCase()}-${key}`;
    if (fileSpec && glossary[lang] && fileSpecLookupKey in glossary[lang]) {
      return glossary[lang][fileSpecLookupKey] as IGlossaryTerm;
    } else if (glossary[lang] && key in glossary[lang]) {
      return glossary[lang][key] as IGlossaryTerm;
    } else {
      return { label: key, definition: key };
    }
  }
}
