---
title: CenAlert Countries
---

[![Censored Planet Logo](logo-umichlab.svg)](/)

```js
const DAY = 24 * 60 * 60 * 1000;
const PX_PADDING = -20;
const events = await FileAttachment("data/events.csv").csv({
  typed: false,
});

const rawEvents = events.map((d) => {
  const isUnknown =
    String(d.label ?? "")
      .trim()
      .toLowerCase() === "unknown";
  return {
    ...d,
    who: isUnknown ? "CenAlert" : (d.who ?? ""),
    cause: isUnknown ? "unknown" : (d.cause ?? ""),
  };
});

const eventCounts = rawEvents.reduce((acc, d) => {
  const code = String(d.country).toUpperCase();
  acc[code] = (acc[code] || 0) + 1;
  return acc;
}, {});

const zipped = await FileAttachment("data/annotated_merged.csv.zip").zip();
const timeSeries = await zipped.file("annotated_merged.csv").csv({ typed: true });
const timeSeriesReduced = timeSeries.flatMap(({ date, value, country }) => [
  {
    date,
    rate: value,
    country,
  },
]);

const regionNames = new Intl.DisplayNames(["en"], {
  type: "region",
});

const enriched = timeSeriesReduced.map((d) => ({
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

const formatDMYdots = (s) => {
  if (!s) return "";
  const y = s.slice(0, 4),
    m = s.slice(5, 7),
    d = s.slice(8, 10);
  return y && m && d ? `${d}.${m}.${y}` : "";
};

const softBreakLongTokens = (s, every = 16) =>
  String(s).replace(new RegExp(`(\\S{${every}})(?=\\S)`, "g"), "$1 ");

function flagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

const norm = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
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

let selectedCode = null;
let currentList = uniqueCountriesWithEvents;

function renderGrid(list) {
  currentList = list;
  grid.innerHTML = "";
  for (const { code, name, totalEvents } of list) {
    const flag = flagEmoji(code);
    const isSelected = code === selectedCode;

    const tile = html`
      <div
        class=${`tile card ${isSelected ? "selected" : ""}`}
        data-code=${code}
        data-name=${name}
        role="button"
        tabindex="0"
        onclick=${() => {
          selectedCode = code;
          renderGrid(currentList);
          openDetail(code, name);
        }}
        onkeydown=${(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectedCode = code;
            renderGrid(currentList);
            openDetail(code, name);
          }
        }}
      >
        <div class="tile-content">
          <div class="line-top">
            <span class="flag">${flag}</span>
            <span class="country-name">${name}</span>
          </div>
          <div class="line-bottom">
            <span class="events">
              ${totalEvents} ${totalEvents === 1 ? "Event" : "Events"}
            </span>
          </div>
        </div>
      </div>
    `;
    grid.append(tile);
  }
}

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
  renderGrid(filtered);
});

renderGrid(uniqueCountriesWithEvents);

function openDetail(code, name) {
  const countryEvents = rawEvents
    .filter((d) => String(d.country).toUpperCase() === code)
    .map((d, i) => {
      const nImpact = Number(d.impact);
      const start = formatDMYdots(d.start);
      const end = formatDMYdots(d.end);
      const dateLabel =
        start && end && start !== end
          ? `${start} - ${end}`
          : start || end || "—";
      return {
        date: new Date(d.peak || d.start),
        dateLabel,
        startISO: d.start || null,
        endISO: d.end || null,
        startDate: d.start ? new Date(d.start) : null,
        endDate: d.end ? new Date(d.end) : null,
        code: "Impact",
        title: Number.isFinite(nImpact) ? formatImpact(nImpact) : "—",
        who: d.who || "",
        impact: nImpact,
        description: softBreakLongTokens(d.cause || "unknown", 16),
      };
    })
    .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));

  renderDetail(code, name, countryEvents);
  gridSection.hidden = true;
  detailSection.hidden = false;
  window.scrollTo({
    top: detailSection.offsetTop,
    behavior: "smooth",
  });
}

function renderDetail(code, name, events) {
  detailSection.innerHTML = "";
  const flag = flagEmoji(code);
  const heading = html`<h2 class="detail-title">
    <span class="flag">${flag}</span>
    <span class="country-name">Events in ${name}</span>
  </h2>`;
  const detailHeader = html`<div class="detail-header">${heading}</div>`;
  if (!events.length) {
    detailSection.append(html`<div class="empty">No events for ${name}.</div>`);
    return;
  }

  const r = 36;
  const margin = {
    top: 24,
    right: 20,
    bottom: 24,
    left: 20,
  };
  const laneX = 160;
  const width = 540;
  const rowHeight = r * 2.8;
  const baseHeight = margin.top + margin.bottom + events.length * rowHeight;
  const extraLastGap = 180;
  const height = baseHeight + extraLastGap;

  const VISIBLE_ROWS = 5;
  const viewHeight = margin.top + margin.bottom + VISIBLE_ROWS * rowHeight;

  const y = d3
    .scaleBand()
    .domain(d3.range(events.length))
    .range([margin.top + r, baseHeight - margin.bottom - r])
    .paddingInner(0.35);

  const svg = d3.create("svg").attr("width", width).attr("height", height);

  svg
    .append("line")
    .attr("x1", laneX)
    .attr("x2", laneX)
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", "#bbb")
    .attr("stroke-width", 2);

  const g = svg.append("g");

  const node = g
    .selectAll(".node")
    .data(
      events.map((d, i) => ({
        ...d,
        i,
      })),
    )
    .join("g")
    .attr("class", "node")
    .attr(
      "transform",
      (d) => `translate(${laneX}, ${y(d.i) + y.bandwidth() / 2})`,
    )
    .style("cursor", "pointer");

  node
    .append("circle")
    .attr("r", r)
    .attr("fill", "#fcfcfc")
    .attr("stroke", "#444")
    .attr("stroke-width", 1.5);

  node
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .text((d) => d.code);

  node
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.1em")
    .attr("font-size", 12)
    .attr("fill", "#555")
    .attr("font-weight", 700)
    .text((d) => d.title);

  node
    .on("mouseenter", function () {
      d3.select(this)
        .select("circle")
        .attr("stroke", "#1e90ff")
        .attr("stroke-width", 2);
    })
    .on("mouseleave", function () {
      if (!d3.select(this).classed("active")) {
        d3.select(this)
          .select("circle")
          .attr("stroke", "#444")
          .attr("stroke-width", 1.5);
      }
    })
    .on("click", function (event, d) {
      const self = d3.select(this);
      const isActive = self.classed("active");
      g.selectAll(".node")
        .classed("active", false)
        .select("circle")
        .attr("stroke", "#444")
        .attr("stroke-width", 1.5);
      if (!isActive) {
        self
          .classed("active", true)
          .select("circle")
          .attr("stroke", "#1e90ff")
          .attr("stroke-width", 2.5);
      }
      renderRight(d);
    });

  const labelDx = r + 12;
  const labelWidth = 320;
  const label = node.append("g").attr("transform", `translate(${labelDx}, 0)`);

  label
    .append("line")
    .attr("x1", -8)
    .attr("x2", 0)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", "#ccc");

  label
    .append("text")
    .attr("font-weight", 600)
    .attr("y", -10)
    .text((d) => `${d.dateLabel}`);

  const fo = node
    .append("foreignObject")
    .attr("x", labelDx)
    .attr("y", 6)
    .attr("width", labelWidth)
    .attr("height", (d, i) =>
      i === events.length - 1 ? rowHeight + extraLastGap : rowHeight,
    );

  const htmlBox = fo.append("xhtml:div").attr("class", "label-html");

  const rowWho = htmlBox.append("xhtml:div").attr("class", "label-row who-row");
  rowWho.append("xhtml:span").attr("class", "label-key").text("Reported By:");
  rowWho
    .append("xhtml:span")
    .attr("class", "label-value")
    .text((d) => d.who || "—");
  rowWho.style("display", (d) => (d.who ? null : "none"));
  const rowDesc = htmlBox
    .append("xhtml:div")
    .attr("class", "label-row desc-row");
  rowDesc.append("xhtml:span").attr("class", "label-key").text("Cause:");
  rowDesc
    .append("xhtml:span")
    .attr("class", "label-value")
    .text((d) => d.description || "—");

  const timeSeriesCountries = timeSeriesReduced.filter(
    (d) => String(d.country).toUpperCase() === code,
  );
  const rightCard = html`<div class="card">
    <h3 class="right-title">Rate over time</h3>
    <div class="right-body"></div>
  </div>`;

  function renderRight(selectedEvent = null) {
    const titleEl = rightCard.querySelector(".right-title");
    const bodyEl = rightCard.querySelector(".right-body");

    titleEl.textContent = selectedEvent
      ? selectedEvent.dateLabel
      : "Rate over time";
    bodyEl.innerHTML = "";

    if (!timeSeriesCountries.length) {
      bodyEl.append(html`<div class="empty">No time series for ${name}.</div>`);
      return;
    }

    if (!selectedEvent) {
      const chart = Plot.plot({
        height: viewHeight + PX_PADDING,
        y: {
          grid: true,
          label: "rate (%)",
        },
        marks: [
          Plot.lineY(timeSeriesCountries, {
            x: "date",
            y: "rate",
            curve: "step",
            tip: true,
          }),
        ],
      });
      bodyEl.append(chart);
      return;
    }

    const s = selectedEvent.startDate || selectedEvent.date;
    const e =
      selectedEvent.endDate || selectedEvent.startDate || selectedEvent.date;
    const x0 = new Date(s.getTime() - 3 * DAY);
    const x1 = new Date(e.getTime() + 3 * DAY);

    const slice = timeSeriesCountries.filter(
      (d) => d.date >= x0 && d.date <= x1,
    );
    const series = slice.length ? slice : timeSeriesCountries;

    const yMin = d3.min(series, (d) => d.rate);
    const yMax = d3.max(series, (d) => d.rate);

    const marks = [
      Plot.lineY(series, {
        x: "date",
        y: "rate",
        curve: "step",
        tip: true,
      }),
      Plot.rectY(
        [{s,e,},],
        {
          x1: (d) => d.s,
          x2: (d) => d.e,
          y1: yMin,
          y2: yMax,
          fill: "#d33",
          fillOpacity: 0.15,
          title: `${selectedEvent.dateLabel}\n${selectedEvent.who || ""}\n${selectedEvent.description || ""}`,
        },
      ),
      Plot.ruleX([s], {
        stroke: "#d33",
        strokeOpacity: 0.9,
        strokeWidth: 2,
      }),
    ];
    if (+e !== +s)
      marks.push(
        Plot.ruleX([e], {
          stroke: "#d33",
          strokeOpacity: 0.9,
          strokeWidth: 2,
        }),
      );

    const chart = Plot.plot({
      height: viewHeight + PX_PADDING - 9,
      y: {
        grid: true,
        label: "rate (%)",
      },
      x: {
        domain: [x0, x1],
        nice: false,
      },
      marks,
    });

    const meta = html`<div class="event-meta" style="margin-top:.5rem;"></div>`;
    bodyEl.append(chart, meta);
  }

  renderRight();
  const scroller = html`<div class="timeline-scroller"></div>`;
  scroller.style.height = `${viewHeight}px`;
  scroller.style.overflow = "auto";
  scroller.append(svg.node());

  const leftCard = html`<div class="card"></div>`;
  leftCard.append(scroller);
  const layout = html`<div class="grid-1-2">${leftCard}${rightCard}</div>`;
  detailSection.append(detailHeader, layout);
}

display(gridSection);
display(detailSection);
```

<style>
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
.label-value { flex: 1; overflow-wrap: anywhere; word-break: break-word; }

.detail-view .detail-header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .5rem;
}

.grid-1-2{
  display: grid;
  grid-template-columns: 1fr 2fr;
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
