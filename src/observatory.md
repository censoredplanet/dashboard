---
title: Observatory Dashboard
style: styles/observatory.css
---

```js
import SlimSelect from "npm:slim-select@2.8.1";
import { fetchDashboard } from "./components/queries.js";
import { downloadLinks } from "./components/data-download.js"
import { exportChartPng } from "./components/chart-export.js";
import { fmt, leafColor, sparkbar, updateBounds, updateURL } from "./components/utils.js"
import { aggregateMetricsBySubnetwork, aggregateByDateOutcome, aggregateByNetwork, transformFlatData } from "./components/aggregators.js";
import { createStackedBarChart } from "./components/stacked-bar-chart.js"
import { hierarchicalBarChart } from "./components/hierarchical-bar-chart.js"
import { measurementSummary } from "./components/sunburst-chart.js"
import { createDomainSelector } from "./components/domain-selector.js";
import { createResponsiveTable } from "./components/table.js";

const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
const sourceParam = (params.get("source") ?? "").trim().toUpperCase();
const startParam = (params.get("start") ?? "").trim();
const endParam = (params.get("end") ?? "").trim();
const domainsParam = (params.get("domains") ?? "").trim();
const countryCodes = await FileAttachment("data/country-codes.csv").csv({
  typed: true,
});
const nameByCode = new Map(countryCodes.map((d) => [d.code, d.name]));
const codeByName = new Map(countryCodes.map((d) => [d.name, d.code]));
```
<link href="https://unpkg.com/slim-select@2.8.1/dist/slimselect.css" rel="stylesheet" />

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
const sources = ["DNS", "HTTPS", "HTTP", "ECHO", "DISCARD"];
const source = Inputs.select(sources, {
  value: sources.includes(sourceParam) ? sourceParam : "HTTPS",
  label: "Source",
  sort: true,
  unique: true,
});

const countriesRaw = await FileAttachment("./data/countries.json").json();
const countriesList = countriesRaw.map((d) => d.country);
// Accepts a code (?country=IR) or a name (?country=Iran); links written before
// the switch to codes still resolve.
const requestedCountry =
  nameByCode.get(countryParam.toUpperCase()) ?? countryParam;
const defaultCountry =
  countriesList.find(
    (c) => c.toLowerCase() === requestedCountry.toLowerCase(),
  ) ?? "Russia";
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

const dataMinDate = new Date("2018-01-01");
const dataMaxDate = new Date();

const dateFromParam = (value, fallback) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(+parsed) || parsed < dataMinDate || parsed > dataMaxDate) {
    return fallback;
  }
  return value;
};

const start = Inputs.date({
  label: "Start Date",
  min: fmt(dataMinDate),
  max: fmt(dataMaxDate),
  value: dateFromParam(
    startParam,
    fmt(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)),
  ),
});

const end = Inputs.date({
  label: "End Date",
  min: fmt(dataMinDate),
  max: fmt(dataMaxDate),
  value: dateFromParam(endParam, fmt(dataMaxDate)),
});
updateBounds(start, end, dataMaxDate, dataMinDate);

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
if (domainsParam) {
  const known = new Set(domainsArray.map((d) => d.domain));
  const asked = [
    ...new Set(domainsParam.split(",").map((d) => d.trim()).filter(Boolean)),
  ];
  const requested = asked.filter((d) => known.has(d)).slice(0, 10);

  const dropped = asked.filter((d) => !known.has(d));
  if (dropped.length) {
    console.warn(
      `Ignored ${dropped.length} unknown domain(s) from the URL: ${dropped.join(", ")}`,
    );
  }
  if (asked.length > requested.length + dropped.length) {
    console.warn("More than 10 domains requested; only the first 10 are used.");
  }

  if (requested.length) {
    defaultDomains = requested;
  } else {
    console.warn(
      "No usable domains in the URL; falling back to the default selection.",
    );
  }
}

const domainSelector = createDomainSelector(domainsArray, defaultDomains);
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
      ${domainSelector}
    </div>
  </div>
</div>

```js
const searchForm = Inputs.button("Search");
searchForm.classList.add("search-control");
const searchButton = view(searchForm);

function setSearching(busy) {
  searchForm.classList.toggle("is-searching", busy);
  searchForm.querySelector("button").disabled = busy;
  searchForm.setAttribute("aria-busy", String(busy));
}
```

```js
searchButton;
setSearching(true);
updateURL({
  country: codeByName.get(country.value) ?? country.value,
  source: source.value,
  start: fmt(new Date(start.value)),
  end: fmt(new Date(end.value)),
  domains: defaultDomains.join(","),
});
const queryResults = await fetchDashboard(
  country.value,
  source.value,
  start.value,
  end.value,
  defaultDomains,
).finally(() => setSearching(false));
let subNetworkData = aggregateMetricsBySubnetwork(queryResults);
let stackedBarData = aggregateByDateOutcome(queryResults);
const networkData = aggregateByNetwork(queryResults);
const searchInput = Inputs.search(subNetworkData);
const search = Generators.input(searchInput);
```

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card">
      <div style="margin-bottom: 1rem;">
        ${searchInput}
      </div>
      ${resize(width => createResponsiveTable(search, width, { country: country.value, start: start.value, end: end.value, source: source.value }))}
    </div>
