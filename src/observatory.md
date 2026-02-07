---
title: Observatory Dashboard
---

```js
import SlimSelect from "npm:slim-select@2.8.1";
import { fetchDashboard } from "./components/queries.js";
import { downloadLinks } from "./components/data-download.js"
const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
```

<link href="https://unpkg.com/slim-select@2.8.1/dist/slimselect.css" rel="stylesheet" />

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
const sources = ["DNS", "HTTPS", "HTTP", "ECHO", "DISCARD"];
const source = Inputs.select(sources, {
  value: "HTTPS",
  label: "Source",
  sort: true,
  unique: true,
});

const countriesRaw = await FileAttachment("./data/countries.json").json();
const countriesList = countriesRaw.map((d) => d.country);
const defaultCountry =
  countriesList.find((c) => c.toLowerCase() === countryParam.toLowerCase()) ??
  "Russia";
const country = Inputs.select(countriesList, {
  value: defaultCountry,
  label: "Country",
  sort: true,
  unique: true,
});

const domainsSrc = await FileAttachment("data/domains.csv").csv({
  typed: true,
});
const domainsArray = domainsSrc.map((obj) => ({
  domain: obj.domain,
  category: obj.domain_category,
}));
const domains = Inputs.select(domainsArray, {
  label: "Domains",
  sort: true,
  multiple: true,
});

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

const dataMinDate = new Date("2018-01-01");
const dataMaxDate = new Date();
const start = Inputs.date({
  label: "Start Date",
  min: fmt(dataMinDate),
  max: fmt(dataMaxDate),
  value: fmt(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)),
});

const end = Inputs.date({
  label: "End Date",
  min: fmt(dataMinDate),
  max: fmt(dataMaxDate),
  value: fmt(dataMaxDate),
});

function updateBounds() {
  const s = new Date(start.value),
    e = new Date(end.value);
  const maxAllowedEnd = new Date(s);
  maxAllowedEnd.setMonth(maxAllowedEnd.getMonth() + 6);
  if (maxAllowedEnd > dataMaxDate) maxAllowedEnd.setTime(dataMaxDate.getTime());

  end.setAttribute("min", fmt(s));
  end.setAttribute("max", fmt(maxAllowedEnd));
  if (e < s) end.value = fmt(s);
  if (e > maxAllowedEnd) end.value = fmt(maxAllowedEnd);

  const minAllowedStart = new Date(e);
  minAllowedStart.setMonth(minAllowedStart.getMonth() - 6);
  if (minAllowedStart < dataMinDate)
    minAllowedStart.setTime(dataMinDate.getTime());

  start.setAttribute("min", fmt(minAllowedStart));
  start.setAttribute("max", fmt(e));
  if (s < minAllowedStart) start.value = fmt(minAllowedStart);
  if (s > e) start.value = fmt(e);
}

[start, end].forEach((el) => {
  el.addEventListener("change", updateBounds);
  el.addEventListener("input", updateBounds);
});

updateBounds();
```

```js
function sparkbar() {
  return (x) => htl.html`<div style="
    background: var(--theme-red);
    color: black;
    font: 10px/1.6 var(--sans-serif);
    width: ${x}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${x.toLocaleString("en-US")}%`;
}

function aggregateMetricsBySubnetwork(data) {
  return _(data)
    .groupBy((row) =>
      [row.domain, row.category, row.network, row.subnetwork].join("|"),
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
        "domain",
        "category",
        "network",
        "subnetwork",
      ]);
      return {
        ...baseRow,
        probe_count: totalProbeCount,
        unexpected_rate: _.round(unexpectedRate, 2),
      };
    })
    .value();
}

function aggregateByDateOutcome(data) {
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
    .orderBy(["date", "outcome"])
    .value();
}

