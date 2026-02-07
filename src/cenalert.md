---
title: CenAlert Dashboard
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { utcParse, utcFormat } from "https://esm.sh/d3-time-format@4";
import { fetchCenalertEvents } from "./components/queries.js";
import { fetchCenalertTimeseries } from "./components/queries.js";
import { formatDMYdots } from "./components/utils.js";
import { createGridRenderer } from "./components/render-grid.js";
import { createDetailOpener } from "./components/detail-view.js";
import { downloadLinks } from "./components/data-download.js";

const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
const urlEvent = params.get("event");
const urlRange = params.get("range") ?? "present";
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

const urlRange = params.get("range") ?? "present";

const initialRange =
  dateRangeOptions.find(o => o.value === urlRange) ??
  dateRangeOptions[0]; 

const dateRangeInput = Inputs.select(dateRangeOptions, {
  label: "Date range",
  format: d => d.label,
  value: initialRange,
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
let selectedEventKey = null;
if (urlEvent) {
  const matched = events.find(ev =>
    ev.__matchKey === urlEvent || ev.dateLabel === urlEvent || ev.startDate === urlEvent
  );
  if (matched) selectedEventKey = matched.__matchKey || matched.dateLabel || matched.startDate;
}

if (!selectedEventKey && events.length > 0) {
  selectedEventKey = events[0].__matchKey || events[0].dateLabel || events[0].startDate;
}

showCountryDetail(countryCode, countryInput.value, selectedEventKey, { scrollIntoView: false });
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

const fmtYMD = d3.utcFormat("%Y.%m.%d");
```


<div class="card-big" style="display:flex; flex-direction:column;">
      CenAlert is an open-source, data-driven alert system that leverages Google Trends to pinpoint where and when global Internet censorship spikes, amplifying user voices even in hard-to-monitor regions. By detecting surges in searches for circumvention tools, CenAlert provides timely, prioritized insights and notifications to empower advocacy and response, bridging critical gaps left as traditional reporting channels face increasing threats.
</div>
<div class="disclaimer-box">
  CenAlert does not directly measure censorship. Instead, it analyzes changes in user behavior reflected in Google Trends data, which may indicate experiences with or expectations of Internet restrictions. While spikes often coincide with censorship events, alternative explanations, including geoblocking or increased surveillance, are also possible.
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
    <div class="search-volume-header">
      <h2>Search Volume (${
        d3.extent(timeseries, d => d.date)
          .map(d3.utcFormat("%Y.%m.%d"))
          .join(" – ")
      })</h2>
      <div class="highlight-toggle-wrapper">
        ${highlightToggle}
      </div>
    </div>
    ${searchVolumeContainer}
    ${downloadLinks(timeseries, "cp-cenalert", "search-volume", countryInput.value, startDate ?? earliestDate, endDate ?? latestDate)}
  </div>
</div>

```js
const highlightToggle = Inputs.toggle({
  label: "Show event highlights",
  value: true,
});


const searchVolumeContainer = document.createElement("div");
searchVolumeContainer.id = "search-volume-container";
searchVolumeContainer.style.minHeight = "60px"; 
```

```js
function renderSearchVolumePlot() {
  searchVolumeContainer.innerHTML = "";

  const width = Math.max(600, Math.min(window.innerWidth - 80, 1200)); 
  const showHighlight = Boolean(highlightToggle.value);

  const y1 = d3.min(timeseries, d => d.rate);
  const y2 = d3.max(timeseries, d => d.rate);

  const plotColors = {
    text: getComputedStyle(document.documentElement).getPropertyValue("--plot-text").trim(),
    line: getComputedStyle(document.documentElement).getPropertyValue("--plot-line").trim(),
    grid: getComputedStyle(document.documentElement).getPropertyValue("--plot-grid").trim(),
    bg:   getComputedStyle(document.documentElement).getPropertyValue("--plot-bg").trim()
  };
  const isDark = document.documentElement.classList.contains("dark");

  const tooltipFill = isDark ? "black" : "white";
  const marks = [
    Plot.ruleY([0], { stroke: plotColors.grid }),
    Plot.lineY(timeseries, {
      x: "date",
      y: "rate",
      stroke: plotColors.line,
      tip: {
        fill: tooltipFill,
        stroke: "black",
        textColor: "black",
        color: "black"
      },
      title: d =>
        `Topic: ${d.topic || "Unknown topic"}\n` +
        `Date: ${fmtYMD(d.date)}\n` +
        `Rate: ${d.rate != null ? d.rate.toFixed(2) : "N/A"}`
    }),
  ];

  if (showHighlight && Array.isArray(zoomedAnomalies) && zoomedAnomalies.length) {
    marks.push(
      Plot.rectY(zoomedAnomalies, {
        x1: d => d.s,
        x2: d => d.e,
        y1: y2,
        y2: 0,
        fill: "#df9d81",
        fillOpacity: 0.35,
        stroke: "#f56363",
        strokeOpacity: 0.6,
        strokeWidth: 0.7,
        tip: {
          fill: tooltipFill,
          stroke: "black",
          textColor: "black",
          color: "black"
        },
        title: d =>
          `Cause: ${d.cause}\n` +
          `Duration: ${fmtDMY(d.s)} – ${fmtDMY(d.e)}\n` +
          (d.impact ? `Impact: ${(+d.impact).toFixed(2)}` : "")
      }),
    );
    
    marks.push(
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
    );
  }

  const plotSvg = Plot.plot({
    style: {
      background: plotColors.bg,
      color: plotColors.text,
      fontSize: "13px"
    },
    width,
    grid: true,
    y: { grid: true, label: "", stroke: plotColors.grid },
    x: { label: "", stroke: plotColors.grid },
    marks
  });

  plotSvg.addEventListener("click", () => {
    const v = plotSvg.value;
    if (!v || !v.date) return;
    const clicked = v.date;
    const selectedEvent = events.find(ev => {
      const evStart = parseISO(ev.startDate) ?? new Date(ev.startDate);
      const evEnd = parseISO(ev.endDate) ?? new Date(ev.endDate ?? ev.startDate);
      return +evStart <= +clicked && +clicked <= +evEnd + DAY;
    });

    if (selectedEvent) {
      const name = countryInput.value;
      const code = countryNameToCode[name] ?? countryCode;

      showCountryDetail(code, name, selectedEvent.startDate, { scrollIntoView: true });
    }
  });

  searchVolumeContainer.appendChild(plotSvg);
}
```

```js
renderSearchVolumePlot();

["input", "change"].forEach(ev =>
  highlightToggle.addEventListener?.(ev, renderSearchVolumePlot)
);

let _tip = document.getElementById("table-tooltip");
if (!_tip) {
  _tip = document.createElement("div");
  _tip.id = "table-tooltip";
  document.body.appendChild(_tip);
}

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

  updateURL({ country }, true);

  const range = dateRangeInput?.value?.value;
  const newEvents = await fetchCenalertEvents({ country, range });

  const hasEvents = Array.isArray(newEvents) && newEvents.length > 0;
  if (hasEvents) {
    const first = newEvents[0];
    const firstKey = first.__matchKey || first.dateLabel || null;
    if (firstKey) {
      updateURL({ country, ...(range ? { range } : {}), event: firstKey }, false);
      showCountryDetail(newCode, country, firstKey, { scrollIntoView: false });
      return;
    }
  }

  updateURL({ country: newCode, ...(range ? { range } : {}) }, true);
  showCountryDetail(newCode, country, null, { scrollIntoView: false });
  renderSearchVolumePlot();
});

