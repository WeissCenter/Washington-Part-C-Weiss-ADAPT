import { computed, effect, Signal } from '@angular/core';
import { resource, ResourceRef } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { TemplateType } from '@adapt/types';
import { firstValueFrom } from 'rxjs';
import { AdaptDataService } from './adapt-data.service';

export abstract class BaseTemplateService<T extends { id: string }> {
  private readonly templateType: TemplateType;
  private readonly nameField: string;
  private templates: ResourceRef<T[] | undefined>;

  public readonly byId: Signal<Record<string, string[]>>;
  public readonly byYear: Signal<Record<string, string[]>>;

  public readonly ids: Signal<string[]> = computed(() => Object.keys(this.byId()));
  public readonly idsWithLabels: Signal<{ value: string; label: string }[]> = computed(() => {
    const templates = this.templates.value();
    if (!templates) return [];
    const idLabelMap: Record<string, string> = {};
    templates.forEach(template => {
      const parts = template.id?.split('#');
      if (parts && parts.length === 4) {
        const id = parts[1];
        const label = template[this.nameField as keyof T] as string || id;
        idLabelMap[id] = label;
      }
    });
    return Object.entries(idLabelMap).map(([value, label]) => ({ value, label }));
  });
  public readonly years: Signal<string[]> = computed(() => Object.keys(this.byYear()));

  constructor(templateType: TemplateType, protected dataService: AdaptDataService, protected logger: NGXLogger) {
    this.templateType = templateType;
    switch (templateType) {
      case 'DataCollection':
        this.nameField = 'name';
        break;
      case 'ReportTemplate':
        this.nameField = 'title';
        break;
      case 'ValidationTemplate':
        this.nameField = 'name';
        break;
      default:
        const exhaustiveCheck: never = templateType;
        throw new Error(`Unhandled template type: ${exhaustiveCheck}`); 
    }

    this.templates = resource({
      loader: () => firstValueFrom(this.dataService.getTemplates<T>(templateType)).then(templates => {
        return templates.filter(template => template.id.split('#').length === 4); // only include templates with properly formatted IDs
        }),
    });

    this.byId = computed(() => this.buildIndex(this.templates.value(), 1, 3));
    this.byYear = computed(() => this.buildIndex(this.templates.value(), 3, 1));
  }

  private buildIndex(templates: T[] | undefined, keyPos: number, valPos: number): Record<string, string[]> {
    if (!templates) return {};
    return templates.reduce((acc, template) => {
      const parts = template.id?.split('#');
      if (!parts || parts.length !== 4) return acc;
      const key = parts[keyPos];
      const val = parts[valPos];
      if (!acc[key]) acc[key] = [];
      if (!acc[key].includes(val)) acc[key].push(val);
      return acc;
    }, {} as Record<string, string[]>);
  }

  public getTemplates() {
    return this.templates.value();
  }

  public getTemplate(id: string, year: string) {
    const templates = this.getTemplates();
    if (!templates) return undefined;
    return templates.find(template => {
      const idStr = this.idStr(id, year);
      return template.id === idStr;
    });
  }

  public getTemplatePromise(id: string, year: string) {
    return firstValueFrom(this.dataService.getTemplate<T>(this.templateType, this.idStr(id, year)));
  }

  public getAllIDs(withLabels: true): { value: string; label: string }[];
  public getAllIDs(withLabels?: false): string[];
  public getAllIDs(withLabels = false): string[] | { value: string; label: string }[] {
    // returns all unique IDs across all years for this template type
    // handles 
    const templates = this.getTemplates();
    if (!templates) return [];
    const ids = new Set<string>();
    templates.forEach(template => {
      const [_, id, , ] = template.id?.split('#');
      
      let label = id;
      if (this.nameField in template) {
        label = template[this.nameField as keyof T] as string;
      }

      if (id && withLabels) {
        ids.add(`${id}#${label}`);
      } else if (id) {
        ids.add(id);
      }
    });
    
    if (withLabels) {
      return Array.from(ids).map(id => {
        const [idPart, labelPart] = id.split('#');
        return { value: idPart, label: labelPart };
      });
    }
    return Array.from(ids);
  }

  public getAllYears() {
    // returns all unique years across all IDs for this template type
    const templates = this.getTemplates();
    if (!templates) return [];
    const years = new Set<string>();
    templates.forEach(template => {
      const parts = template.id?.split('#');
      if (parts && parts.length === 4) {
        years.add(parts[3]);
      }
    });
    return Array.from(years);
  }

  public getYearsForID(id: string) {
    return this.byId()[id] ?? [];
  }

  public getIDsForYear(year: string, withLabels: true): { value: string; label: string }[];
  public getIDsForYear(year: string, withLabels?: false): string[];
  public getIDsForYear(year: string, withLabels = false): string[] | { value: string; label: string }[] {
    // returns all unique IDs across all years for this template type
    // handles 
    const templates = this.getTemplates();
    this.logger.debug(`Getting IDs for year ${year} withLabels=${withLabels}, total templates: ${templates?.length}`);
    if (!templates) return [];
    const ids = new Set<string>();
    templates.forEach(template => {
      const [_, id, , templateYear] = template.id?.split('#');
      if (templateYear !== year) return;
      
      let label = id;
      if (this.nameField in template) {
        label = template[this.nameField as keyof T] as string;
      }

      if (id && withLabels) {
        ids.add(`${id}#${label}`);
      } else if (id) {
        ids.add(id);
      }
    });
    
    if (withLabels) {
      return Array.from(ids).map(id => {
        const [idPart, labelPart] = id.split('#');
        return { value: idPart, label: labelPart };
      });
    }
    return Array.from(ids);
  }

  public getTemplatesWithLabels(year?: string): { value: T; label: string }[] {
    const templates = this.getTemplates();
    if (!templates) return [];
    const filtered = year ? templates.filter(t => t.id.split('#')[3] === year) : templates;
    return filtered.map(template => ({
      value: template,
      label: (template[this.nameField as keyof T] as string) || template.id,
    }));
  }

  public reload() {
    this.templates.reload();
  }

  private idStr(id: string, year: string) {
    return `ID#${id}#YEAR#${year}`;
  }
}