function aggregateByNetwork(data) {
  return _(data)
    .groupBy((row) =>
      [row.network, row.subnetwork, row.category, row.domain, row.outcome].join(
        "|",
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
    .orderBy(["network", "subnetwork", "category", "domain", "outcome"])
    .value();
}
```

```js
const select = document.createElement("select");
select.setAttribute("id", "slim-select");
select.setAttribute("multiple", "");

const groupedDomains = domainsArray.reduce((acc, item) => {
  if (!acc[item.category]) {
    acc[item.category] = [];
  }
  acc[item.category].push(item.domain);
  return acc;
}, {});

const selectData = Object.entries(groupedDomains)
  .sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB))
  .map(([category, domains]) => ({
    label: category,
    options: domains.map((domain) => ({
      text: domain,
      value: domain,
    })),
  }));

let defaultDomains = [
  "facebook.com",
  "www.instagram.com",
  "www.youtube.com",
  "www.occrp.org",
  "www.torproject.org",
  "bbc.com",
  "psiphon.ca",
  "www.wikipedia.org",
  "www.pornhub.com",
  "www.hrc.org",
];

selectData.forEach((group) => {
  const optgroup = document.createElement("optgroup");
  optgroup.label = group.label;

  group.options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    if (defaultDomains.includes(option.value)) {
      optionElement.selected = true;
    }
    optgroup.appendChild(optionElement);
  });

  select.appendChild(optgroup);
});