dateRangeInput.addEventListener("change", async () => {
  const range = dateRangeInput.value.value;
  const country = countryInput.value;
  const newCode = countryNameToCode[country];
  const scrollY = window.scrollY;

  updateURL({ range }, true);

  const newEvents = await fetchCenalertEvents({ country: newCode, range });

  const hasEvents = Array.isArray(newEvents) && newEvents.length > 0;
  if (hasEvents) {
    const first = newEvents[0];
    const firstKey = first.__matchKey || first.dateLabel || null;
    if (firstKey) {
      updateURL({ country: newCode, range, event: firstKey }, false);
      
      showCountryDetail(newCode, country, firstKey, { scrollIntoView: false });
      return;
    }
  }

  updateURL({ country: newCode, range }, true);
  showCountryDetail(newCode, country, null, { scrollIntoView: false });
  renderSearchVolumePlot();
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

const detailSection = html`<div class="card detail-view modern-card"></div>`;
const grid = html`<div class="tiles-grid"></div>`;

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
  detailSection, formatDMYdots,
});

async function showCountryDetail(code, name, selectedEventKey, opts = { scrollIntoView: false }) {
  const displayName = typeof name === "string" ? name : (countryInput?.value || String(code));

  const prevScrollY = window.scroll
 const fullSeries = (await getTimeseriesForCountry(code))
  .map(d => ({
    ...d,
    topic: "vpn"
  }))
  .sort((a, b) => a.date - b.date);
  const hasAnyEvents = Array.isArray(timeseries) && timeseries.length > 0;

  openDetail(code, name, fullSeries, timeseries, hasAnyEvents, selectedEventKey);
  if (opts.scrollIntoView) {
    detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.scrollTo(0, scrollY);
}
const renderGrid = createGridRenderer({ html, parseISO, openDetail });

renderGrid(
  grid,
  uniqueCountriesWithEvents,
  state
);

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
:root {
  --font-sans: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #444;
  --color-accent: #1e90ff;
  --bg: #ffffff;
  --bg-alt: #f5f5f7;
  --text: #222222;
  --text-light: #555555;
  --border: #e5e5e5;
  --card-bg: #ffffff;
  --plot-text: var(--text);
  --plot-line: var(--text);
  --plot-grid: var(--text-light);
  --plot-bg: transparent;
}


.filters-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filters-row > * {
  flex: 1 1 220px;
}
.disclaimer-box {
  background: #960808ff !important;
  color: white !important;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  margin: 1rem 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  font-family: var(--font-sans);
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
  align-items: flex-start; 
}

.modern-filters .filter-group {
  display: flex;
  flex-direction: column;
  flex: 1 1 220px;
}

.modern-filters label {
  font-weight: 500;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--color-text-primary);
  text-align: center; 
  margin-bottom: 0.25rem;
}

