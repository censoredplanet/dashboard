import * as d3 from 'npm:d3';

import { leafColor } from './utils.js';

export function createStackedBarChart(
  width,
  startDate,
  endDate,
  stackedBarData,
  source,
) {
  const height = 500;
  const originalMarginTop = 10;
  let marginTop = originalMarginTop;
  let marginBottom = 10;
  const marginRight = 10;
  const marginLeft = 40;
  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  const daySpan = (eDate - sDate) / (1000 * 60 * 60 * 24);
  const rotateLabels = daySpan > 60 || window.innerWidth <= 768;
  if (rotateLabels) marginBottom = 80;
  let data = stackedBarData;
  if (source.value === 'DNS') {
    data = stackedBarData.map((d) => ({
      ...d,
      outcome: d.outcome.includes(':') ? d.outcome.split(':')[0] : d.outcome,
    }));
  }
  const series = d3
    .stack()
    .keys(Array.from(new Set(data.map((d) => d.outcome))))
    .value(([, group], key) => {
      const match = group.find((d) => d.outcome === key);
      return match ? match.count : 0;
    })(d3.group(data, (d) => d.date));

  const legendItems = series
    .map((d) => d.key)
    .sort((a, b) => {
      const aFlag = a.startsWith('✅') ? 0 : 1;
      const bFlag = b.startsWith('✅') ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return 0;
    });
  const legendRectSize = 15;
  const paddingX = 10;
  const paddingY = 5;
  const itemMargin = 20;
  const available = width - marginLeft - marginRight;
  const approxItemWidth = legendRectSize + paddingX + 170 + itemMargin;
  const itemsPerRow = Math.max(1, Math.floor(available / approxItemWidth));
  const rowHeight = legendRectSize + paddingY + 4;
  const legendRows = Math.ceil(legendItems.length / itemsPerRow);
  const legendHeight = legendRows * rowHeight;

  marginTop += legendHeight + 10;
  const x = d3
    .scaleBand()
    .domain(
      Array.from(new Set(data.map((d) => d.date))).sort(
        (a, b) => new Date(a) - new Date(b),
      ),
    )
    .range([marginLeft, width - marginRight])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (s) => d3.max(s, (d) => d[1]))])
    .rangeRound([height - marginBottom, marginTop]);

  const yStart = d3
    .scaleLinear()
    .domain([0, d3.max(series, (s) => d3.max(s, (d) => d[1]))])
    .rangeRound([height - marginBottom, height - marginBottom]);

  const baseColors = {
    success: ['#0bba13', '#81C784'],
    error: ['#9e0202', '#C62828'],
    warning: ['#E65100', '#FFE0B2'],
    info: ['#263238', '#CFD8DC'],
  };
  const getCategory = (o) =>
    o.includes('✅')
      ? 'success'
      : o.includes('❗️')
        ? 'error'
        : o.includes('❓')
          ? 'warning'
          : o.includes('❔')
            ? 'info'
            : 'other';

  const colorMapping = {};
  Object.entries(
    series.reduce((acc, s) => {
      const cat = getCategory(s.key);
      (acc[cat] = acc[cat] || []).push(s.key);
      return acc;
    }, {}),
  ).forEach(([cat, keys]) => {
    const [c0, c1] = baseColors[cat] || ['#bbbbbb', '#bbbbbb'];
    const palette =
      keys.length > 1
        ? d3
            .range(keys.length)
            .map((i) => d3.interpolate(c0, c1)(i / (keys.length - 1)))
        : [c0];
    keys.forEach((k, i) => (colorMapping[k] = palette[i]));
  });

  const svg = d3
    .create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('max-width', '100%')
    .style('height', 'auto');

  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'rgba(0, 0, 0, 0.8)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none');

  const legendGroup = svg
    .append('g')
    .attr('transform', `translate(${marginLeft},${originalMarginTop})`);
  const entry = legendGroup
    .selectAll('g.legend')
    .data(legendItems)
    .join('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      return `translate(${col * approxItemWidth},${row * rowHeight})`;
    });
  entry
    .append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)
    .attr('fill', (d) => leafColor(d));
  entry
    .append('text')
    .attr('x', legendRectSize + paddingX)
    .attr('y', legendRectSize / 2)
    .attr('dy', '0.35em')
    .style('font-size', '12px')
    .style('fill', '#17827B')
    .text((d) => (d.length > 25 ? d.slice(0, 25) + '…' : d));

  const barGroups = svg
    .append('g')
    .selectAll('g')
    .data(series)
    .join('g')
    .attr('fill', (d) => colorMapping[d.key]);
  const bars = barGroups
    .selectAll('rect')
    .data((d) => d.map((v) => ({ ...v, key: d.key })))
    .join('rect')
    .attr('x', (d) => x(d.data[0]))
    .attr('y', (d) => yStart(d[1]))
    .attr('height', 0)
    .attr('width', x.bandwidth())
    .style('opacity', 0);

  bars
    .on('mouseover', function (event, d) {
      tooltip
        .html(
          `
        <strong>Date:</strong> ${d.data[0]}<br/>
        <strong>Outcome:</strong> ${d.key}<br/>
        <strong>Count:</strong> ${d3.format(',')(d[1] - d[0])}
      `,
        )
        .style('visibility', 'visible');
      d3.select(this).style('stroke', 'white').style('stroke-width', '1px');
    })
    .on('mousemove', function (event) {
      tooltip
        .style('top', event.pageY - 10 + 'px')
        .style('left', event.pageX + 10 + 'px');
    })
    .on('mouseout', function () {
      tooltip.style('visibility', 'hidden');
      d3.select(this).style('stroke', 'none');
    });

  const xAxisG = svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  if (window.innerWidth <= 768 && daySpan > 90) {
    xAxisG.selectAll('.tick').remove();
  } else if (rotateLabels) {
    xAxisG
      .selectAll('text')
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.6em')
      .attr('dy', '-0.4em');
  }

  xAxisG.call((g) => g.selectAll('.domain').remove());
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          bars
            .transition()
            .duration(1000)
            .delay((d, i) => i * 10)
            .attr('y', (d) => y(d[1]))
            .attr('height', (d) => y(d[0]) - y(d[1]))
            .style('opacity', 1);
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 },
  );
  observer.observe(svg.node());

  return svg.node();
}