setTimeout(() => {
  const selection = new SlimSelect({
    select: "#slim-select",
    settings: {
      allowDeselect: false,
      closeOnSelect: false,
      placeholderText: "Select up to 10 domains",
      minSelected: 1,
      maxSelected: 10,
    },
    events: {
      afterChange: (newVal) => {
        defaultDomains.splice(
          0,
          defaultDomains.length,
          ...newVal.map((obj) => obj.value),
        );
      },
    },
  });
}, 0);
```

<div class="card">
  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    <div style="flex: 1 1 200px;">${country}</div>
    <div style="flex: 1 1 200px;">${source}</div>
    <div style="flex: 1 1 200px;">${start}</div>
    <div style="flex: 1 1 200px;">${end}</div>
  </div>
  </div>
</div>

<div class="card">
  <div class="domains-card">
    <label class="domains-label">
      Domains
      <span class="info-icon" data-tip="Select up to 10 domains">i</span>
    </label>
    <div class="domain-select-wrap">
      ${select}
    </div>
  </div>
</div>

```js
const searchButton = view(Inputs.button("Search"));
```

```js
searchButton;
const queryResults = await fetchDashboard(
  country.value,
  source.value,
  start.value,
  end.value,
  defaultDomains,
);
let subNetworkData = aggregateMetricsBySubnetwork(queryResults);
let stackedBarData = aggregateByDateOutcome(queryResults);
const networkData = aggregateByNetwork(queryResults);
```

```js
const searchInput = Inputs.search(subNetworkData);
const search = Generators.input(searchInput);
```


```js
function createStackedBarChart(width) {
  const height = 500;
  const originalMarginTop = 10;
  let marginTop = originalMarginTop;
  let marginBottom = 10;
  const marginRight = 10;
  const marginLeft = 40;
  const sDate = new Date(start.value);
  const eDate = new Date(end.value);
  const daySpan = (eDate - sDate) / (1000 * 60 * 60 * 24);
  const rotateLabels = daySpan > 60 || window.innerWidth <= 768;
  if (rotateLabels) marginBottom = 80;
  let data = stackedBarData;
  if (source.value === "DNS") {
    data = stackedBarData.map((d) => ({
      ...d,
      outcome: d.outcome.includes(":") ? d.outcome.split(":")[0] : d.outcome,
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
      const aFlag = a.startsWith("✅") ? 0 : 1;
      const bFlag = b.startsWith("✅") ? 0 : 1;
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
    success: ["#0bba13", "#81C784"],
    error: ["#9e0202", "#C62828"],
    warning: ["#E65100", "#FFE0B2"],
    info: ["#263238", "#CFD8DC"],
  };
  const getCategory = (o) =>
    o.includes("✅")
      ? "success"
      : o.includes("❗️")
        ? "error"
        : o.includes("❓")
          ? "warning"
          : o.includes("❔")
            ? "info"
            : "other";

  const colorMapping = {};
  Object.entries(
    series.reduce((acc, s) => {
      const cat = getCategory(s.key);
      (acc[cat] = acc[cat] || []).push(s.key);
      return acc;
    }, {}),
  ).forEach(([cat, keys]) => {
    const [c0, c1] = baseColors[cat] || ["#bbbbbb", "#bbbbbb"];
    const palette =
      keys.length > 1
        ? d3
            .range(keys.length)
            .map((i) => d3.interpolate(c0, c1)(i / (keys.length - 1)))
        : [c0];
    keys.forEach((k, i) => (colorMapping[k] = palette[i]));
  });

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("max-width", "100%")
    .style("height", "auto");

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none");

  const legendGroup = svg
    .append("g")
    .attr("transform", `translate(${marginLeft},${originalMarginTop})`);
  const entry = legendGroup
    .selectAll("g.legend")
    .data(legendItems)
    .join("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      return `translate(${col * approxItemWidth},${row * rowHeight})`;
    });
  entry
    .append("rect")
    .attr("width", legendRectSize)
    .attr("height", legendRectSize)
    .attr("fill", (d) => leafColor(d));
  entry
    .append("text")
    .attr("x", legendRectSize + paddingX)
    .attr("y", legendRectSize / 2)
    .attr("dy", "0.35em")
    .style("font-size", "12px")
    .style("fill", "#17827B")
    .text((d) => (d.length > 25 ? d.slice(0, 25) + "…" : d));

  const barGroups = svg
    .append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("fill", (d) => colorMapping[d.key]);
  const bars = barGroups
    .selectAll("rect")
    .data((d) => d.map((v) => ({ ...v, key: d.key })))
    .join("rect")
    .attr("x", (d) => x(d.data[0]))
    .attr("y", (d) => yStart(d[1]))
    .attr("height", 0)
    .attr("width", x.bandwidth())
    .style("opacity", 0);

  bars
    .on("mouseover", function (event, d) {
      tooltip
        .html(
          `
        <strong>Date:</strong> ${d.data[0]}<br/>
        <strong>Outcome:</strong> ${d.key}<br/>
        <strong>Count:</strong> ${d3.format(",")(d[1] - d[0])}
      `,
        )
        .style("visibility", "visible");
      d3.select(this).style("stroke", "white").style("stroke-width", "1px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      d3.select(this).style("stroke", "none");
    });

  const xAxisG = svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  if (window.innerWidth <= 768 && daySpan > 90) {
    xAxisG.selectAll(".tick").remove();
  } else if (rotateLabels) {
    xAxisG
      .selectAll("text")
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.6em")
      .attr("dy", "-0.4em");
  }

  xAxisG.call((g) => g.selectAll(".domain").remove());
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          bars
            .transition()
            .duration(1000)
            .delay((d, i) => i * 10)
            .attr("y", (d) => y(d[1]))
            .attr("height", (d) => y(d[0]) - y(d[1]))
            .style("opacity", 1);
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 },
  );
  observer.observe(svg.node());

  return svg.node();
}

function transformFlatData(flatData) {
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
    name: "Root",
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
```

```js
const marginTop = 30;
const marginRight = 30;
const marginBottom = 0;
const marginLeft = 200;
const barStep = 27;
const duration = 750;
const barPadding = 3 / barStep;
const newdata = transformFlatData(networkData);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background-color", "rgba(0, 0, 0, 0.8)")
  .style("color", "white")
  .style("padding", "8px")
  .style("border-radius", "4px")
  .style("font-size", "12px")
  .style("pointer-events", "none");

const axisTooltip = d3
  .select("body")
  .append("div")
  .attr("class", "axis-tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background-color", "rgba(0, 0, 0, 0.8)")
  .style("color", "white")
  .style("padding", "8px")
  .style("border-radius", "4px")
  .style("font-size", "12px")
  .style("pointer-events", "none")
  .style("z-index", "1000");

const root = d3
  .hierarchy(newdata)
  .sum((d) => d.value)
  .sort((a, b) => b.value - a.value)
  .eachAfter(
    (d) =>
      (d.index = d.parent ? (d.parent.index = d.parent.index + 1 || 0) : 0),
  );

function calculateHeight(d) {
  const numChildren = d.children ? d.children.length : 1;
  return numChildren * barStep + 15 + marginBottom;
}

function processData(newdata) {
  const root = d3
    .hierarchy(newdata)
    .sum((d) => {
      if (d.stackedValues) {
        return Object.values(d.stackedValues).reduce((a, b) => a + b, 0);
      }
      return 0;
    })
    .sort((a, b) => b.value - a.value)
    .eachAfter(
      (d) =>
        (d.index = d.parent ? (d.parent.index = d.parent.index + 1 || 0) : 0),
    );
  root.children = root.children || [];
  return root;
}

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
const yAxis = (g) =>
  g
    .attr("class", "y-axis")
    .attr("transform", `translate(${marginLeft + 0.5},0)`);

const x = d3.scaleLinear().range([marginLeft, width - marginRight]);

const xAxis = (g) =>
  g
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${marginTop})`)
    .call(d3.axisTop(x).ticks(width / 80, "s"))
    .call((g) =>
      (g.selection ? g.selection() : g)
        .select(".domain")
        .remove()
    );

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

function truncateText(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
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

function bar(svg, down, d, selector) {
  const g = svg
    .insert("g", selector)
    .attr("class", "enter")
    .attr("transform", `translate(0,${marginTop + barStep * barPadding})`)
    .attr("text-anchor", "end")
    .style("font", "10px sans-serif");

  const bar = g
    .selectAll("g")
    .data(d.children)
    .join("g")
    .attr("cursor", (d) => (!d.children ? null : "pointer"))
    .on("click", (event, d) => down(svg, d));

  bar
    .append("text")
    .attr("x", marginLeft - 6)
    .attr("y", (barStep * (1 - barPadding)) / 2)
    .attr("dy", ".35em")
    .attr("font-size", "14px")
    .attr("fill", "#17827B")
    .text((d) => {
      const maxChars = window.innerWidth <= 768 ? 10 : 18;
      return truncateText(d.data.name, maxChars);
    })
    .on("mouseover", function (event, d) {
      if (d.data.name.length > 15) {
        axisTooltip.transition().duration(200).style("opacity", 0.9);
        axisTooltip
          .html(d.data.name)
          .style("left", event.pageX - 10 + "px")
          .style("top", event.pageY - 28 + "px");
      }
    })
    .on("mouseout", function () {
      axisTooltip.transition().duration(500).style("opacity", 0);
    });

  const stacks = bar
    .selectAll(".stack")
    .data((d) => createStacks(d))
    .join("rect")
    .attr("class", "stack")
    .attr("x", (d) => x(d.start))
    .attr("width", (d) => x(d.end) - x(d.start))
    .attr("height", barStep * (1 - barPadding))
    .attr("fill", (d) => leafColor(d.metric))
    .on("mouseover", function (event, d) {
      d3.select(this).style("opacity", 0.8);
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`${d.metric}: ${d3.format(",")(d.value)}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 1);
      tooltip.transition().duration(500).style("opacity", 0);
    });
  return g;
}

