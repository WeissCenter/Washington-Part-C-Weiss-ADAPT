import { HttpClient } from '@angular/common/http';
import { computed, effect, Inject, Injectable, resource, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  //private _content = new ReplaySubject<any>();
  //public $content = this._content.asObservable();
  public $content = signal<Record<string, any>>({});
  private $requestedLanguages = signal<Set<string>>(new Set());
  private $contentLanguages = computed(() => {
    return [...new Set([this.language.$language(), ...this.$requestedLanguages()])];
  });

  private _content$$ = resource({
    params: () => ({
      languages: this.$contentLanguages(),
    }),
    loader: async ({ params }) => {
      const { languages } = params;
      const contentData: Record<string, any> = {};
      const requests = languages.map(async (lang) => {
        const url = this.contentUrl(this.appDomain, this.contentRoot, this.contentFileName, lang);
        try {
          const response = await this.getContent(this.appDomain, this.contentRoot, this.contentFileName, lang);
          contentData[url] = response;
        } catch (error) {
          console.error(`Failed to load content for language ${lang} from ${url}:`, error);
        }
      });
      await Promise.all(requests);
      return contentData;
    },
    defaultValue: {},
  });

  public content$$ = this._content$$.asReadonly();

  constructor(private http: HttpClient, private language: LanguageService, @Inject('appDomain') private appDomain: string, @Inject('contentRoot') private contentRoot: string, @Inject('contentFileName') private contentFileName: string) {}

  private contentUrl(appDomain: string, defaultContentFilePath: string, file: string, lang: string) {
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${appDomain}/${defaultContentFilePath}/${lang}/${file}`;
  }

  getContent(appDomain: string, defaultContentFilePath: string, file: string, lang: string): Promise<any> {
    const url = this.contentUrl(appDomain, defaultContentFilePath, file, lang);
    return firstValueFrom(this.http.get(url));
  }
  
  getContentSignal(appDomain: string, defaultContentFilePath: string, file: string, lang: string)  {
    const url = this.contentUrl(appDomain, defaultContentFilePath, file, lang);
    return computed(() => {
      return this.content$$.value()[url];
    });
  }

  requestNewLanguage(lang: string) {
    if (!this.$requestedLanguages().has(lang)) {
      this.$requestedLanguages.update((prev) => new Set(prev).add(lang));
    }
  }
}
