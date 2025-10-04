---
title: CenAlert Dashboard
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { utcParse, utcFormat } from "https://esm.sh/d3-time-format@4";

const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
const parseDate = utcParse("%m/%d/%Y");
const parseISO = utcParse("%Y-%m-%d");
const fmtDMY = utcFormat("%d.%m.%Y");
const zipped = await FileAttachment("data/annotated_merged.csv.zip").zip();
let timeSeries = await zipped.file("annotated_merged.csv").csv({ typed: true });

timeSeries = timeSeries
  .map((d) => {
    const s = String(d.date).trim();
    const dt =
      parseISO(s) ||
      parseDate(s) ||
      (isFinite(Date.parse(s)) ? new Date(s) : null);
    return {
      ...d,
      date: dt,
      country: (d.country ?? "").trim(),
    };
  })
  .filter((d) => d.date instanceof Date && !isNaN(d.date));

const timeSeriesReduced = timeSeries.flatMap(({ date, value, country }) => [
  { date, rate: value, country, topic: "vpn" },
]);

const rawEvents = await FileAttachment("data/events.csv").csv({ typed: false });
const events = rawEvents.map((d) => ({
  ...d,
  description: String(d.cause ?? ""),
}));

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryNameToCode = {};
const countries = Array.from(
  new Set(
    timeSeriesReduced
      .map((d) => {
        const countryCode = (d?.country ?? "").trim().toUpperCase();
        if (!countryCode || countryCode === "UNKNOWN") {
          return null;
        }
        const countryName = regionNames.of(countryCode) || countryCode;
        countryNameToCode[countryName] = countryCode;

        return countryName;
      })
      .filter((s) => s !== null),
  ),
).sort();

let defaultCountry = null;
if (countries.includes(countryParam)) {
  defaultCountry = countryParam;
}
```

```js
const countryInput = Inputs.select(countries, {
  label: "Country",
  value: defaultCountry ?? countries[0],
});
const countryGenerator = Generators.input(countryInput);
```

```js
const countryCode = countryNameToCode[countryGenerator];
const filteredEvents = events.filter((d) => d.country === countryCode &&
    (!startDate || d.date >= startDate) &&
    (!endDate || d.date <= endDate));
const timeSeriesFiltered = timeSeries.filter((d) => d.country === countryCode &&
    (!startDate || d.date >= startDate) &&
    (!endDate || d.date <= endDate));