function down(svg, d) {
  if (!d.children || d3.active(svg.node())) return;
  svg.select(".background").datum(d);
  const newHeight = calculateHeight(d);
  const transition1 = svg.transition().duration(duration);
  const transition2 = transition1.transition();

  svg.transition(transition1)
      .attr("height", newHeight)
      .attr("viewBox", [0, 0, width, newHeight]);
  svg.select(".background").transition(transition1)
      .attr("height", newHeight);
      
  const exit = svg.selectAll(".enter").attr("class", "exit");
  exit.selectAll("rect").attr("fill-opacity", (p) => (p === d ? 0 : null));
  exit.transition(transition1).attr("fill-opacity", 0).remove();
  const enter = bar(svg, down, d, ".y-axis").attr("fill-opacity", 0);
  enter.transition(transition1).attr("fill-opacity", 1);
  enter
    .selectAll("g")
    .attr("transform", stack(d.index))
    .transition(transition1)
    .attr("transform", stagger());

  const totalValue = d.children.reduce(
    (sum, child) =>
      sum +
      Object.values(child.data.stackedValues || {}).reduce((a, b) => a + b, 0),
    0,
  );

  x.domain([0, totalValue]);
  svg.selectAll(".x-axis").transition(transition2).call(xAxis);
  enter
    .selectAll("g")
    .transition(transition2)
    .attr("transform", (d, i) => `translate(0,${barStep * i})`);
  enter
    .selectAll(".stack")
    .attr("fill-opacity", 1)
    .transition(transition2)
    .attr("x", (d) => x(d.start))
    .attr("width", (d) => x(d.end) - x(d.start));
}

