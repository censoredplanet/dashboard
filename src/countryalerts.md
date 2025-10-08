---
title: CenAlert Countries
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
import { fetchCenalertEvents } from "./components/queries.js";
import { fetchCenalertTimeseries } from "./components/queries.js";
import { utcParse } from "https://esm.sh/d3-time-format@4";
import { formatDMYdots, norm } from "./components/utils.js";
import { createGridRenderer } from "./components/render-grid.js";
import { createDetailOpener } from "./components/detail-view.js";


const parseISO = utcParse("%Y-%m-%d");

const DAY = 24 * 60 * 60 * 1000;
const PX_PADDING = -20;

const events = await fetchCenalertEvents({
  country: null,
});

const eventCounts = events.reduce((acc, d) => {
  const code = String(d.country).toUpperCase();
  acc[code] = (acc[code] || 0) + 1;
  return acc;
}, {});

const regionNames = new Intl.DisplayNames(["en"], {
  type: "region",
});

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

const gridSection = html`<div class="card card-with-search"></div>`;
const detailSection = html`<div class="card detail-view" hidden></div>`;

const gridHeader = html`<div class="card-header">
  <input
    class="country-search"
    type="text"
    placeholder="Search country…"
    aria-label="Search countries"
  />
</div>`;

const grid = html`<div class="tiles-grid"></div>`;
gridSection.append(gridHeader, grid);

let currentList = uniqueCountriesWithEvents;
const state = {
  selectedCode: null,
  tsCache: new Map(),
  setCurrentList: (list) => { currentList = list; }
};

const tsCache = new Map();

const openDetail = createDetailOpener({
  html, d3, Plot, resize,
  DAY, PX_PADDING,
  events, formatImpact, softBreakLongTokens,
  gridSection, detailSection,
  formatDMYdots,
});

const renderGrid = createGridRenderer({ html, parseISO, openDetail });

const searchInput = gridHeader.querySelector(".country-search");
searchInput.addEventListener("input", (e) => {
  const q = norm(e.target.value.trim());
  const filtered = q
    ? uniqueCountriesWithEvents.filter(({ name }) => norm(name).startsWith(q))
    : uniqueCountriesWithEvents;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">No countries match “${e.target.value}”.</div>`;
    return;
  }
  renderGrid(
    grid,
    filtered,
    state
  );
});

renderGrid(
  grid,
  uniqueCountriesWithEvents,
  state
);

display(gridSection);
display(detailSection);
```

<style>
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

.tile.card:focus-visible {
  outline: 2px solid #1e90ff;
  outline-offset: 2px;
}

.tile.card.selected {
  border-color: #1e90ff;
  box-shadow: 0 0 0 3px rgba(30,144,255,.15);
}

.tile.card .flag {
  font-size: 1.8rem;
}

.line-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1rem;
}

.line-bottom {
  margin-top: 0.3rem;
  font-size: 1.3rem;
  font-weight: 500;
  color: #333;
  text-align: center;
  display: flex; 
  justify-content: center;
  width: 100%;  
}

.card-with-search {
  display: flex;
  flex-direction: column;
  gap: .75rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  flex-wrap: wrap;
}

.country-search {
  min-width: 220px;
  width: 280px;
  max-width: 100%;
  padding: .5rem .75rem;
  border: 1px solid #ddd;
  border-radius: .5rem;
  font-size: 1rem;
}

.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 1rem 0;
  color: #666;
  font-style: italic;
}

.label-html { font-size: 12px; line-height: 1.2; color: #555; }
.label-row { display: flex; align-items: flex-start; gap: .35rem; margin-top: 2px; }
.label-key { font-weight: 600; color: #333; white-space: nowrap; }
.label-value { flex: 1; overflow-wrap: break-word; word-break: break-word; }
.desc-row .label-value { overflow-wrap: anywhere; word-break: break-word; }

.detail-view .detail-header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .5rem;
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

@media (max-width: 768px){
  .timeline-scroller svg text { font-size: 24px; }
  .timeline-scroller .label-html { font-size: 24px; }
}

</style>
