import * as d3 from 'npm:d3';

import { makeLeafColor } from './utils.js';

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
    const subnet = networkGroups[item.network].children[item.subnetwork];
    subnet.stackedValues[item.outcome] =
      (subnet.stackedValues[item.outcome] || 0) + count;
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

export function hierarchicalBarChart(networkData, width, sourceValue) {
  const compact = width < 640;
  const marginTop = compact ? 46 : 30;
  const marginRight = compact ? 12 : 30;
  const marginBottom = 0;
  const marginLeft = compact ? Math.max(90, Math.round(width * 0.34)) : 200;
  const barStep = 27;
  const duration = 750;
  const barPadding = 3 / barStep;

  const rows =
    sourceValue === 'DNS'
      ? (networkData || []).map((d) => ({
          ...d,
          outcome: d.outcome.includes(':')
            ? d.outcome.split(':')[0]
            : d.outcome,
        }))
      : networkData || [];

  const newdata = transformFlatData(rows);

  // down()/up() mutate the SVG in place without recording where they are, so
  // an exported image has no way to say which level it shows. Tracked here and
  // exposed on the returned node.
  let currentNode = null;

  const outcomeTotals = new Map();
  for (const row of rows) {
    if (!row.outcome) continue;
    const count = Number(row.total_count) || 0;
    outcomeTotals.set(
      row.outcome,
      (outcomeTotals.get(row.outcome) ?? 0) + count,
    );
  }
  const outcomeColor = makeLeafColor(outcomeTotals);
  // Heaviest first, so the legend reads dark to light in step with the shades.
  const outcomes = [...outcomeTotals.keys()].sort(
    (a, b) =>
      (outcomeTotals.get(b) ?? 0) - (outcomeTotals.get(a) ?? 0) ||
      a.localeCompare(b),
  );

  const legendRectSize = 14;
  const legendRowHeight = 20;
  const legendItemGap = 18;
  const legendColumns = compact
    ? 1
    : Math.max(1, Math.floor((width - marginLeft) / 240));
  const legendRows = Math.ceil(outcomes.length / legendColumns);
  const legendHeight = outcomes.length ? legendRows * legendRowHeight + 10 : 0;
  const chartTop = marginTop + legendHeight;

  let tooltip = d3.select('body .chart-tooltip');
  if (tooltip.empty()) {
    tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none');
  }

  let axisTooltip = d3.select('body .axis-tooltip');
  if (axisTooltip.empty()) {
    axisTooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'axis-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
  }

  const x = d3.scaleLinear().range([marginLeft, width - marginRight]);

  const yAxis = (g) =>
    g
      .attr('class', 'y-axis')
      .attr('transform', `translate(${marginLeft + 0.5},0)`);

  const xAxis = (g) =>
    g
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartTop})`)
      .call(d3.axisTop(x).ticks(compact ? 4 : width / 80, 's'))
      .call((sel) => {
        const s = sel.selection ? sel.selection() : sel;
        s.select('.domain').remove();
        s.selectAll('text')
          .attr('transform', compact ? 'rotate(-90)' : null)
          .attr('text-anchor', compact ? 'start' : 'middle')
          .attr('x', compact ? 4 : null)
          .attr('y', compact ? -2 : null)
          .attr('dy', compact ? '0.32em' : null);
      });

  function calculateHeight(d) {
    const numChildren = d.children ? d.children.length : 1;
    return chartTop + numChildren * barStep + 15 + marginBottom;
  }

  function processData(data) {
    const root = d3
      .hierarchy(data)
      .sum((d) =>
        d.stackedValues
          ? Object.values(d.stackedValues).reduce((a, b) => a + b, 0)
          : 0,
      )
      .sort((a, b) => b.value - a.value)
      .eachAfter(
        (d) =>
          (d.index = d.parent ? (d.parent.index = d.parent.index + 1 || 0) : 0),
      );
    root.children = root.children || [];
    return root;
  }

  function stagger() {
    let value = 0;
    return (d, i) => {
      const t = `translate(${x(value) - x(0)},${barStep * i})`;
      value += d.value;
      return t;
    };
  }

  function stack(i) {
    let value = 0;
    return (d) => {
      const t = `translate(${x(value) - x(0)},${barStep * i})`;
      value += d.value;
      return t;
    };
  }

  function createStacks(d) {
    if (!d.data.stackedValues) return [];
    const metrics = d.data.metrics || Object.keys(d.data.stackedValues);
    let cumulative = 0;
    return metrics.map((metric) => {
      const value = d.data.stackedValues[metric] || 0;
      const stack = {
        metric,
        value,
        start: cumulative,
        end: cumulative + value,
      };
      cumulative += value;
      return stack;
    });
  }

  function truncateText(name, maxChars) {
    if (name.length <= maxChars) return name;

    const as = /AS\d+/.exec(name);
    if (as) {
      const rest = name.slice(as.index + as[0].length).replace(/^[\s-]+/, '');
      const room = maxChars - as[0].length - 2;
      return room > 3 ? `${as[0]} ${rest.slice(0, room)}…` : as[0];
    }

    const head = Math.ceil((maxChars - 1) / 2);
    const tail = Math.floor((maxChars - 1) / 2);
    return `${name.slice(0, head)}…${name.slice(-tail)}`;
  }

  function down(svg, d) {
    if (!d.children || d3.active(svg.node())) return;
    currentNode = d;
    svg.select('.background').datum(d);
    const newHeight = calculateHeight(d);
    const transition1 = svg.transition().duration(duration);
    const transition2 = transition1.transition();

    svg
      .transition(transition1)
      .attr('height', newHeight)
      .attr('viewBox', [0, 0, width, newHeight]);
    svg.select('.background').transition(transition1).attr('height', newHeight);

    const exit = svg.selectAll('.enter').attr('class', 'exit');
    exit.selectAll('rect').attr('fill-opacity', (p) => (p === d ? 0 : null));
    exit.transition(transition1).attr('fill-opacity', 0).remove();

    const enter = bar(svg, down, d, '.y-axis').attr('fill-opacity', 0);
    enter.transition(transition1).attr('fill-opacity', 1);
    enter
      .selectAll('g')
      .attr('transform', stack(d.index))
      .transition(transition1)
      .attr('transform', stagger());

    const totalValue = d3.max(d.children, (child) =>
      Object.values(child.data.stackedValues || {}).reduce((a, b) => a + b, 0),
    );

    x.domain([0, totalValue]);
    svg.selectAll('.x-axis').transition(transition2).call(xAxis);
    enter
      .selectAll('g')
      .transition(transition2)
      .attr('transform', (d, i) => `translate(0,${barStep * i})`);
    enter
      .selectAll('.stack')
      .attr('fill-opacity', 1)
      .transition(transition2)
      .attr('x', (d) => x(d.start))
      .attr('width', (d) => x(d.end) - x(d.start));
  }

  function up(svg, d) {
    if (!d.parent || !svg.selectAll('.exit').empty()) return;
    currentNode = d.parent;
    svg.select('.background').datum(d.parent);
    const transition1 = svg.transition().duration(duration);
    const transition2 = transition1.transition();

    const newHeight = calculateHeight(d.parent);
    svg
      .transition(transition1)
      .attr('height', newHeight)
      .attr('viewBox', [0, 0, width, newHeight]);
    svg.select('.background').transition(transition1).attr('height', newHeight);

    const exit = svg.selectAll('.enter').attr('class', 'exit');
    const totalParentValue = d3.max(d.parent.children, (child) =>
      Object.values(child.data.stackedValues || {}).reduce((a, b) => a + b, 0),
    );
    x.domain([0, totalParentValue || 1]);

    svg.selectAll('.x-axis').transition(transition1).call(xAxis);
    exit.selectAll('g').transition(transition1).attr('transform', stagger());
    exit
      .selectAll('g')
      .transition(transition2)
      .attr('transform', stack(d.index));
    exit
      .selectAll('.stack')
      .transition(transition1)
      .attr('x', (d) => x(d.start))
      .attr('width', (d) => x(d.end) - x(d.start));
    exit.transition(transition2).attr('fill-opacity', 0).remove();

    const enter = bar(svg, down, d.parent, '.exit').attr('fill-opacity', 0);
    enter
      .selectAll('g')
      .attr('transform', (d, i) => `translate(0,${barStep * i})`);
    enter.transition(transition2).attr('fill-opacity', 1);
    enter
      .selectAll('.stack')
      .attr('fill-opacity', (p) => (p === d ? 0 : null))
      .transition(transition2)
      .attr('x', (d) => x(d.start))
      .attr('width', (d) => x(d.end) - x(d.start))
      .on('end', function () {
        d3.select(this).attr('fill-opacity', 1);
      });
  }

  function bar(svg, down, d, selector) {
    const g = svg
      .insert('g', selector)
      .attr('class', 'enter')
      .attr('transform', `translate(0,${chartTop + barStep * barPadding})`)
      .attr('text-anchor', 'end')
      .style('font', '10px sans-serif');

    const barGroup = g
      .selectAll('g')
      .data(d.children)
      .join('g')
      .attr('cursor', (d) => (!d.children ? null : 'pointer'))
      .on('click', (event, d) => down(svg, d));

    barGroup
      .append('text')
      .attr('x', marginLeft - 6)
      .attr('y', (barStep * (1 - barPadding)) / 2)
      .attr('dy', '.35em')
      .attr('font-size', compact ? '11px' : '14px')
      .attr('fill', '#17827B')
      .text((d) => {
        const charWidth = (compact ? 11 : 14) * 0.58;
        const maxChars = Math.max(
          6,
          Math.floor((marginLeft - 10) / charWidth) - (compact ? 1 : 0),
        );
        return truncateText(d.data.name, maxChars);
      })
      .on('mouseover', function (event, d) {
        if (d.data.name !== event.currentTarget.textContent) {
          axisTooltip.transition().duration(200).style('opacity', 0.9);
          axisTooltip
            .html(d.data.name)
            .style('left', event.pageX - 10 + 'px')
            .style('top', event.pageY - 28 + 'px');
        }
      })
      .on('mouseout', () =>
        axisTooltip.transition().duration(500).style('opacity', 0),
      );

    barGroup
      .selectAll('.stack')
      .data((d) => createStacks(d))
      .join('rect')
      .attr('class', 'stack')
      .attr('x', (d) => x(d.start))
      .attr('width', (d) => x(d.end) - x(d.start))
      .attr('height', barStep * (1 - barPadding))
      .attr('fill', (d) => outcomeColor(d.metric))
      .on('mouseover', function (event, d) {
        d3.select(this).style('opacity', 0.8);
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip
          .html(`${d.metric}: ${d3.format(',')(d.value)}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function () {
        d3.select(this).style('opacity', 1);
        tooltip.transition().duration(500).style('opacity', 0);
      });

    return g;
  }

  const root = processData(newdata);
  currentNode = root;
  const initialHeight = calculateHeight(root);

  const svg = d3
    .create('svg')
    .attr('viewBox', [0, 0, width, initialHeight])
    .attr('width', width)
    .attr('height', initialHeight)
    .style('max-width', '100%')
    .style('height', 'auto');

  const totalValue = d3.max(root.children || [], (child) =>
    Object.values(child.data.stackedValues || {}).reduce((a, b) => a + b, 0),
  );

  x.domain([0, totalValue || 1]);

  svg
    .append('rect')
    .attr('class', 'background')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .attr('width', width)
    .attr('height', initialHeight)
    .attr('cursor', 'pointer')
    .on('click', (event, d) => up(svg, d));

  if (outcomes.length) {
    const legend = svg
      .append('g')
      .attr('class', 'outcome-legend')
      .attr('transform', `translate(${marginLeft},12)`);

    const columnWidth =
      (width - marginLeft - marginRight) / legendColumns - legendItemGap;

    legend
      .selectAll('g')
      .data(outcomes)
      .join('g')
      .attr('transform', (d, i) => {
        const column = i % legendColumns;
        const row = Math.floor(i / legendColumns);
        return `translate(${column * (columnWidth + legendItemGap)},${
          row * legendRowHeight
        })`;
      })
      .call((entry) => {
        entry
          .append('rect')
          .attr('width', legendRectSize)
          .attr('height', legendRectSize)
          .attr('rx', 2)
          .attr('fill', (d) => outcomeColor(d));
        entry
          .append('text')
          .attr('x', legendRectSize + 6)
          .attr('y', legendRectSize / 2)
          .attr('dy', '0.35em')
          .attr('font-size', 11)
          .attr('fill', 'currentColor')
          .text((d) => d);
      });
  }

  svg.append('g').call(xAxis);
  svg.append('g').call(yAxis);

  const node = svg.node();

  node.currentView = () => ({
    depth: currentNode?.depth ?? 0,
    name: currentNode?.data?.name ?? null,
  });

  let isVisible = false;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isVisible) {
          isVisible = true;
          down(svg, root);
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 },
  );

  observer.observe(node);

  return node;
}