function up(svg, d) {
  if (!d.parent || !svg.selectAll(".exit").empty()) return;
  svg.select(".background").datum(d.parent);
  const transition1 = svg.transition().duration(duration);
  const transition2 = transition1.transition();

  const newHeight = calculateHeight(d.parent);
  svg.transition(transition1)
      .attr("height", newHeight)
      .attr("viewBox", [0, 0, width, newHeight]);
  svg.select(".background").transition(transition1)
      .attr("height", newHeight);

  const exit = svg.selectAll(".enter").attr("class", "exit");
  const totalParentValue = d.parent.children.reduce(
    (sum, child) =>
      sum +
      Object.values(child.data.stackedValues || {}).reduce((a, b) => a + b, 0),
    0,
  );
  x.domain([0, totalParentValue]);

  svg.selectAll(".x-axis").transition(transition1).call(xAxis);
  exit.selectAll("g").transition(transition1).attr("transform", stagger());
  exit.selectAll("g").transition(transition2).attr("transform", stack(d.index));
  exit
    .selectAll(".stack")
    .transition(transition1)
    .attr("x", (d) => x(d.start))
    .attr("width", (d) => x(d.end) - x(d.start));

  exit.transition(transition2).attr("fill-opacity", 0).remove();
  const enter = bar(svg, down, d.parent, ".exit").attr("fill-opacity", 0);
  enter
    .selectAll("g")
    .attr("transform", (d, i) => `translate(0,${barStep * i})`);
  enter.transition(transition2).attr("fill-opacity", 1);
  enter
    .selectAll(".stack")
    .attr("fill-opacity", (p) => (p === d ? 0 : null))
    .transition(transition2)
    .attr("x", (d) => x(d.start))
    .attr("width", (d) => x(d.end) - x(d.start))
    .on("end", function () {
      d3.select(this).attr("fill-opacity", 1);
    });
}

function chartBar(width, container) {
  const root = processData(newdata);
  const initialHeight = calculateHeight(root);
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, initialHeight])
    .attr("width", width)
    .attr("height", initialHeight)
    .attr("style", "max-width: 100%; height: auto;");
  const totalValue = (root.children || []).reduce(
    (sum, child) =>
      sum +
      (child.data.stackedValues
        ? Object.values(child.data.stackedValues).reduce((a, b) => a + b, 0)
        : 0),
    0,
  );

  x.domain([0, totalValue || 1]);
  svg
    .append("rect")
    .attr("class", "background")
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .attr("width", width)
    .attr("height", initialHeight)
    .attr("cursor", "pointer")
    .on("click", (event, d) => up(svg, d));

  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);
  const node = svg.node();
  let isVisible = false;

  function resetChart() {
    svg.selectAll(".enter, .exit").remove();
    x.domain([0, totalValue || 1]);
    svg.select(".x-axis").call(xAxis);
  }

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
    {
      threshold: 0.1,
    },
  );
  observer.observe(node);
  return node;
}
```

```js
const color = d3
  .scaleOrdinal()
  .domain([
    "network",
    "subnetwork",
    "categoriy",
    "domain",
    "outcome",
    "total_count",
  ])
  .range(["#5d85cf", "#7c6561", "#da7847", "#6fb971", "#9e70cf", "#bbbbbb"]);
