jest.mock('@adapt/types', () => ({
  chartExplainTemplateParse: jest.fn(),
}));

jest.mock('../services/glossary.service', () => ({
  GlossaryService: class {},
}));

import { DataRepService } from './data-rep.service';

describe('DataRepService', () => {
  let service: DataRepService;

  beforeEach(() => {
    service = new DataRepService({} as any);
  });

  it('generates glossary ids that match rendered definition ids', () => {
    const rawData = {
      chart: {
        yAxisValue: 'count',
        data: [
          { label: 'A', count: 4 },
          { label: 'B', count: 2 },
        ],
      },
    };

    const result = service.processChartData(rawData, 'report-section');

    expect(result.glossaryIdsString).toBe(
      'report-section-series-item-definition-0 report-section-series-item-definition-1'
    );
  });
});
