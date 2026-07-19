import * as Inputs from 'npm:@observablehq/inputs';

import { sparkbar } from './utils.js';
import { downloadLinks } from './data-download.js';

export function createResponsiveTable(searchResult, width, context) {
  const { country, start, end, source } = context;

  const compact = width < 640;
  const table = Inputs.table(searchResult, {
    sort: 'unexpected_rate',
    reverse: true,
    rows: compact ? 12 : 20,
    width: width,
    maxWidth: width,
    layout: compact ? 'auto' : 'fixed',
    select: false,
    format: {
      unexpected_rate: sparkbar(),
    },
    align: {
      probe_count: 'center',
    },
  });

  const footer = downloadLinks(
    searchResult,
    'cp-observatory',
    'results',
    country,
    start,
    end,
    source,
  );

  const container = document.createElement('div');
  container.className = 'observatory-table';

  container.append(table);
  container.append(footer);

  return container;
}
