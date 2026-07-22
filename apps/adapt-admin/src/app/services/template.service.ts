import {
  ITemplate,
  ISummaryTemplate,
  StringTemplate,
  TemplateContext,
  IRenderedTemplate,
  DataSummarySection,
  DataSummarySubSection,
  ITemplateFilters,
  IFilter,
  IFilterGroup,
  ITemplatePage,
  ISection,
  SectionType,
  getPercentage,
  QuickSummary,
  QuickSummarySection,
  TemplateError,
  TemplateErrorCode,
  DataSet,
  DataViewModel,
  TemplateFunction,
  HeaderBlock,
  CommentBlock,
} from '@adapt/types';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { AdaptDataService } from './adapt-data.service';
import { BUILT_IN_FUNCTIONS } from './template-functions/template-functions';
import { firstValueFrom, tap } from 'rxjs';
import { GlossaryService } from '@adapt/adapt-shared-component-lib';
import { NGXLogger } from 'ngx-logger';
import { AdaptDataViewService } from '@adapt-apps/adapt-admin/src/app/services/adapt-data-view.service';



@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  private readonly DATA_VIEW_SELECTOR = "dataView";
  private templateFunctions: { [funcName: string]: (...args: any[]) => Promise<string> | string } = {};

  constructor(private logger: NGXLogger,
              private http: HttpClient,
              private adaptDataService: AdaptDataService,
              private adaptDataViewService: AdaptDataViewService,
              private glossary: GlossaryService
  ) {
    this.logger.info('TemplateService constructor');

    BUILT_IN_FUNCTIONS.forEach(({ name, func }) => this.registerTemplateFunction(name, func));
  }

  public registerTemplateFunction(name: string, func: (...args: any[]) => Promise<string> | string) {
    this.templateFunctions[name] = func;
  }

  public getTemplate(name: string, isURL = false) {
    return this.http.get<ITemplate | ISummaryTemplate>(isURL ? name : `assets/templates/${name}.json`);
  }

  public getTemplatePromise(name: string, isURL = false) {
    return firstValueFrom(this.getTemplate(name, isURL));
  }

  private async handleDataViewSelect(code: string, context: TemplateContext){

    const select = code.split(".");

    const field = select[1];

    const dataView = this.adaptDataViewService.dataViews$$.value().find(item => item.dataViewID === context.dataViewID);

    if(!dataView){
      throw new Error(`Data view ${context.dataViewID} not found`);
    }


    switch(field){
      case 'fields':{
        const fieldSelect = select[2];

        if(!fieldSelect){
          throw new Error(`Field ${select[2]} not found`);
        }

        const dataViewField = dataView.data.fields.find(item => item.id === fieldSelect);

        return dataViewField?.label ?? '';
      }
      default: {
        // just try and grab whatever field for now
        return `${(dataView as any).data[field] ?? ''}`
      }
    }


  }

  public async parseString(string: StringTemplate | string, context: TemplateContext) {
    if (typeof string === 'string') {
      return string;
    }
    const parseRegex = /{{(.+?)}}/g;

    const combinedContext = {
      ...context,
      ...this.templateFunctions,
      dataService: this.adaptDataService,
      glossaryService: this.glossary,
    };

    const promiseMap: Record<string, Promise<string>> = {};
    const extraPromises: Promise<any>[] = [];

    const template = string.template;

    const variables = string.variables;

    const hasFilters = !!Object.keys(context?.appliedFilters || {}).length;

    const sortableArgs = this.getSortableCategoryArgs(context);

    for (const [variable, functions] of Object.entries(variables)) {
      template.replaceAll(parseRegex, (match, code) => {

        if(code.startsWith(this.DATA_VIEW_SELECTOR)){
          const promise = this.handleDataViewSelect(code, context);

          promiseMap[code] = promise

          return '';
        }

        if (!code.split('.').includes(variable)) {
          return '';
        }

        const extra = this.getFuncs(
          functions,
          hasFilters,
          context,
          sortableArgs,
          combinedContext,
          promiseMap,
          variable
        );

        extraPromises.push(...extra);

        return '';
      });
    }


    await Promise.all(extraPromises);
    const mapPromises = Object.entries(promiseMap).map(async ([key, promise]) => ({ key, promise: await promise }));
    const awaitedMapPromises = await Promise.all(mapPromises);

    const reducedMapPromises = awaitedMapPromises.reduce(
      (accum, val) => Object.assign(accum, { [val.key]: val.promise }),
      {} as Record<string, string>
    );

    return template.replaceAll(parseRegex, (match, code) => {
      return reducedMapPromises[code] || '';
    });
  }

  private getFuncs(
    functions: TemplateFunction,
    hasFilters: boolean,
    context: TemplateContext,
    sortableArgs: { field: string; array: boolean; operator: string; type: string; value: string[] } | undefined,
    combinedContext: {
      dataService: AdaptDataService;
      glossaryService: GlossaryService;
      dataViewID: string;
      fileSpec: string;
      templateFilters?: Record<string, IFilter<unknown>>;
      appliedFilters?: any;
      suppress: boolean;
      template: ITemplate | ISummaryTemplate;
    },
    promises: Record<string, Promise<string>>,
    code: string
  ) {
    let funcDecl = `${functions.function}(${functions.args.map((arg) => JSON.stringify(arg)).join(',')}`;
    if (hasFilters && !functions.function.startsWith("unfiltered")) {
      for (const [code, value] of Object.entries(context.appliedFilters)) {
        const templateFilter = context!.templateFilters?.[code];

        if (!templateFilter) {
          throw 'unknown filter ' + code;
        }

        const valArray = [value].flat().filter((val) => val !== 'all');

        let newArgs: string[] = [];

        if (valArray.length > 1) {
          // assume OR for now!
          const operator = 'OR';

          const arg = {
            field: templateFilter.field,
            operator,
            array: true,
            type: templateFilter.dataType || 'string',
            value: [valArray].flat(),
          };

          newArgs.push(JSON.stringify(arg));
        } else {
          newArgs = valArray.map((val) =>
            JSON.stringify({ field: templateFilter.field, type: templateFilter.dataType || 'string', value: val })
          );
        }

        if (sortableArgs) newArgs.push(JSON.stringify(sortableArgs));

        funcDecl += (newArgs.length ? ',' : '') + newArgs.join(',');
      }
    }

    const func = new Function(`return this.${funcDecl})`).bind(combinedContext);

    const funcPromise = func();

    promises[code] = funcPromise;

    const dependentPromises: Promise<any>[] = [];

    if (functions.dependents && Object.keys(functions.dependents).length > 0) {
      for (const [key, value] of Object.entries(functions.dependents)) {
        const promise = funcPromise.then((result: any) => {
          for (const arg of value.args) {
            if (!arg.parent) continue;

            delete arg.parent;
            arg['value'] = result;
          }

          this.getFuncs(value, hasFilters, context, sortableArgs, combinedContext, promises, `${code}.${key}`);
        });

        dependentPromises.push(promise);
      }
    }

    return dependentPromises;
  }

  public renderTemplateAsync(template: ITemplate, dataViewID: string, fileSpec: string, suppress = false) {
    const renderedTemplate: IRenderedTemplate = {
      id: template.id,
      title: template.title,
      description: template.description,
      sections: [],
    };
    const ctx = { dataViewID, fileSpec, template, suppress };

    if (template.pages) {
      renderedTemplate.pages = this.handlePages(structuredClone(template.pages), ctx);
    }

    if (template.sections) {
      renderedTemplate.sections = this.handleSections(structuredClone(template.sections), ctx);
    }

    return renderedTemplate;
  }

  public async renderSummaryTemplate(
    template: ISummaryTemplate,
    dataViewID: string,
    fileSpec: string,
    suppress = false
  ): Promise<ISummaryTemplate> {
    const renderedTemplate: ISummaryTemplate = {
      id: template.id,
      title: template.title,
      description: template.description,
      infoFields: [],
      dataSummary: [],
    };
    const ctx = { dataViewID, fileSpec, template, suppress };

    renderedTemplate.infoFields = await Promise.all(this.handleInfoFields(template.infoFields, ctx));
    renderedTemplate.dataSummary = await Promise.all(this.handleDataSummary(template.dataSummary, ctx));

    return renderedTemplate as ISummaryTemplate;
  }

  private handleDataSummary(dataSummary: DataSummarySection[], ctx: TemplateContext) {
    return dataSummary.map(async (summary) => {
      const result = await Promise.all([
        this.parseString(summary.label, ctx),
        ...this.handleSubSections(summary.sections, ctx),
      ]);

      const [label] = result;

      const sections = result.slice(1) as any;

      return { label, sections };
    });
  }

  private handleSubSections(subSections: DataSummarySubSection[], ctx: TemplateContext) {
    return subSections.map(async (section) => {
      const result = await Promise.all([
        this.parseString(section.label, ctx),
        this.parseString(section.value, ctx),
        ...this.handleInfoFields(section.sections, ctx),
      ]);

      const [label, value] = result;
      const sections = result.slice(2) as any;

      return { label, value, sections };
    });
  }

  private handleInfoFields(infoFields: any[], ctx: TemplateContext) {
    return infoFields.map(async (field) => {
      const [label, value] = await Promise.all([
        this.parseString(field.label, ctx),
        this.parseString(field.value, ctx),
      ]);

      return { label, value };
    });
  }

  public async renderTemplateWithMultipleViews(
    template: ITemplate,
    dataView: DataViewModel,
    filters: any = {},
    suppress = false,
    pageIndex = -1
  ) {
    const renderedTemplate: ITemplate = {
      id: template.id,
      multiFile: template.multiFile ?? true,
      sortableCategories: template.sortableCategories,
      suppression: template.suppression,
      filters: template.filters,
      title: template.title,
      description: template.description,
      conditionalFilters: template.conditionalFilters,
      pages: [],
    };

    const templateFilters = this.flattenFilters(template.filters || {});

    //
    const contexts = [
      { dataViewID: dataView.dataViewID, fileSpec: 'all', template, templateFilters, suppress },
      ...dataView.data.files.map((file) => ({
        dataViewID: dataView.dataViewID,
        fileSpec: file.id,
        template,
        templateFilters,
        appliedFilters: filters,
        suppress,
      })),
    ];

    for (const [i, page] of (template.pages as ITemplatePage[]).entries()) {
      // handle page condition filters

      const filtersToApply: any = {};

      for (const code of Object.keys(filters)) {
        const tempFilter = templateFilters[code];

        if (!tempFilter.condition?.pages?.length || tempFilter?.condition?.pages?.includes(page.id)) {
          filtersToApply[code] = filters[code];
        }
      }

      (renderedTemplate.pages as ITemplatePage[])[i] = await this.handlePage(page, {
        ...(template.multiFile === false
          ? contexts[1]
          : contexts?.[i] || {
              dataViewID: dataView.dataViewID,
              fileSpec: 'all',
              template,
              templateFilters,
              appliedFilters: filtersToApply,
              suppress,
            }),
        appliedFilters: filtersToApply,
      });
    }
    return renderedTemplate;
  }

  public async renderTemplate(
    template: ITemplate,
    dataViewID: string,
    fileSpec: string,
    filters: any = {},
    suppress = false
  ): Promise<ITemplate> {
    const renderedTemplate: ITemplate = {
      id: template.id,
      multiFile: template.multiFile ?? true,
      sortableCategories: template.sortableCategories,
      filters: template.filters,
      suppression: template.suppression,
      title: template.title,
      description: template.description,
      conditionalFilters: template.conditionalFilters,
      sections: [],
    };
    const ctx = {
      dataViewID,
      fileSpec,
      template,
      templateFilters: this.flattenFilters(template.filters),
      appliedFilters: filters,
      suppress,
    };

    if (template.pages) {
      renderedTemplate.pages = await this.handlePages(template.pages, ctx);
      return renderedTemplate as any;
    }

    if (template.sections) {
      renderedTemplate.sections = await Promise.all(this.handleSections(structuredClone(template.sections), ctx));

      return renderedTemplate as any;
    }

    throw new Error('Invalid template');
  }

  private flattenFilters(filters: ITemplateFilters): Record<string, IFilter<unknown>> {
    return Object.keys(filters).reduce((accum, key) => {
      if ('code' in filters[key]) {
        if ((filters[key] as IFilter<unknown>).children) {
          return Object.assign(accum, {
            [key]: filters[key],
            ...this.flattenFilters((filters[key] as IFilter<unknown>).children),
          });
        }

        // iFilter
        return Object.assign(accum, { [key]: filters[key] });
      } else if ('exclusive' in filters[key]) {
        // IFilterGroup
        return Object.assign(accum, { ...this.flattenFilters((filters[key] as IFilterGroup).filters) });
      }

      return accum;
    }, {});
  }

  private async handlePage(page: ITemplatePage, ctx: TemplateContext) {
    page.context = ctx;
    page.sections = await Promise.all(this.handleSections(page.sections, ctx));
    return page;
  }

  private async handlePages(pages: ITemplatePage[], ctx: TemplateContext) {
    await Promise.all(
      pages.map(async (page) => {
        page.sections = await Promise.all(this.handleSections(page.sections, ctx));
      })
    );

    return pages;
  }

  private handleSections(sections: ISection[], ctx: TemplateContext) {
    const promises = [];

    for (const section of sections) {
      switch (section.type) {
        case SectionType.QuickSummary: {
          promises.push(this.handleQuickSummary(section, ctx));
          break;
        }
        case SectionType.BarChartGrouped:
        case SectionType.BarChart: {
          promises.push(this.handleBarChart(section, ctx));
          break;
        }
        case SectionType.GridContainer: {
          promises.push(this.handleGridView(section, ctx));
          break;
        }
        case SectionType.CountBreakdown: {
          promises.push(this.handleCountBreakdown(section, ctx));
          break;
        }
        case SectionType.Header: {
          promises.push(this.handleHeaderBlock(section, ctx));
          break;
        }
        case SectionType.Comment: {
          promises.push(this.handleCommentBlock(section, ctx));
          break;
        }
      }
    }

    return promises;
  }

  private async handleCommentBlock(section: ISection, ctx: TemplateContext | any) {
    const headerBlock = section.content as CommentBlock;

    const [label, body] = await Promise.all([
      this.parseString(headerBlock.label, ctx),
      this.parseString(headerBlock.body, ctx),
    ]);

    headerBlock.label = label;
    headerBlock.body = body;
    section.content = headerBlock;
    return section;
  }

  private async handleHeaderBlock(section: ISection, ctx: TemplateContext | any) {
    const headerBlock = section.content as HeaderBlock;

    const [text, body] = await Promise.all([
      this.parseString(headerBlock.text, ctx),
      this.parseString(headerBlock.body, ctx),
    ]);

    headerBlock.text = text;
    headerBlock.body = body;
    section.content = headerBlock;
    return section;
  }

  private async handleCountBreakdown(section: ISection, ctx: TemplateContext | any) {
    const tmpCtx = { ...ctx };

    const content = section.content as any;

    for (const [code, value] of Object.entries(ctx.appliedFilters)) {
      const templateFilter = ctx!.templateFilters?.[code];

      if (!templateFilter) {
        throw 'unknown filter ' + code;
      }

      const valArray = [value].flat();

      const newArgs = valArray.map((val) => {
        content.dataRetrievalOperations[0].id += `${templateFilter.field}-${val}`;
        return { field: templateFilter.field, type: templateFilter.dataType || 'string', value: val };
      });

      content.dataRetrievalOperations[0].arguments.push(...newArgs);
    }

    const data = await this.adaptDataService
      .getDataFromDataViewPromise(
        ctx.dataViewID,
        ctx.fileSpec,
        content.dataRetrievalOperations,
        ctx.template.suppression,
        ctx.suppress
      )
      .then((result) => result.operationResults[0].value);

    data.forEach((item: any) => (tmpCtx[item[content.labelField]] = getPercentage(data, item, 'StudentCount')));

    const [title, description] = await Promise.all([
      this.parseString(content.title, tmpCtx),
      this.parseString(content.description, tmpCtx),
    ]);

    if (content['caption']) {
      content.caption = await this.parseString(content.caption, tmpCtx);
    }

    content.title = title;
    content.description = description;
    content.data = data;

    // delete content.dataRetrievalOperations

    return section;
  }

  private async handleQuickSummary(section: ISection, ctx: TemplateContext) {
    const content = section.content as QuickSummary;

    content.heading = await this.parseString(content.heading, ctx);

    const validSections: QuickSummarySection[] = [];

    for (const section of content.sections) {
      try {
        const [title, body] = await Promise.all([
          this.parseString(section.title, ctx),
          this.parseString(section.body, ctx),
        ]);

        section.title = title;
        section.body = body;

        validSections.push(section);
      } catch (err) {
        if (!(err instanceof TemplateError)) {
          throw err;
        }

        switch ((err as TemplateError).code) {
          case TemplateErrorCode.SUPPRESSION: {
            console.log(`Template Field ${section.title} has suppressed fields`);
            break;
          }
          case TemplateErrorCode.BACKEND_FAILURE: {
            throw err;
          }
        }
      }
    }

    // await Promise.all(content.sections.map(async (sect) => {

    //   sect.title = await ;
    //   sect.body = await this.parseString(sect.body, ctx);

    // }));

    content.sections = validSections;

    return section;
  }

  private async handleBarChart(section: ISection, ctx: TemplateContext) {
    const content: any = section.content;

    if (section.type === SectionType.BarChart) {
      const [title, description] = await Promise.all([
        this.parseString(content.title, ctx),
        this.parseString(content.description, ctx),
      ]);

      content.title = title;
      content.description = description;
    } else if (section.type === SectionType.BarChartGrouped) {
      const title = await this.parseString(content.title, ctx);

      content.title = title;
    }

    const operations = [];

    const arg = this.getSortableCategoryArgs(ctx);

    if (arg) content.chart.dataRetrievalOperations[0].arguments.push(arg);

    for (const [code, value] of Object.entries(ctx.appliedFilters)) {
      const templateFilter = ctx!.templateFilters?.[code];

      if (!templateFilter) {
        throw 'unknown filter ' + code;
      }

      const valArray = [value].flat().filter((val) => val !== 'all');

      let newArgs: any[] = [];

      if (valArray.length > 1) {
        // assume OR for now!
        const operator = 'OR';

        const arg = {
          field: templateFilter.field,
          operator,
          array: true,
          type: templateFilter.dataType || 'string',
          value: [valArray].flat(),
        };

        content.chart.dataRetrievalOperations[0].id += `-${ctx.fileSpec}-${templateFilter.field}-${valArray.join(',')}`;

        if (content.chart?.total?.id) {
          content.chart.total.id += `-${ctx.fileSpec}-${templateFilter.field}-${valArray.join(',')}`;
        }

        newArgs.push(arg);
      } else {
        newArgs = valArray.map((val) => {
          content.chart.dataRetrievalOperations[0].id += `-${templateFilter.field}-${val}`;

          if (content.chart?.total?.id) {
            content.chart.total.id += `-${ctx.fileSpec}-${templateFilter.field}-${val}`;
          }
          return { field: templateFilter.field, type: 'string', value: `${val}` };
        });
      }

      content.chart.dataRetrievalOperations[0].arguments.push(...newArgs);

      if (content.chart?.total && typeof content.chart.total === 'object') {
        content.chart.total.arguments.push(...newArgs);
      }
    }

    operations.push(...content.chart.dataRetrievalOperations);

    if (content.chart.total && typeof content.chart.total === 'object') {
      operations.push(content.chart.total);
    }

    const dataServiceResult = await this.adaptDataService
      .getDataFromDataViewPromise(
        ctx.dataViewID,
        ctx.fileSpec,
        operations,
        (ctx.template as ITemplate).suppression,
        ctx.suppress
      )
      .then((result) => result.operationResults);

     content.chart.data = dataServiceResult;
    //  content.chart.subTotals = dataServiceResult.map((data) => ({id: data.id}));

    if (content.chart.total && typeof content.chart.total === 'object') {
      const total = dataServiceResult.pop()
      content.chart.total = total?.value ?? 0;
    }

    return section;
  }

  private getSortableCategoryArgs(ctx: TemplateContext) {
    const sortableCategories = (ctx.template as ITemplate)?.sortableCategories;

    if (!sortableCategories) return;

    const sortableCategoriesKeys = Object.entries(sortableCategories.categories);

    if (ctx.fileSpec !== 'all' || !sortableCategoriesKeys?.length) return;

    const cleanedFilters = Object.keys(ctx.appliedFilters).filter((key) => {
      if (Array.isArray(ctx.appliedFilters[key]))
        return ctx.appliedFilters[key].length && ctx.appliedFilters[key].every((item: any) => item !== null);

      return ctx.appliedFilters[key] !== null;
    });

    const mappedCodes = cleanedFilters.map(
      (key: string) => (ctx.templateFilters?.[key] as IFilter<unknown>).field
    ) as string[];

    const arg = {
      field: sortableCategories.categoryField,
      array: true,
      operator: 'OR',
      type: 'string',
      value: [] as string[],
    };

    const categories = new Set<string>();

    for (const [specKey, spec] of sortableCategoriesKeys) {
      for (const [catKey, category] of Object.entries(spec)) {
        if (mappedCodes.length > 0 && mappedCodes.every((code: string) => category.includes(code))) {
          categories.add(catKey);
          break;
        }
      }
    }

    const cats = [...categories];

    if (!cats.length) return;

    arg.value = cats;

    // debugger;
    return arg;
  }

  private async handleGridView(section: ISection, ctx: TemplateContext) {
    const { columns } = section.content as any;

    for (const column of columns) {
      column.rows = await Promise.all(this.handleSections(column.rows, ctx));
    }

    return section;
  }

  private isDependent(code: string) {
    const dependentRegex = new RegExp(/(\w+\.)+\w+/g);
    return dependentRegex.test(code);
  }








}


