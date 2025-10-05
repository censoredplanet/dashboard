---
title: CenAlert Dashboard
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { utcParse, utcFormat } from "https://esm.sh/d3-time-format@4";
import { fetchCenalertEvents } from "./components/queries.js";
import { fetchCenalertTimeseries } from "./components/queries.js";

const params = new URLSearchParams(window.location.search);
const countryParam = (params.get("country") ?? "").trim();
const parseDate = utcParse("%m/%d/%Y");
const parseISO = utcParse("%Y-%m-%d");
const fmtDMY = utcFormat("%d.%m.%Y");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countriesNew = await FileAttachment("data/cenalertCountries.json").json();

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
const countryInput = Inputs.select(countries, {
  label: "Country",
  value: defaultCountry ?? countries[0],
});
const countryGenerator = Generators.input(countryInput);
```

```js
const countryCode = countryNameToCode[countryGenerator];
const events = await fetchCenalertEvents({
  country: countryCode,
});
const timeseriesFetched = await fetchCenalertTimeseries({
  country: countryCode,
});
const timeseries = timeseriesFetched
  .map(d => ({ ...d, date: parseISO(d.date), topic: "vpn" }))
  .sort((a, b) => a.date - b.date);
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
const defaultStartEnd = [
  timeseries.at(-365).date,
  timeseries.at(-1).date,
];

const startEnd = Mutable(defaultStartEnd);
const setStartEnd = (se) => (startEnd.value = se ?? defaultStartEnd);
const getStartEnd = () => startEnd.value;
```

```js
const zoomedAnomalies = events
  .map((d) => {
    const s = parseISO(String(d.startDate)) ?? new Date(d.startDate);
    const e = parseISO(String(d.endDate)) ?? new Date(d.endDate ?? d.startDate);
    return { ...d, s, e };
  })
  .filter((d) => d.s && d.e && !(d.e < startEnd[0] || d.s > startEnd[1]));

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
    reportedBy: isUnknown ? "CenAlert" : (d.reportedBy ?? ""),
    description: isUnknown ? "unknown" : (d.description ?? ""),
  };
});

const impactMax = d3.max(filteredEventsNum, (d) => d.impact || 0);
```

<div class="card" style="display:flex; flex-direction:column;">
  <h2>Filters</h2>
  <div class="filters-row">
    ${countryInput}
    ${Inputs.select(["VPN"], { label: "Search Term", value: "VPN" })}
  </div>
</div>

<div class="grid grid-cols-2-3" style="margin-top: 2rem;">
  <div class="card card-big" style="display: flex; flex-direction: column;">
    <h2>${startEnd === defaultStartEnd
        ? "Search volume over the past year"
        : startEnd.map(fmtDMY).join(" - ")}</h2><br>
    <span style="flex-grow: 1;">${resize((width, height) =>
      Plot.plot({
        width,
        height,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.lineY(timeseries.filter((d) => startEnd[0] <= d.date && d.date < startEnd[1]), 
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
  </div>
  <div class="card card-side">
    ${eventsCard(events, {
        title: "Events (selected period)",
        colorHeader: color.apply("vpn"),
        limit: 20,
        useWindow: true
    })}
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>Search volume all time (${d3.extent(timeseries, (d) => d.date.getUTCFullYear()).join("–")})</h2>
    <h3>Click or drag to zoom</h3><br>
    ${resize((width) =>
      Plot.plot({
        width,
        y: {grid: true, label: "rate (%)"},
        color,
        marks: [
          Plot.ruleY([0]),
          Plot.lineY(timeseries, {x: "date", y: "rate", stroke: "topic", tip: true}),
          (index, scales, channels, dimensions, context) => {
            const x1 = dimensions.marginLeft;
            const y1 = 0;
            const x2 = dimensions.width - dimensions.marginRight;
            const y2 = dimensions.height;
            const brushed = (event) => {
              if (!event.sourceEvent) return;
              let {selection} = event;
              if (!selection) {
                const r = 10;
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
  <div class="card" style="display:flex; flex-direction:column;">
    <h2>All Events</h2>
    <div style="flex:1; min-height:0; overflow:auto;">
      ${Inputs.table(filteredEventsNum, {
        columns: ["startDate","endDate","reportedBy","description","peak","impact"],
        header: {
          startDate: "Start Date",
          endDate: "End Date",
          description: "Reported Cause",
          reportedBy: "Reported By",
          peak: "Peak Date",
          impact: "Impact"
        },
        width: {
          description: 240,
          reportedBy: 130,
          impact: 25,
          startDate: 40,
          endDate: 40,
          peak: 40
        },
        rows: 18,
        sort: "startDate",
        reverse: true,
        format: {
          impact: sparkbar(impactMax),
          startDate: d => d ? fmtDMY(parseISO(String(d))) : "",
          endDate:   d => d ? fmtDMY(parseISO(String(d))) : "",
          peak:   d => d ? fmtDMY(parseISO(String(d))) : "",
          description: d => {
            const s = String(d ?? "");
            return html`<span class="cell-ellipsis" data-full=${s} aria-label=${s}>${s}</span>`;
            }
        }
      })}
    </div>
  </div>
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
    grid-column: 1;
    grid-row: 1 / span 2;
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