```

```js
const transformData = (data) => {
  const rows =
    source.value === "DNS"
      ? data.map((d) => ({
          ...d,
          outcome: d.outcome.includes(":")
            ? d.outcome.split(":")[0]
            : d.outcome,
        }))
      : data;
  const groupBy = (array, key) => {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  };
  const hierarchy = {
    name: "root",
    children: [],
  };
  const networkGroups = groupBy(rows, "network");
  hierarchy.children = Object.entries(networkGroups).map(
    ([network, networkData]) => {
      const subnetworkGroups = groupBy(networkData, "subnetwork");
      return {
        name: network,
        children: Object.entries(subnetworkGroups).map(
          ([subnetwork, subnetworkData]) => {
            const categoryGroups = groupBy(subnetworkData, "category");
            return {
              name: subnetwork,
              children: Object.entries(categoryGroups).map(
                ([category, categoryData]) => {
                  const domainGroups = groupBy(categoryData, "domain");
                  return {
                    name: category,
                    children: Object.entries(domainGroups).map(
                      ([domain, domainData]) => {
                        const outcomeGroups = groupBy(domainData, "outcome");
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
```

```js
function breadcrumbPoints(d, i) {
  const tipWidth = 10;
  const points = [];
  points.push("0,0");
  points.push(`${breadcrumbWidth},0`);
  points.push(`${breadcrumbWidth + tipWidth},${breadcrumbHeight / 2}`);
  points.push(`${breadcrumbWidth},${breadcrumbHeight}`);
  points.push(`0,${breadcrumbHeight}`);
  if (i > 0) {
    points.push(`${tipWidth},${breadcrumbHeight / 2}`);
  }
  return points.join(" ");
}
```

```js
const getResponsiveBreadcrumb = () => {
  if (window.innerWidth <= 480) {
    return {
      width: 54,
      textLength: 6,
      offset: -10,
      fontSize: 10,
      textOffset: 0.3,
    };
  } else if (window.innerWidth <= 768) {
    return {
      width: 120,
      textLength: 12,
      offset: 10,
      fontSize: 16,
      textOffset: 0.4,
    };
  } else {
    return {
      width: 250,
      textLength: 24,
      offset: -320,
      fontSize: 18,
      textOffset: -1.1,
    };
  }
};

const breadcrumbWidth = getResponsiveBreadcrumb().width;
const breadcrumbHeight = 30;
```

```js
function breadcrumb(datasun) {
  const svg = d3
    .create("svg")
    .attr("viewBox", `0 0 ${breadcrumbWidth * 2} ${breadcrumbHeight}`)
    .style("width", `${breadcrumbWidth * 2}px`)
    .style("height", `${breadcrumbHeight}px`)
    .style("font", `${getResponsiveBreadcrumb().fontSize}px sans-serif`)
    .style("margin", "5px");
  const g = svg
    .selectAll("g")
    .data(datasun.sequence)
    .join("g")
    .attr(
      "transform",
      (d, i) =>
        `translate(${i * breadcrumbWidth + getResponsiveBreadcrumb().offset}, 0)`,
    );

  g.append("polygon")
    .attr("points", breadcrumbPoints)
    .attr("fill", (d) => {
      if (
        d.data.name.startsWith("✅") ||
        d.data.name.startsWith("❗️") ||
        d.data.name.startsWith("❓") ||
        d.data.name.startsWith("❔")
      ) {
        return leafColor(d.data.name);
      }
      return color(d.data.name);
    })
    .attr("stroke", "white");

  g.append("text")
    .attr("x", (breadcrumbWidth + 10) / 2)
    .attr("y", 15)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text((d) => {
      const maxLength = getResponsiveBreadcrumb().textLength;
      return d.data.name.length > maxLength
        ? d.data.name.slice(0, maxLength) + "..."
        : d.data.name;
    });

  svg
    .append("text")
    .text(datasun.percentage > 0 ? datasun.percentage + "%" : "")
    .attr(
      "x",
      (datasun.sequence.length + getResponsiveBreadcrumb().textOffset) *
        breadcrumbWidth,
    )
    .attr("y", breadcrumbHeight / 2)
    .attr("dy", "0.35em")
    .attr("fill", "#17827B")
    .style("font", `${getResponsiveBreadcrumb().fontSize}px sans-serif`)
    .attr("text-anchor", "middle");

  return svg.node();
}

function leafColor(name) {
  if (name.startsWith("✅")) return "#0bba13";
  if (name.startsWith("❗️")) return "#9e0202";
  if (name.startsWith("❓")) return "#f56565";
  if (name.startsWith("❔")) return "#ada6a6cb";
  return "#bbbbbb";
}
```

```js
function sunburst() {
  const radius = width / 2;
  const partition = (data) =>
    d3.partition().size([2 * Math.PI, radius * radius])(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value),
    );
  const hierarchicalData = transformData(networkData);
  const root = partition(hierarchicalData);
  const svg = d3.create("svg");
  const element = svg.node();
  element.value = { sequence: [], percentage: 0.0 };

  const getResponsiveFontSize = (baseSize) => {
    const isMobile = window.innerWidth <= 768;
    return isMobile ? baseSize * 0.3 : baseSize;
  };

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
    .append("text")
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    .style("visibility", "hidden");

  label
    .append("tspan")
    .attr("class", "percentage")
    .attr("x", 0)
    .attr("y", 0)
    .attr("dy", "-0.1em")
    .attr("font-size", `${getResponsiveFontSize(6)}em`)
    .text("");

  label
    .append("tspan")
    .attr("x", 0)
    .attr("y", 0)
    .attr("dy", "1.5em")
    .attr("font-size", `${getResponsiveFontSize(3)}em`)
    .text("of the measurements");

  svg
    .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
    .style("max-width", `${width}px`)
    .style("font", "12px sans-serif");

  const path = svg
    .append("g")
    .selectAll("path")
    .data(
      root.descendants().filter((d) => {
        return d.depth && d.x1 - d.x0 > 0.001;
      }),
    )
    .join("path")
    .attr("fill", (d) => {
      if (!d.children) return leafColor(d.data.name);
      return color(d.data.name);
    })
    .attr("d", arc)
    .attr("d", zeroArc)
    .style("opacity", 0);

  const resetChart = () => {
    path.attr("d", zeroArc).style("opacity", 0);
  };

  const triggerAnimation = () => {
    path
      .transition()
      .duration(1000)
      .delay((d, i) => i * 2)
      .attr("d", arc)
      .style("opacity", 1)
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
    {
      threshold: 0.1,
    },
  );

  observer.observe(element);
  svg
    .append("g")
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mouseleave", () => {
      path.attr("fill-opacity", 1);
      label.style("visibility", "hidden");
      element.value = { sequence: [], percentage: 0.0 };
      element.dispatchEvent(new CustomEvent("input"));
    })
    .selectAll("path")
    .data(
      root.descendants().filter((d) => {
        return d.depth && d.x1 - d.x0 > 0.001;
      }),
    )
    .join("path")
    .attr("d", mousearc)
    .on("mouseenter", (event, d) => {
      const sequence = d.ancestors().reverse().slice(1);
      path.attr("fill-opacity", (node) =>
        sequence.indexOf(node) >= 0 ? 1.0 : 0.3,
      );
      const percentage = ((100 * d.value) / root.value).toPrecision(3);
      label
        .style("visibility", null)
        .select(".percentage")
        .text(percentage + "%");

      element.value = { sequence, percentage };
      element.dispatchEvent(new CustomEvent("input"));
    });
  return element;
}
```

```js
function measurementSummary(windowWidth) {
  const width = window.innerWidth <= 768 ? windowWidth : windowWidth * 0.5;
  const container = d3
    .create("div")
    .style("width", `${width}px`)
    .style("margin", "0 auto")
    .style("flex-direction", "column")
    .style("align-items", "center");

  const breadcrumbContainer = container.append("div");

  const sunburstElement = sunburst(width);
  container.append(() => sunburstElement);

  sunburstElement.addEventListener("input", () => {
    breadcrumbContainer.html("");
    breadcrumbContainer.append(() => breadcrumb(sunburstElement.value));
  });
  return container.node();
}
```

```js
function createResponsiveTable(width) {
  const table = Inputs.table(search, {
    sort: "unexpected_rate",
    reverse: true,
    rows: 20,
    width: width,
    maxWidth: width,
    layout: "fixed",
    format: {
      unexpected_rate: sparkbar(),
    },
    align: {
      probe_count: "center",
    },
  });

  const footer = downloadLinks(
    search, 
    "cp-observatory", 
    "results", 
    country.value, 
    start.value, 
    end.value,
    source.value
  );

  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  
  container.append(table);
  container.append(footer);
  
  return container;
}
```

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card">
      <div style="margin-bottom: 1rem;">
        ${searchInput}
      </div>
      ${resize(width => createResponsiveTable(width))}
    </div>
</div>

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card">
      <h2>Outcome Timeline</h2><br>
      ${resize(width => createStackedBarChart(width))}
      ${downloadLinks(stackedBarData, "cp-observatory", "outcome-timeline", country.value, start.value, end.value, source.value)}
    </div>
</div>

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card">
      <h2>Outcome per Network</h2><br>
      ${resize(width => chartBar(width))}
      ${downloadLinks(networkData, "cp-observatory", "outcome-network", country.value, start.value, end.value, source.value)}
    </div>
</div>

<div class="grid grid-cols-2">
  <div class="grid-colspan-2 card">
    <h2>Measurement Summary</h2><br>
    ${resize(width => measurementSummary(width))}
  </div>
</div>

<style>
.ss-option:hover {
  background-color: #A8EDE9 !important;
  color: black !important;
}

.ss-content.ss-open-below,
.ss-content.ss-open-above {
  background-color: #cccbcbff !important;
  border-color: black;
}

.ss-main .ss-values {
    background-color: inherit !important;
}
.ss-main .ss-values .ss-value {
  background-color: #17827B;
}

.ss-value-text {
  color: white !important;
}

.ss-option {
  color: white !important;
}

.ss-optgroup-label-text {
  color: white !important;
}

.ss-option.ss-selected {
  background-color: #17827B !important;
  color: white !important;
}

.ss-list {
  background-color: inherit !important;
  color: white !important;
  font-size: 13px;
  font-family: Verdana;
}

.ss-content .ss-search input::placeholder {
  color: white !important;
  opacity: 0.5;
}

.ss-content .ss-search input {
    background-color: #17827B;
    color: white !important;
}

.ss-value-delete path {
  stroke: white !important;
}

.ss-main {
  --ss-bg-color: inherit;
  --ss-font-color: #d7d9d9;
  --ss-border-color: gray;
  --ss-focus-color: #17827B;
}

.ss-main.has-tip { position: relative; }

.ss-main.has-tip::after {
  content: attr(data-tip);
  position: absolute;
  right: 8px;
  top: calc(100% + 6px);
  background: rgba(0,0,0,.85);
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity .15s ease, transform .15s ease, visibility .15s;
  pointer-events: none;
  z-index: 1000;
}

.ss-main.has-tip:hover::after,
.ss-main.has-tip:focus-within::after {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.domains-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.domains-label {
  font-size: 13px;
  white-space: nowrap;
}

.domain-select-wrap {
  flex: 1 1 auto;
  min-width: 300px;
}

.info-icon {
  display: inline-block;
  margin-left: 6px;
  width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 50%;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  color: white;
  background-color: #17827B;
  cursor: default;
  position: relative;
}

.info-icon::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  bottom: 125%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s ease, transform .2s ease;
  pointer-events: none;
  z-index: 1000;
}

.info-icon::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 115%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0,0,0,0.85) transparent transparent transparent;
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s ease;
}

.info-icon:hover::after,
.info-icon:hover::before {
  opacity: 1;
  visibility: visible;
}

@media (max-width: 768px){
  .domains-card{
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .domains-label{
    margin-bottom: 2px;
  }

  .domain-select-wrap{
    min-width: 0;
    width: 100%;
  }

  .domain-select-wrap .ss-main{
    width: 100% !important;
    box-sizing: border-box;
  }

  .domain-select-wrap .ss-content{
    max-width: 100% !important;
    box-sizing: border-box;
  }
}

</style>
