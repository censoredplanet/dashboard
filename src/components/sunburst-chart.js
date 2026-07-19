import * as d3 from 'npm:d3';

import { leafColor } from './utils.js';

const color = d3
  .scaleOrdinal()
  .domain([
    'network',
    'subnetwork',
    'category',
    'domain',
    'outcome',
    'total_count',
  ])
  .range(['#5d85cf', '#7c6561', '#da7847', '#6fb971', '#9e70cf', '#bbbbbb']);

const breadcrumbHeight = 30;

const getResponsiveBreadcrumb = (windowWidth) => {
  if (windowWidth <= 480) {
    return { width: 70, textLength: 10, fontSize: 10, showPercentage: false };
  } else if (windowWidth <= 768) {
    return { width: 150, textLength: 15, fontSize: 14, showPercentage: true };
  } else {
    return { width: 250, textLength: 20, fontSize: 16, showPercentage: true };
  }
};

function getBreadcrumbPoints(width, height) {
  return function (d, i) {
    const tipWidth = 10;
    const points = [];
    points.push('0,0');
    points.push(`${width},0`);
    points.push(`${width + tipWidth},${height / 2}`);
    points.push(`${width},${height}`);
    points.push(`0,${height}`);
    if (i > 0) {
      points.push(`${tipWidth},${height / 2}`);
    }
    return points.join(' ');
  };
}

const transformData = (data, sourceValue) => {
  const rows =
    sourceValue === 'DNS'
      ? data.map((d) => ({
          ...d,
          outcome: d.outcome.includes(':')
            ? d.outcome.split(':')[0]
            : d.outcome,
        }))
      : data;

  const groupBy = (array, key) => {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  };

  const hierarchy = { name: 'root', children: [] };
  const networkGroups = groupBy(rows, 'network');

  hierarchy.children = Object.entries(networkGroups).map(
    ([network, networkData]) => {
      const subnetworkGroups = groupBy(networkData, 'subnetwork');
      return {
        name: network,
        children: Object.entries(subnetworkGroups).map(
          ([subnetwork, subnetworkData]) => {
            const categoryGroups = groupBy(subnetworkData, 'category');
            return {
              name: subnetwork,
              children: Object.entries(categoryGroups).map(
                ([category, categoryData]) => {
                  const domainGroups = groupBy(categoryData, 'domain');
                  return {
                    name: category,
                    children: Object.entries(domainGroups).map(
                      ([domain, domainData]) => {
                        const outcomeGroups = groupBy(domainData, 'outcome');
                        return {
                          name: domain,
                          children: Object.entries(outcomeGroups).map(
                            ([outcome, outcomeData]) => ({
                              name: outcome,
                              value: outcomeData.reduce(
                                (sum, item) =>
                                  sum + parseInt(item.total_count, 10),
                                0,
                              ),
                            }),
                          ),
                        };
                      },
                    ),
                  };
                },
              ),
            };
          },
        ),
      };
    },
  );

  return hierarchy;
};

