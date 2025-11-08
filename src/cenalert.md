---
title: CenAlert Dashboard
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { utcParse, utcFormat } from "https://esm.sh/d3-time-format@4";
import { fetchCenalertEvents } from "./components/queries.js";
import { fetchCenalertTimeseries } from "./components/queries.js";
import { formatDMYdots, norm } from "./components/utils.js";
import { createGridRenderer } from "./components/render-grid.js";
import { createDetailOpener } from "./components/detail-view.js";

const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
const parseDate = utcParse("%m/%d/%Y");
const parseISO = utcParse("%Y-%m-%d");
const fmtDMY = utcFormat("%d.%m.%Y");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countriesNew = await FileAttachment("data/cenalertCountries.json").json();
const tsCache = new Map();
const countriesList = [...new Set(countriesNew)]
  .filter((code) => code)
  .map((code) => ({ code: String(code).trim().toUpperCase(), name: regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

const countryNameToCode = {};
for (const { name, code } of countriesList) {
  countryNameToCode[name] = code;
}

const countries = countriesList.map((c) => c.name);
let defaultCountry = null;
if (countries.includes(countryParam)) {
  defaultCountry = countryParam;
}
```
```js
function updateURL(paramsObj = {}, clearEvent = false) {
  const currentParams = new URLSearchParams(location.search);

  for (const [key, val] of Object.entries(paramsObj)) {
    if (val === null || val === undefined || val === "") currentParams.delete(key);
    else currentParams.set(key, val);
  }

  if (clearEvent) currentParams.delete("event");

  const query = currentParams.toString();
  const newURL = query ? `${location.pathname}?${query}` : location.pathname;

  history.pushState({}, "", newURL);
}

```
```js
const countryInput = Inputs.select(countries, {
  label: "Country",
  value: defaultCountry ?? countries[0],
  onchange: () => {}
});
const countryGenerator = Generators.input(countryInput);

const dateRangeOptions = [
  { label: "Present (past 60 days)", value: "present" },
  { label: "Past year", value: "year" },
  { label: "All time", value: "all" },
  { label: "Custom range", value: "custom" },
];

const dateRangeInput = Inputs.select(dateRangeOptions, {
  label: "Date range",
  format: d => d.label,
  value: dateRangeOptions[0],
  onchange: () => {}
});
const dateRangeGenerator = Generators.input(dateRangeInput);
```
```js
async function getTimeseriesForCountry(code) {
  if (!tsCache.has(code)) {
    const data = await fetchCenalertTimeseries({ country: code });
    const series = data.map((d) => ({
      ...d,
      date: parseISO(d.date),
      topic: "vpn",
    }));
    tsCache.set(code, series);
  }
  return tsCache.get(code);
}
```
```js
const countryCode = countryNameToCode[countryGenerator];
const events = await fetchCenalertEvents({
  country: countryCode,
});
const timeseriesFetched = await getTimeseriesForCountry(countryCode);
const allDates = timeseriesFetched
  .map(d => d.date)
  .filter(d => d instanceof Date && !isNaN(d)); 
const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));

latestDate.setDate(latestDate.getDate() + 1);
```
```js
if (!globalThis.customDateState) {
  globalThis.customDateState = { start: null, end: null };
}
const storedDates = globalThis.customDateState;
const customStartDateInput = Inputs.date({
  label: "Start date",
  value: storedDates.start ?? null,      
  min: earliestDate,          
  max: latestDate             
});
const customEndDateInput = Inputs.date({
  label: "End date",
  value: storedDates.end ?? null,        
  min: earliestDate,          
  max: latestDate          
});

customStartDateInput.addEventListener?.("input", e => {
  storedDates.start = e.target.valueAsDate;
});
customEndDateInput.addEventListener?.("input", e => {
  storedDates.end = e.target.valueAsDate;
});

const customStartDate = Generators.input(customStartDateInput);
const customEndDate = Generators.input(customEndDateInput);

dateRangeGenerator;
customStartDate;
customEndDate;
```

```js
dateRangeGenerator;
customStartDate;
customEndDate;
const now = new Date();
let startDate, endDate;
if (dateRangeGenerator.value === "present") {
  endDate = now;
  startDate = new Date(now);
  startDate.setDate(now.getDate() - 60);
} else if (dateRangeGenerator.value === "year") {
  endDate = now;
  startDate = new Date(now);
  startDate.setFullYear(now.getFullYear() - 1);
} else if (dateRangeGenerator.value === "all") {
  endDate = now;
}
else if (dateRangeGenerator.value === "custom") {
  if (customStartDate && customEndDate) {
    startDate = customStartDate;
    endDate = customEndDate;
    
    if (startDate > endDate) {
      alert("⚠️ The end date cannot be before the start date. Please select valid dates.");
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }
  } else {
    startDate = null;
    endDate = null;
  }
}
```


```js
const timeseries = (await getTimeseriesForCountry(countryCode))
  .map(d => ({
    ...d,
    topic: "vpn"
  }))
  .filter(d => {
    if (!d.date) return false;
    return (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate);
  })
  .sort((a, b) => a.date - b.date);

```

```js
const openDetail = createDetailOpener({
  html, d3, Plot, resize,
  DAY, PX_PADDING,
  events, formatImpact, softBreakLongTokens,
  gridSection, detailSection,
  formatDMYdots,
  startDate,
  endDate,
});

showCountryDetail(countryCode, countryGenerator, null);
const showHighlight = true;
```
```js
function eventsCard(
  rows,
  {
    title = "Events",
    colorHeader = "#444",
    valueKey = "impact",
    filterStartKey = "startDate",
    filterEndKey = "endDate",
    sortBy = "startDate",
    sort = "desc",
    useWindow = false,
  } = {},
) {
  const items = rows
    .map((r) => {
      const startRaw = String(r[filterStartKey] ?? "").trim();
      const endRaw = String(r[filterEndKey] ?? "").trim();
      const sd = startRaw ? parseISO(startRaw) : null;
      const ed = endRaw ? parseISO(endRaw) : sd;

      return {
        showStart: sd ? fmtDMY(sd) : startRaw || "unknown",
        showEnd: ed ? fmtDMY(ed) : endRaw || "unknown",
        val: Number(r[valueKey]),
        sd,
        ed,
      };
    })
    .filter((r) => Number.isFinite(r.val));

  const filtered = useWindow
    ? items.filter(({ sd, ed }) => {
        if (!sd && !ed) return false;
        const s = sd || ed;
        const e = ed || sd;
        const [w0, w1] = startEnd;
        return !(e < w0 || s > w1);
      })
    : items;

  const key = sortBy === "end" ? "ed" : "sd";
  filtered.sort((a, b) => {
    const av = a[key]?.getTime?.() ?? -Infinity;
    const bv = b[key]?.getTime?.() ?? -Infinity;
    return sort === "asc" ? av - bv : bv - av;
  });

  const rowsShown = filtered;

  return html.fragment`
    <h2 style="color:${colorHeader}">${title}</h2>
    <div class="events-grid-header">
      <div class="h">Start Date</div>
      <div class="h">End Date</div>
      <div class="h r">Impact</div>
    </div>
    <div class="events-scroll">
      <div class="events-grid">
        ${rowsShown.flatMap((d) => [
          html`<div>${d.showStart}</div>`,
          html`<div>${d.showEnd}</div>`,
          html`<div style="text-align:right; justify-self:end;">
            ${d.val.toLocaleString("en-US")}
          </div>`,
        ])}
      </div>
    </div>
  `;
}
```

```js
const color = Plot.scale({ color: { domain: ["vpn"] } });
const defaultStartEnd = (() => {
  const lastIndex = timeseries.length - 1;
  const firstIndex = Math.max(0, lastIndex - 364); // use first element if < 365
  return [
    timeseries[firstIndex]?.date ?? new Date(),  // fallback if empty
    timeseries[lastIndex]?.date ?? new Date(),   // fallback if empty
  ];
})();

const startEnd = Mutable(defaultStartEnd);
const setStartEnd = (se) => (startEnd.value = se ?? defaultStartEnd);
const getStartEnd = () => startEnd.value;
```

```js
const zoomedAnomalies = events
  .map((d) => {
    const s = parseISO(String(d.startDate)) ?? new Date(d.startDate);
    const e = parseISO(String(d.endDate)) ?? new Date(d.endDate ?? d.startDate);
    return { ...d, s, e, id: `${d.country}-${s}-${e}` };
  })
  .filter((d) => {
    if (dateRangeGenerator.value.value === "all") return true;
    return !(d.e < startDate || d.s > endDate);
  });

const [yMin, yMax] = d3.extent(
  timeseries.filter(
    (d) => startEnd[0] <= d.date && d.date < startEnd[1],
  ),
  (d) => d.rate,
);

function sparkbar(max) {
  return (x) => {
    const v = Number(x) || 0;
    const label = v.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    return htl.html`<div style="
      background: var(--theme-red);
      color: black;
      font: 10px/1.6 var(--sans-serif);
      width: ${max ? (100 * v) / max : 0}%;
      float: right;
      padding-right: 3px;
      box-sizing: border-box;
      overflow: visible;
      display: flex;
      justify-content: end;">${label}</div>`;
  };
}

const filteredEventsNum = events.map((d) => {
  const isUnknown =
    String(d.label ?? "")
      .trim()
      .toLowerCase() === "unknown";
  return {
    ...d,
    impact: +d.impact,
  };
});

const impactMax = d3.max(filteredEventsNum, (d) => d.impact || 0);
```

<div class="card-big" style="display:flex; flex-direction:column;">
      CenAlert is an open-source, data-driven alert system that leverages Google Trends to pinpoint where and when global Internet censorship spikes, amplifying user voices even in hard-to-monitor regions. By detecting surges in searches for circumvention tools, CenAlert provides timely, prioritized insights and notifications to empower advocacy and response, bridging critical gaps left as traditional reporting channels face increasing threats.
</div>
<div class="card modern-card">
  <div class="filters-row modern-filters">
    ${countryInput}
    ${Inputs.select(["VPN"], { label: "Search Term", value: "VPN" })}
    ${dateRangeInput}
    ${dateRangeInput.value.value === "custom"
      ? html`<div class="date-range-custom">${customStartDateInput}${customEndDateInput}</div>`
      : ""}
  </div>
</div>
<div class="grid">
  <div class="card modern-card">
    <h2>Search volume (${
      d3.extent(timeseries, d => d.date)
      .map(d3.utcFormat("%Y.%m.%d"))
      .join(" – ")
    })</h2>
    ${resize((width) =>
      Plot.plot({
        width,
        y: { grid: true, label: "" },
        color,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(timeseries, {
            x: "date",
            y: "rate",
            stroke: "topic",
            tip: true
          }),
          Plot.rectY(zoomedAnomalies, {
            x1: d => d.s,
            x2: d => d.e,
            y1: d3.min(timeseries, d => d.rate),
            y2: d3.max(timeseries, d => d.rate),
            fill: "#f87171",      
            fillOpacity: 0.4,    
            stroke: "#f56363ff",   
            strokeWidth: 0.7,
            strokeOpacity: 0.6,
            tip: true,
            title: d =>
              `Cause: ${d.cause}\n` +
              `Duration: ${fmtDMY(d.s)} – ${fmtDMY(d.e)}\n` +
              (d.impact ? `Impact: ${(+d.impact).toFixed(2)}` : "")
          }),
          Plot.ruleX(zoomedAnomalies.map(d => d.s), {
            stroke: "#ef4444",
            strokeOpacity: 0.6,
            strokeWidth: 0.7
          }),
          Plot.ruleX(zoomedAnomalies.map(d => d.e), {
            stroke: "#ef4444",
            strokeOpacity: 0.6,
            strokeWidth: 0.7
          })
        ]
      })
    )}
  </div>
</div>

```js
setTimeout(() => {
  document.querySelectorAll(".card svg").forEach(svg => {
    svg.querySelectorAll("rect").forEach(rect => {
      const datum = d3.select(rect).datum();
      if (!datum || !datum.s) return;

      rect.style.cursor = "pointer";

      rect.addEventListener("click", e => {
        e.stopPropagation();
        const clicked = datum.s;
        const selectedEvent = events.find(ev => {
          const evStart = parseISO(ev.startDate) ?? new Date(ev.startDate);
          const evEnd = parseISO(ev.endDate) ?? new Date(ev.endDate ?? ev.startDate);
          return +evStart <= +clicked && +clicked <= +evEnd + 24 * 3600 * 1000;
        });

        if (selectedEvent) {
          showCountryDetail(
            countryNameToCode[countryInput],
            countryInput,
            String(selectedEvent.startDate)
          );
          // updateURL({ countryInput.value }, !hasEvents);
        }
      });
    });
  });
}, 800);

```

```js
let _tip = document.getElementById("table-tooltip");
if (!_tip) {
  _tip = document.createElement("div");
  _tip.id = "table-tooltip";
  document.body.appendChild(_tip);
}
// let checkbox = document.getElementById("toggleHighlight");

if (!window._tableTooltipBound) {
  window._tableTooltipBound = true;
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest(".cell-ellipsis");
    if (!el) return;
    const text = el.dataset.full || el.textContent || "";
    if (!text.trim()) return;
    _tip.textContent = text;
    _tip.style.opacity = "1";
  });

  document.addEventListener("mousemove", (e) => {
    if (_tip.style.opacity !== "1") return;
    const pad = 16;
    const vw = innerWidth,
      vh = innerHeight;
    const x = Math.min(e.clientX + 12, vw - pad);
    const y = Math.min(e.clientY + 18, vh - pad);
    _tip.style.left = `${x}px`;
    _tip.style.top = `${y}px`;
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".cell-ellipsis")) {
      _tip.style.opacity = "0";
    }
  });
}
countryInput.addEventListener("change", async () => {
  const country = countryInput.value;
  const newCode = countryNameToCode[country];
  const newEvents = await fetchCenalertEvents({ country: newCode });

  const hasEvents = Array.isArray(newEvents) && newEvents.length > 0;
  updateURL({ country }, !hasEvents);

  if (!hasEvents) showCountryDetail(newCode, country, null);
});