.modern-filters input, 
.modern-filters select {
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  padding: 0.4rem 0.4rem;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  justify-content: center; 
  font-family: var(--font-sans);
  width: 100%;
}

.modern-filters input[type="date"] {
  min-width: 140px; 
  height: 2rem;  
  justify-content: center; 
  padding: 0.45rem 0.75rem;
}
.date-range-custom {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: flex-end; 
}

.date-range-custom .filter-group {
  flex: 1;
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

.detail-view.modern-card {
  gap: 0; 
  padding: 1rem; 
}

.card-big {
    display: flex;
    flex-wrap: wrap;
    color: var(--color-text-primary);
    padding: 0rem 0rem;
    font-family: var(--font-sans);
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
  padding: 6px 8px;
  border-radius: 6px;
  font: 12px/1.35 var(--sans-serif, system-ui, sans-serif);
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
  overflow: hidden;
  height: 100%;
  max-height: 78vh; 
  min-height: 0;
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
.search-volume-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 115%;
}

.search-volume-header h2 {
  font-family: var(--font-sans);
  font-size: 1.1rem !important;
  font-weight: 500;
  display: flex;
  color: var(--color-text-secondary);
  justify-content: space-between;
  align-items: center;
}

.highlight-toggle-wrapper label {
  display: flex !important; 
  font-family: var(--font-sans);   
  align-items: center;       
  gap: 5rem;
  white-space: nowrap;  
  font-size: 0.8rem;   
}

.highlight-toggle-wrapper input[type="checkbox"] {
  appearance: none; 
  -webkit-appearance: none;
  width: 32px;
  height: 16px;
  background: #ddd;
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.highlight-toggle-wrapper input[type="checkbox"]:checked {
  background: #4f46e5;
}

.highlight-toggle-wrapper input[type="checkbox"]::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.highlight-toggle-wrapper input[type="checkbox"]:checked::after {
  transform: translateX(16px); 
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

.timeline-scroller{
  overflow: auto;
  overscroll-behavior: contain;
}

.timeline-scroller::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.timeline-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-scroller::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

/* Firefox */
.timeline-scroller {
  scrollbar-width: thin;
  scrollbar-color: #888 transparent;
}

.plot-tooltip {
  font-family: var(--font-sans) !important;
  font-size: 13px !important;
  line-height: 1.4;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text);
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
</style>