const timeSeriesReducedFiltered = timeSeriesReduced.filter(
  (d) => d.country === countryCode &&
    (!startDate || d.date >= startDate) &&
    (!endDate || d.date <= endDate)
);
```
```js
const minDate = timeSeriesReduced.reduce(
  (min, d) => d.date < min ? d.date : min,
  timeSeriesReduced[0]?.date
);
```
```js
const maxDate = timeSeriesReduced.reduce(
  (max, d) => d.date > max ? d.date : max,
  timeSeriesReduced[0]?.date
);
```
```js
const startDateInput = Inputs.date({
  label: "Start Date",
  value: minDate,
  min: minDate,
  max: maxDate,
});
```
```js
const endDateInput = Inputs.date({
  label: "End Date",
  value: maxDate,
  min: minDate,
  max: maxDate,
});
```
```js
const startDate = Generators.input(startDateInput);
const endDate = Generators.input(endDateInput);
```

```js
function eventsCard(
  rows,
  {
    title = "Events",
    colorHeader = "#444",
    valueKey = "impact",
    filterStartKey = "start",
    filterEndKey = "end",
    sortBy = "start",
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
const defaultStartEnd = [
  timeSeriesFiltered.at(-365).date,
  timeSeriesFiltered.at(-1).date,
];
const startEnd = Mutable(defaultStartEnd);
const setStartEnd = (se) => (startEnd.value = se ?? defaultStartEnd);
const getStartEnd = () => startEnd.value;
```

```js
const zoomedAnomalies = filteredEvents
  .map((d) => {
    const s = parseISO(String(d.start)) ?? new Date(d.start);
    const e = parseISO(String(d.end)) ?? new Date(d.end ?? d.start);
    return { ...d, s, e };
  })
  .filter((d) => d.s && d.e && !(d.e < startEnd[0] || d.s > startEnd[1]));

const [yMin, yMax] = d3.extent(
  timeSeriesReducedFiltered.filter(
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

const filteredEventsNum = filteredEvents.map((d) => {
  const isUnknown =
    String(d.label ?? "")
      .trim()
      .toLowerCase() === "unknown";
  return {
    ...d,
    impact: +d.impact,
    who: isUnknown ? "CenAlert" : (d.who ?? ""),
    cause: isUnknown ? "unknown" : (d.cause ?? ""),
  };
});

const impactMax = d3.max(filteredEventsNum, (d) => d.impact || 0);
```
<div class="card-big" style="display:flex; flex-direction:column;">
  <div class="summary">
    CenAlert is an open-source, data-driven alert system that leverages Google Trends to pinpoint where and when global Internet censorship spikes—amplifying user voices even in hard-to-monitor regions. By detecting surges in searches for circumvention tools, CenAlert provides timely, prioritized insights and notifications to empower advocacy and response, bridging critical gaps left as traditional reporting channels face increasing threats. 
  </div>
</div>

<div class="card" style="display:flex; flex-direction:column; margin-top: 2rem;">
  <div class="filters-row">
    ${countryInput}
    ${Inputs.select(["VPN"], { label: "Search Term", value: "VPN" })}
    ${startDateInput}
    ${endDateInput}
  </div>
</div>

<div class="grid grid-cols-2-3" style="margin-top: 2rem;">
  <!-- <div class="card card-big" style="display: flex; flex-direction: column;">
    <h2>${getStartEnd() === defaultStartEnd
        ? "Search volume over the past year"
        : getStartEnd().map(fmtDMY).join(" - ")}
    </h2><br>
    <span style="flex-grow: 1;">${resize((width, height) =>
      Plot.plot({
        width,
        height,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.lineY(timeSeriesReducedFiltered.filter((d) => startEnd[0] <= d.date && d.date < startEnd[1]), 
          {x: "date", y: "rate", stroke: "topic", curve: "step", tip: true, markerEnd: true}),
          Plot.rectY(zoomedAnomalies, {
            x1: d => d.s,
            x2: d => d.e,
            y1: yMin,
            y2: yMax,
            fill: "#d33",
            fillOpacity: 0.15,
            tip: true,
            title: d =>
              `𝐂𝐚𝐮𝐬𝐞: ${d.cause}\n` +
              `𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧: ${fmtDMY(d.s)} – ${fmtDMY(d.e)}\n` +
              (d.impact ? `𝐈𝐦𝐩𝐚𝐜𝐭: ${(+d.impact).toFixed(2)}` : ""),
          }),
          Plot.ruleX(zoomedAnomalies.map(d => d.s), { stroke: "#d33", strokeOpacity: 0.85, strokeWidth: 3}),
          Plot.ruleX(zoomedAnomalies.map(d => d.e), { stroke: "#d33", strokeOpacity: 0.85, strokeWidth: 3})
        ]
      })
    )}</span>
  </div> -->
  <!-- <div class="card card-side">
    ${eventsCard(filteredEvents, {
        title: "Events (selected period)",
        colorHeader: color.apply("vpn"),
        limit: 20,
        useWindow: true
        // descKey: "description"
    })}
  </div> -->
</div>

<div class="grid">
  <div class="card">
    <h2>Search volume all time (${d3.extent(timeSeriesFiltered, (d) => d.date.getUTCFullYear()).join("–")})</h2>
    <h3>Click or drag to zoom</h3><br>
    ${resize((width) =>
      Plot.plot({
        width,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(timeSeriesReducedFiltered, {x: "date", y: "rate", stroke: "topic", tip: true}),
          (index, scales, channels, dimensions, context) => {
            const x1 = dimensions.marginLeft;
            const y1 = 0;
            const x2 = dimensions.width - dimensions.marginRight;
            const y2 = dimensions.height;
            const brushed = (event) => {
              if (!event.sourceEvent) return;
              let {selection} = event;
              if (!selection) {
                const r = 10; // radius of point-based selection
                let [px] = d3.pointer(event, context.ownerSVGElement);
                px = Math.max(x1 + r, Math.min(x2 - r, px));
                selection = [px - r, px + r];
                g.call(brush.move, selection);
              }
              setStartEnd(selection.map(scales.x.invert));
            };
            const pointerdowned = (event) => {
              const pointerleave = new PointerEvent("pointerleave", {bubbles: true, pointerType: "mouse"});
              event.target.dispatchEvent(pointerleave);
            };
            const brush = d3.brushX().extent([[x1, y1], [x2, y2]]).on("brush end", brushed);
            const g = d3.create("svg:g").call(brush);
            g.call(brush.move, getStartEnd().map(scales.x));
            g.on("pointerdown", pointerdowned);
            return g.node();
          }
        ]
      })
    )}
  </div>
  <!-- <div class="card" style="display:flex; flex-direction:column;">
    <h2>All Events</h2>
    <div style="flex:1; min-height:0; overflow:auto;">
      ${Inputs.table(filteredEventsNum, {
        columns: ["start","end","who","cause","peak","impact"],
        header: {
          start: "Start Date",
          end: "End Date",
          cause: "Reported Cause",
          who: "Reported By",
          peak: "Peak Date",
          impact: "Impact"
        },
        width: {
          cause: 240,
          who: 130,
          impact: 25,
          start: 40,
          end: 40,
          peak: 40
        },
        rows: 18,
        sort: "start",
        reverse: true,
        format: {
          impact: sparkbar(impactMax),
          start: d => d ? fmtDMY(parseISO(String(d))) : "",
          end:   d => d ? fmtDMY(parseISO(String(d))) : "",
          peak:   d => d ? fmtDMY(parseISO(String(d))) : "",
          cause: d => {
            const s = String(d ?? "");
            return html`<span class="cell-ellipsis" data-full=${s} aria-label=${s}>${s}</span>`;
            }
        }
      })}
    </div>
  </div> -->
</div>

```js
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
```
<style>
.filters-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filters-row > * {
  flex: 1 2 220px;
}

.summary {
  display: flex;
  flex-wrap: wrap;
}

.summary > * {
  fl
  ex: 1 1 220px;
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
}

.events-grid > .r {
  text-align: center;
}

.grid-cols-2-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
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
  .card-big {
    width: 95vw;
  }
  .card-side {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
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
</style>