</div>

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card">
      <h2>Outcome Timeline</h2><br>
      ${outcomeTimeline}
      ${outcomeTimelineFooter}
    </div>
</div>

```js
const logoUrl = FileAttachment("logo-umichlab.svg").href;
const fmtDate = (d) =>
  d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "");
const safe = (s) => String(s).replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");

const outcomeTimeline = resize((width) =>
  createStackedBarChart(width, start.value, end.value, stackedBarData, source),
);

const outcomeTimelineFooter = downloadLinks(
  stackedBarData, "cp-observatory", "outcome-timeline",
  country.value, start.value, end.value, source.value,
);

const outcomeTimelinePng = html`<a href="#">PNG</a>`;
outcomeTimelinePng.onclick = async (event) => {
  event.preventDefault();
  const chart = outcomeTimeline.querySelector("svg");
  if (!chart) return;

  await exportChartPng({
    chart,
    logoUrl,
    title: `Outcome Timeline — ${country.value}`,
    meta: [
      ["Country", country.value],
      ["Source", source.value],
      ["Period", `${fmtDate(start.value)} – ${fmtDate(end.value)}`],
    ],
    notes: defaultDomains.join(", "),
    notesLabel: "Domains",
    filename: `cp-observatory-outcome-timeline-${safe(country.value)}-${fmtDate(
      start.value,
    )}-${fmtDate(end.value)}`,
  });
};

outcomeTimelineFooter.append(
  document.createTextNode(" · "),
  outcomeTimelinePng,
);
```

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card card--network">
      <h2>Outcome per Network</h2><br>
      ${outcomeNetwork}
      ${outcomeNetworkFooter}
    </div>
</div>

```js
const outcomeNetwork = resize((width) =>
  hierarchicalBarChart(networkData, width),
);

const outcomeNetworkFooter = downloadLinks(
  networkData, "cp-observatory", "outcome-network",
  country.value, start.value, end.value, source.value,
);

const outcomeNetworkPng = html`<a href="#">PNG</a>`;
outcomeNetworkPng.onclick = async (event) => {
  event.preventDefault();
  const chart = outcomeNetwork.querySelector("svg");
  if (!chart) return;

  const view = chart.currentView?.() ?? { depth: 0, name: null };
  const drilled = view.depth >= 1 && view.name;

  await exportChartPng({
    chart,
    logoUrl,
    title: `Outcome per Network — ${country.value}`,
    meta: [
      ["Country", country.value],
      ["Source", source.value],
      ["Period", `${fmtDate(start.value)} – ${fmtDate(end.value)}`],
      ...(drilled ? [["Network", view.name]] : []),
    ],
    notes: defaultDomains.join(", "),
    notesLabel: "Domains",
    filename: [
      "cp-observatory-outcome-network",
      safe(country.value),
      ...(drilled ? [safe(view.name)] : []),
      fmtDate(start.value),
      fmtDate(end.value),
    ].join("-"),
  });
};

outcomeNetworkFooter.append(
  document.createTextNode(" · "),
  outcomeNetworkPng,
);
```

<div class="grid grid-cols-2">
  <div class="grid-colspan-2 card">
    <h2>Measurement Summary</h2><br>
    ${measurementSummaryHost}
    ${measurementSummaryFooter}
  </div>
</div>

```js
const measurementSummaryHost = resize((width) =>
  measurementSummary(networkData, width, source.value),
);

const measurementSummaryFooter = downloadLinks(
  networkData, "cp-observatory", "measurement-summary",
  country.value, start.value, end.value, source.value,
);

const measurementSummaryPng = html`<a href="#">PNG</a>`;
measurementSummaryPng.onclick = async (event) => {
  event.preventDefault();
  const chart = measurementSummaryHost.querySelector("svg.sunburst");
  if (!chart) return;

  const selection = chart.getSelection?.() ?? null;
  const { sequence = [], percentage = 0 } = chart.value ?? {};
  const selectedPath = selection
    ? sequence.map((d) => d.data.name).join(" → ")
    : "";

  await exportChartPng({
    chart,
    logoUrl,
    title: `Measurement Summary — ${country.value}`,
    meta: [
      ["Country", country.value],
      ["Source", source.value],
      ["Period", `${fmtDate(start.value)} – ${fmtDate(end.value)}`],
      ...(selectedPath
        ? [
            ["Selected", selectedPath],
            ["Share", `${percentage}%`],
          ]
        : []),
    ],
    notes: defaultDomains.join(", "),
    notesLabel: "Domains",
    filename: [
      "cp-observatory-measurement-summary",
      safe(country.value),
      fmtDate(start.value),
      fmtDate(end.value),
    ].join("-"),
  });
};

measurementSummaryFooter.append(
  document.createTextNode(" · "),
  measurementSummaryPng,
);
```
