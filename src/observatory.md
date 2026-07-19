---
title: Observatory Dashboard
style: styles/observatory.css
---

```js
import SlimSelect from "npm:slim-select@2.8.1";
import { fetchDashboard } from "./components/queries.js";
import { downloadLinks } from "./components/data-download.js"
import { fmt, leafColor, sparkbar, updateBounds } from "./components/utils.js"
import { aggregateMetricsBySubnetwork, aggregateByDateOutcome, aggregateByNetwork, transformFlatData } from "./components/aggregators.js";
import { createStackedBarChart } from "./components/stacked-bar-chart.js"
import { hierarchicalBarChart } from "./components/hierarchical-bar-chart.js"
import { measurementSummary } from "./components/sunburst-chart.js"
import { createDomainSelector } from "./components/domain-selector.js";
import { createResponsiveTable } from "./components/table.js";

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
      ${resize(width => createStackedBarChart(width, start.value, end.value, stackedBarData, source))}
      ${downloadLinks(stackedBarData, "cp-observatory", "outcome-timeline", country.value, start.value, end.value, source.value)}
    </div>
</div>

<div class = "grid grid-cols-2">
    <div class="grid-colspan-2 card card--network">
      <h2>Outcome per Network</h2><br>
      ${resize(width => hierarchicalBarChart(networkData, width))}
      ${downloadLinks(networkData, "cp-observatory", "outcome-network", country.value, start.value, end.value, source.value)}
    </div>
</div>

<div class="grid grid-cols-2">
  <div class="grid-colspan-2 card">
    <h2>Measurement Summary</h2><br>
    ${resize(width => measurementSummary(networkData, width, source.value))}
  </div>
</div>