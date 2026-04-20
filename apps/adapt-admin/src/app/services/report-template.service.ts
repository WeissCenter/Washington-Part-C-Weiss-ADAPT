import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { AdaptDataService } from './adapt-data.service';
import { BaseTemplateService } from './base-template.service';

@Injectable({
  providedIn: 'root',
})
export class ReportTemplateService extends BaseTemplateService<any> {
  constructor(dataService: AdaptDataService, logger: NGXLogger) {
    super('ReportTemplate', dataService, logger);
    this.logger.debug('Inside ReportTemplateTemplateService constructor');
  }
}
