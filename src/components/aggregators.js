import _ from 'npm:lodash';

export function aggregateMetricsBySubnetwork(data) {
  return _(data)
    .groupBy((row) =>
      [row.domain, row.category, row.network, row.subnetwork].join('|'),
    )
    .map((group) => {
      const totalProbeCount = _.sumBy(group, (row) =>
        parseInt(row.probe_count, 10),
      );
      const totalUnexpected = _.sumBy(group, (row) =>
        parseInt(row.unexpected_count, 10),
      );
      const unexpectedRate = (totalUnexpected / totalProbeCount) * 100;
      const baseRow = _.pick(group[0], [
        'domain',
        'category',
        'network',
        'subnetwork',
      ]);
      return {
        ...baseRow,
        probe_count: totalProbeCount,
        unexpected_rate: _.round(unexpectedRate, 2),
      };
    })
    .value();
}

export function aggregateByDateOutcome(data) {
  return _(data)
    .groupBy((row) => `${row.date}|${row.outcome}`)
    .map((group) => {
      const totalCount = _.sumBy(group, (row) => parseInt(row.probe_count, 10));

      return {
        date: group[0].date,
        outcome: group[0].outcome,
        count: String(totalCount),
      };
    })
    .orderBy(['date', 'outcome'])
    .value();
}

export function aggregateByNetwork(data) {
  return _(data)
    .groupBy((row) =>
      [row.network, row.subnetwork, row.category, row.domain, row.outcome].join(
        '|',
      ),
    )
    .map((group) => {
      const totalCount = _.sumBy(group, (row) => parseInt(row.probe_count, 10));
      return {
        network: group[0].network,
        subnetwork: group[0].subnetwork,
        category: group[0].category,
        domain: group[0].domain,
        outcome: group[0].outcome,
        total_count: String(totalCount),
      };
    })
    .orderBy(['network', 'subnetwork', 'category', 'domain', 'outcome'])
    .value();
}

export function transformFlatData(flatData) {
  const networkGroups = {};
  flatData.forEach((item) => {
    if (!networkGroups[item.network]) {
      networkGroups[item.network] = {
        name: item.network,
        children: {},
        stackedValues: {},
      };
    }

    if (!networkGroups[item.network].children[item.subnetwork]) {
      networkGroups[item.network].children[item.subnetwork] = {
        name: item.subnetwork,
        stackedValues: {},
      };
    }
    const count = parseInt(item.total_count);
    networkGroups[item.network].children[item.subnetwork].stackedValues[
      item.outcome
    ] = count;
    networkGroups[item.network].stackedValues[item.outcome] =
      (networkGroups[item.network].stackedValues[item.outcome] || 0) + count;
  });
  return {
    name: 'Root',
    children: Object.values(networkGroups).map((network) => ({
      name: network.name,
      stackedValues: network.stackedValues,
      metrics: Object.keys(network.stackedValues),
      children: Object.values(network.children).map((subnet) => ({
        name: subnet.name,
        stackedValues: subnet.stackedValues,
        metrics: Object.keys(subnet.stackedValues),
      })),
    })),
  };
}
