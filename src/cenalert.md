---
title: CenAlert Dashboard
style: styles/cenalert.css
---
[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { utcParse, utcFormat } from "https://esm.sh/d3-time-format@4";
import { fetchCenalertEvents } from "./components/queries.js";
import { fetchCenalertTimeseries } from "./components/queries.js";
import { formatDMYdots } from "./components/utils.js";
import { createDetailOpener } from "./components/detail-view.js";
import { downloadLinks } from "./components/data-download.js";
import { updateURL } from "./components/utils.js";
import { createSearchVolumeChart } from "./components/time-series-chart.js"; 

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
let defaultCountry = "Russia";
if (countries.includes(countryParam)) {
  defaultCountry = countryParam;
}

const DAY = 24 * 60 * 60 * 1000;
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
    if (dateRangeGenerator.value === "all") return true;
    return !(d.e < startDate || d.s > endDate);
  })
  .map((d) => {
    if (startDate && endDate) {
      return {
        ...d,
        s: new Date(Math.max(d.s.getTime(), startDate.getTime())),
        e: new Date(Math.min(d.e.getTime(), endDate.getTime()))
      };
    }
    return d;
  });

const fmtYMD = d3.utcFormat("%Y.%m.%d");
```


<div class="card-big" style="display:flex; flex-direction:column;">
  <div style="margin-bottom: 1rem;">
    <a href="https://censoredplanet.org/papers/cenalert.pdf" target="_blank" style="display: inline-flex; align-items: center; background: #3bcbcbff; color: #0f172a; padding: 6px 14px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; text-decoration: none; border: 1px solid #17827B; transition: background 0.2s;">
      <span style="margin-right: 6px;">📄</span> Read the CenAlert paper
      <svg style="width: 16px; height: 16px; margin-left: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
    </a>
  </div>
      CenAlert is an open-source, data-driven alert system that leverages Google Trends to pinpoint where and when global Internet censorship spikes, amplifying user voices even in hard-to-monitor regions. By detecting surges in searches for circumvention tools, CenAlert provides timely, prioritized insights and notifications to empower advocacy and response, bridging critical gaps left as traditional reporting channels face increasing threats.
</div>
<div class="disclaimer-box">
  CenAlert identifies censorship through user behavior rather than direct network measurements. By tracking surges in demand for VPNs and similar tools, it highlights when users are actively trying to bypass restrictions. While these spikes highly correlate with censorship, they may also indicate other access issues like georestrictions or responses to new digital laws.
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
  const chart = createSearchVolumeChart(timeseries, {
    zoomedAnomalies,
    showHighlight,
    width,
    onPlotClick: (clickedDate) => {
      const selectedEvent = events.find(ev => {
        const evStart = parseISO(ev.startDate) ?? new Date(ev.startDate);
        const evEnd = parseISO(ev.endDate) ?? new Date(ev.endDate ?? ev.startDate);
        return +evStart <= +clickedDate && +clickedDate <= +evEnd + DAY;
      });

      if (selectedEvent) {
        const name = countryInput.value;
        const code = countryNameToCode[name] ?? countryCode;
        showCountryDetail(code, name, selectedEvent.startDate, { scrollIntoView: true });
      }
    }
  });

  searchVolumeContainer.appendChild(chart);
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

const formatImpact = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
}).format;

const softBreakLongTokens = (s, every = 16) =>
  String(s).replace(new RegExp(`(\\S{${every}})(?=\\S)`, "g"), "$1 ");

const detailSection = html`<div class="card detail-view modern-card"></div>`;

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

display(detailSection);
```