dateRangeInput.addEventListener("change", async () => {
  const range = dateRangeInput.value.value;
  const country = countryInput.value;
  const newCode = countryNameToCode[country];
  const newEvents = await fetchCenalertEvents({ country: newCode });
  const hasEvents = Array.isArray(newEvents) && newEvents.length > 0;
  updateURL({ range }, !hasEvents);
  if (!hasEvents) showCountryDetail(newCode, country, null);
});
```

```js

const DAY = 24 * 60 * 60 * 1000;
const PX_PADDING = -20;

const eventCounts = events.reduce((acc, d) => {
  const code = String(d.country).toUpperCase();
  acc[code] = (acc[code] || 0) + 1;
  return acc;
}, {});

const enriched = events.map((d) => ({
  ...d,
  countryName: regionNames.of(String(d.country).toUpperCase()) || d.country,
}));

const uniqueCountries = [
  ...new Map(enriched.map((d) => [d.country, d.countryName])).entries(),
]
  .map(([code, name]) => ({
    code,
    name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

  const uniqueCountriesWithEvents = uniqueCountries.map(({ code, name }) => ({
  code,
  name,
  totalEvents: eventCounts[code] || 0,
}));

const formatImpact = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
}).format;

const softBreakLongTokens = (s, every = 16) =>
  String(s).replace(new RegExp(`(\\S{${every}})(?=\\S)`, "g"), "$1 ");

const gridSection = html`<div class="card card-with-search" style="display:none"></div>`;
const detailSection = html`<div class="card detail-view modern-card"></div>`;

const gridHeader = html`<div class="card-header"></div>`;

const grid = html`<div class="tiles-grid"></div>`;
gridSection.append(gridHeader, grid);

let currentList = uniqueCountriesWithEvents;
const state = {
  selectedCode: null,
  tsCache: new Map(),
  setCurrentList: (list) => { currentList = list; }
};

const openDetail = createDetailOpener({
  html, d3, Plot, resize,
  DAY, PX_PADDING,
  events, formatImpact, softBreakLongTokens,
  gridSection, detailSection,
  formatDMYdots,
});

async function showCountryDetail(code, name, selectedEventKey) {
 const fullSeries = (await getTimeseriesForCountry(code))
  .map(d => ({
    ...d,
    topic: "vpn"
  }))
  .sort((a, b) => a.date - b.date);
  const hasAnyEvents = Array.isArray(timeseries) && timeseries.length > 0;

  const scrollY = window.scrollY;
  openDetail(code, name, fullSeries, timeseries, hasAnyEvents, selectedEventKey);
  window.scrollTo(0, scrollY);
}
const scrollY = window.scrollY;
const renderGrid = createGridRenderer({ html, parseISO, openDetail });
window.scrollTo(0, scrollY);

renderGrid(
  grid,
  uniqueCountriesWithEvents,
  state
);

display(gridSection);
display(detailSection);

```

<style>
body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
                 Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 16px;
    color: #222;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

.filters-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filters-row > * {
  flex: 1 1 220px;
}

.card-side {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.events-grid > .h {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0.25rem 0.5rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
}
.modern-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: linear-gradient(145deg, #f9f9fb, #ffffff);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.modern-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: flex-start; /* ensure labels and inputs stack cleanly */
}

.modern-filters .filter-group {
  display: flex;
  flex-direction: column;
  flex: 1 1 220px;
}

.modern-filters label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #333;
  text-align: center; /* center label above input */
  margin-bottom: 0.25rem;
}

.modern-filters input, 
.modern-filters select {
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  padding: 0.35rem 0.6rem;
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
}

.modern-filters input[type="date"] {
  min-width: 140px; /* make oblong shape a bit longer */
  height: 2rem;  /* ensure consistent vertical space */
  padding: 0.45rem 0.75rem;
}
.date-range-custom {
  display: flex;
  gap: 0.5rem;
  justify-content: center; /* keeps start/end date visually balanced */
}

.date-range-custom .filter-group {
  flex: 1;
}

.date-range-custom {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.events-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}

.events-grid {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.25rem 0.5rem;
  align-items: center;
  justify-items: left;
  border-radius: 1rem;
  background: linear-gradient(145deg, #f9f9fb, #ffffff);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.events-grid > .r {
  text-align: center;
}

.grid-cols-2-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.detail-view.modern-card {
  gap: 0; /* remove spacing between header + grid */
  padding: 1rem; /* optional: adjust overall padding */
}

@media (min-width: 560px) {
  .grid-cols-2-3 {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 840px) {
  .grid-cols-2-3 {
    grid-template-columns: 2fr 1fr;
    grid-auto-rows: 260px;
    align-items: stretch;
  }
  .card-side {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}
.card-big {
    display: flex;
    flex-wrap: wrap;
  }

.card-side h2 {
    margin-bottom: 0;
}

.events-grid-header {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.25rem 0.5rem;
  align-items: center;
  justify-items: left;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.25rem 0.5rem;
}

.events-grid-header > .h {
  position: static;
  font-weight: 600;
  text-align: center;
}

#table-tooltip {
  position: fixed;
  z-index: 99999;
  max-width: min(60vw, 520px);
  background: rgba(121, 116, 116, 0.88);
  color: #fff;
  padding: 6px 8px;
  border-radius: 6px;
  font: 12px/1.35 var(--sans-serif, system-ui, sans-serif);
  box-shadow: 0 4px 14px rgba(0,0,0,.3);
  pointer-events: none;
  transform: translate(8px, 12px);
  opacity: 0;
  transition: opacity .08s ease-out;
  white-space: normal;
}

.cell-ellipsis {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.detail-view .detail-header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .5rem;
}

.card-with-search {
  display: flex;
  flex-direction: column;
  gap: .75rem;
}

.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.tile.card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  cursor: pointer;
  padding: 2rem 1rem;
  font-size: 1.2rem;
  user-select: none;
  transition: transform .05s ease, box-shadow .15s ease, border-color .15s ease;
}

.tile.card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 6px 14px rgba(0,0,0,.06);
}

.tile.card.selected {
  border-color: #1e90ff;
  box-shadow: 0 0 0 3px rgba(30,144,255,.15);
}

.tile.card .flag {
  font-size: 1.8rem;
}

.grid-1-2{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
@media (max-width: 840px){
  .grid-1-2{ grid-template-columns: 1fr; }
}

.timeline-scroller{
  overflow: auto;
  overscroll-behavior: contain;
}

</style>