function breadcrumb(datasun, windowWidth) {
  const config = getResponsiveBreadcrumb(windowWidth);
  const breadcrumbWidth = config.width;
  const count = datasun.sequence.length || 0;
  const showPercentage = config.showPercentage && datasun.percentage > 0;
  const percentageWidth = showPercentage ? config.fontSize * 4 : 0;
  const totalSvgWidth = Math.max(
    breadcrumbWidth * 2,
    count * breadcrumbWidth + 20 + percentageWidth,
  );

  const svg = d3
    .create('svg')
    .attr('viewBox', `0 0 ${totalSvgWidth} ${breadcrumbHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('max-width', `${totalSvgWidth}px`)
    .style('height', 'auto')
    .style('font', `${config.fontSize}px sans-serif`)
    .style('margin', '5px 0');

  const g = svg
    .selectAll('g')
    .data(datasun.sequence)
    .join('g')
    .attr('transform', (d, i) => `translate(${i * breadcrumbWidth}, 0)`);

  g.append('polygon')
    .attr('points', getBreadcrumbPoints(breadcrumbWidth, breadcrumbHeight))
    .attr('fill', (d) => {
      const name = d.data.name;
      if (
        name.startsWith('✅') ||
        name.startsWith('❗️') ||
        name.startsWith('❓') ||
        name.startsWith('❔')
      ) {
        return leafColor(name);
      }
      return color(name);
    })
    .attr('stroke', 'white')
    .attr('stroke-width', '1');

  g.append('text')
    .attr('x', (breadcrumbWidth + 10) / 2)
    .attr('y', breadcrumbHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'middle')
    .style('fill', 'white')
    .style('pointer-events', 'none')
    .text((d) => {
      const name = d.data.name;
      const maxLength = config.textLength;
      return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
    });

  if (showPercentage) {
    svg
      .append('text')
      .text(datasun.percentage + '%')
      .attr('x', count * breadcrumbWidth + 15)
      .attr('y', breadcrumbHeight / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#17827B')
      .style('font-weight', 'bold')
      .attr('text-anchor', 'start');
  }

  return svg.node();
}

function sunburst(width, networkData, sourceValue) {
  const radius = width / 2;
  const hierarchicalData = transformData(networkData, sourceValue);

  const partition = (data) =>
    d3.partition().size([2 * Math.PI, radius * radius])(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value),
    );

  const root = partition(hierarchicalData);
  const svg = d3.create('svg');
  const element = svg.node();
  element.value = { sequence: [], percentage: 0.0 };
  const baseFontSize = Math.max(10, width / 40);

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(1 / radius)
    .padRadius(radius)
    .innerRadius((d) => Math.sqrt(d.y0))
    .outerRadius((d) => Math.sqrt(d.y1) - 1);

  const mousearc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => Math.sqrt(d.y0))
    .outerRadius(radius);

  const zeroArc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(1 / radius)
    .padRadius(radius)
    .innerRadius(0)
    .outerRadius(0);

  const label = svg
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('fill', '#888')
    .style('visibility', 'hidden');

  label
    .append('tspan')
    .attr('class', 'percentage')
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', '-0.1em')
    .attr('font-size', `${baseFontSize * 3}px`)
    .attr('font-weight', 'bold')
    .text('');

  label
    .append('tspan')
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', '1.5em')
    .attr('font-size', `${baseFontSize}px`)
    .text('of measurements');

  svg
    .attr('viewBox', `${-radius} ${-radius} ${width} ${width}`)
    .style('max-width', `${width}px`)
    .style('font-family', 'sans-serif');

  const path = svg
    .append('g')
    .selectAll('path')
    .data(root.descendants().filter((d) => d.depth && d.x1 - d.x0 > 0.001))
    .join('path')
    .attr('fill', (d) => {
      if (!d.children) return leafColor(d.data.name);
      return color(d.data.name);
    })
    .attr('d', zeroArc)
    .style('opacity', 0);

  const triggerAnimation = () => {
    path
      .transition()
      .duration(1000)
      .delay((d, i) => i * 2)
      .attr('d', arc)
      .style('opacity', 1)
      .ease(d3.easeCircleOut);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          triggerAnimation();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 },
  );

  observer.observe(element);

  svg
    .append('g')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      path.attr('fill-opacity', 1);
      label.style('visibility', 'hidden');
      element.value = { sequence: [], percentage: 0.0 };
      element.dispatchEvent(new CustomEvent('input'));
    })
    .selectAll('path')
    .data(root.descendants().filter((d) => d.depth && d.x1 - d.x0 > 0.001))
    .join('path')
    .attr('d', mousearc)
    .on('pointerenter', (event, d) => {
      const sequence = d.ancestors().reverse().slice(1);
      path.attr('fill-opacity', (node) =>
        sequence.indexOf(node) >= 0 ? 1.0 : 0.3,
      );

      const val = d.value || 0;
      const rootVal = root.value || 1;
      const percentage = String(+((100 * val) / rootVal).toFixed(3));

      label
        .style('visibility', null)
        .select('.percentage')
        .text(percentage + '%');
      element.value = { sequence, percentage };
      element.dispatchEvent(new CustomEvent('input'));
    });

  return element;
}

export function measurementSummary(networkData, containerWidth, sourceValue) {
  const width =
    window.innerWidth <= 768 ? containerWidth : containerWidth * 0.5;

  const container = d3
    .create('div')
    .style('width', '100%')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('align-items', 'center');

  const breadcrumbContainer = container
    .append('div')
    .style('min-height', `${breadcrumbHeight + 10}px`)
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('width', '100%');

  const sunburstElement = sunburst(width, networkData, sourceValue);
  container.append(() => sunburstElement);

  sunburstElement.addEventListener('input', () => {
    breadcrumbContainer.html('');
    breadcrumbContainer.append(() =>
      breadcrumb(sunburstElement.value, window.innerWidth),
    );
  });

  return container.node();
}
