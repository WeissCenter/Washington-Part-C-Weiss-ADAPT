import { afterEveryRender, Component, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GlossaryService, LibModule } from '@adapt/adapt-shared-component-lib';
import { AppModule } from './app.module';
import { ViewerPagesContentService } from './services/content/viewer-pages-content.service';
import { AdaptDataService } from './services/adapt-data.service';
import { map } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { LanguageService } from '@adapt/adapt-shared-component-lib';
import { A11yModule } from "@angular/cdk/a11y";

@Component({
  standalone: true,
  imports: [RouterModule, LibModule, AppModule, A11yModule],
  providers: [DecimalPipe],
  selector: 'adapt-viewer-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'adapt-viewer';


  public $breadcrumbContent = computed(() => this.content.$sharedContent()?.breadcrumb);
  public $a11yContent = computed(() => {
    return {
      [`${this.language.$language()}`]: this.content.$sharedContent()?.a11yCenterContent || {}
    }
  });

  constructor(
    private content: ViewerPagesContentService, 
     private glossary: GlossaryService, 
     private data: AdaptDataService, 
    public language: LanguageService) {
    //this.content.loadContent();
    afterEveryRender(() => {
      require('@uswds/uswds');
    })
  }

}
