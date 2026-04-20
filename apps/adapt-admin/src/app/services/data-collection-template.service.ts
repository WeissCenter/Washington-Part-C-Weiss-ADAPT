import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { IDataCollectionTemplate } from '@adapt/types';
import { AdaptDataService } from './adapt-data.service';
import { BaseTemplateService } from './base-template.service';

@Injectable({
  providedIn: 'root',
})
export class DataCollectionTemplateService extends BaseTemplateService<IDataCollectionTemplate> {
  constructor(dataService: AdaptDataService, logger: NGXLogger) {
    super('DataCollection', dataService, logger);
    this.logger.debug('Inside DataCollectionTemplateService constructor');
  }
}
