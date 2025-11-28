// components/detail-view.js
document.head.appendChild(
  Object.assign(document.createElement("link"), {
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/emoji.css"
  })
);

export function createDetailOpener(deps) {
  const {
    html, d3, Plot, resize,
    DAY, PX_PADDING,
    events, formatImpact, softBreakLongTokens,
    gridSection, detailSection,
    startDate, endDate,
  } = deps;
  function updateEventUrl(selectedEvent) {
    const params = new URLSearchParams(window.location.search);

    if (!selectedEvent) {
      if (params.has("event")) {
        params.delete("event");
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
      return;
    }

    params.set("event", selectedEvent.__matchKey || selectedEvent.dateLabel || "");
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  function renderDetail(code, name, countryEvents, countryHasAnyEvents) {
    function twemojiFlagCode(code) {
      return [...code.toUpperCase()]
        .map(c => (c.codePointAt(0) - 0x41 + 0x1F1E6).toString(16))
        .join("-");
    }

    const flag = html`
      <img
        src="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${twemojiFlagCode(code)}.svg"
        style="width: 1.6rem; height: 1.6rem; vertical-align: middle;"
      />
    `;

    const rangeStart = d3.min(countryEvents, d => d.date);
    const rangeEnd = d3.max(countryEvents, d => d.date);
    detailSection.innerHTML = "";
    const fmtYMDdots = d3.utcFormat("%Y.%m.%d");
    const dateRangeLabel =
      rangeStart && rangeEnd
        ? `${fmtYMDdots(rangeStart)} - ${fmtYMDdots(rangeEnd)}`
        : "";
    const heading = html`<h2 class="detail-title">
      <span class="flag">${flag}</span>
      <span class="country-name">Events in ${name}</span>
      ${dateRangeLabel ? html`<span class="date-range">(${dateRangeLabel})</span>` : ""}
    </h2>`;
     const detailHeader = html`<div class="detail-header">${heading}</div>`;

    detailSection.append(detailHeader);
    if (!countryEvents.length) {
      if (!countryHasAnyEvents) {
        detailSection.append(html`<div class="empty">No events.</div>`);
      } else {
        detailSection.append(html`
          <div class="empty">
            No events within the selected time range. Try expanding the date range or changing filters.
          </div>
        `);
      }
      return;
  }
      const container = html`<div class="detail-grid">
      <div class="left-col">
        <div class="events-scroller"></div>
      </div>
      <div class="center-col">
        <div class="graph-wrap"></div>
      </div>
      <div class="right-col">
        <div class="summary-wrap"></div>
      </div>
    </div>`;

    detailSection.append(container);

    const scroller = container.querySelector(".events-scroller");
    const graphWrap = container.querySelector(".graph-wrap");
    const summaryWrap = container.querySelector(".summary-wrap");

    // Graph (center column)
    const rightTitle = html`<h3 class="right-title">Rate over time</h3>`;
    const rightBody = html`<div class="right-body"></div>`;
    graphWrap.append(rightTitle, rightBody);

    // Summary (right column)
    const summaryTitle = html`<h3 class="summary-title">Event Summary</h3>`;
    const summaryBody = html`<div id="summary-body" class="summary-body">Select an event to see details.</div>`;
    summaryWrap.append(summaryTitle, summaryBody);
    let bottomDesc = document.getElementById("bottom-desc");
    if (!bottomDesc) {
      bottomDesc = html`<div id="bottom-desc" class="bottom-desc hidden"></div>`;
      summaryWrap.append(bottomDesc);
    } else {
      summaryWrap.append(bottomDesc);
    }
    
    // initial sizes (will be recomputed immediately below)
    let { widthNow: currentWidth, r, baseMinRow, nodeGap } = computeSizes();
    // const r = window.matchMedia("(max-width: 768px)").matches ? 110 : 70;
    const margin = { top: 24, right: 10, bottom: 24, left: 20 };
    const laneX = margin.left + r;
    const width = graphWrap.clientWidth;
    // const baseMinRow = 110;
    // const nodeGap = 50;
    // const extraLastGap = 0;
    // let height = graphWrap.clientHeight;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const VISIBLE_ROWS = isMobile ? 2 : 5;
    const viewHeight = VISIBLE_ROWS * 90;
    summaryWrap.style.height = `${viewHeight}px`;
    summaryWrap.style.overflowY = "auto";
    function computeSizes() {
      const widthNow = Math.max(280, graphWrap.clientWidth || width || 480);
      // radius scales roughly with width; clamp so nodes don't become tiny/huge
      // tweak multipliers to taste (0.07 gives good results for many layouts)
      const computedR = Math.round(Math.max(40, Math.min(140, widthNow * 0.13)));
      // base minimum row, gaps scaled a bit with r
      const computedBaseMinRow = Math.max(80, Math.round(0.9 * computedR + 40));
      const computedNodeGap = Math.max(24, Math.round(computedR * 0.8));
      return { widthNow, r: computedR, baseMinRow: computedBaseMinRow, nodeGap: computedNodeGap };
    }

    const extraLastGap = 0;
    let height = graphWrap.clientHeight || 600;

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("width", "100%")
      .style("height", `${height}px`)
      .style("display", "block");

    svg.append("line")
      .attr("class", "lane")
      .attr("x1", laneX).attr("x2", laneX)
      .attr("y1", margin.top).attr("y2", height - margin.bottom)
      .attr("stroke", "#bbb").attr("stroke-width", 2);

    const g = svg.append("g");

    const node = g.selectAll(".node")
      .data(countryEvents.map((d, i) => ({ ...d, i })))
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${laneX}, ${margin.top + r})`)
      .style("cursor", "pointer");

    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, 3]);

    
    const impactColors = ["#f7f7f7", "#fddbc7", "#f4a582", "#d6604d"];
    function getContrastColor(color) {
      const rgb = d3.color(color);
      if (!rgb) return "#000";
      const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      return luminance < 140 ? "#fff" : "#000"; 
    }
    
    node.append("circle").attr("r", r).attr("fill",  d => impactColors[d.impactQuartile ?? Math.floor(Math.random() * 4)]).attr("stroke", "#444").attr("stroke-width", 1.5);
    //word impact
    node.append("text").attr("text-anchor", "middle").attr("dy", "-0.25em").style("font-size", `${Math.round(r * 0.35)}px`).text((d) => d.code).attr("fill", d => {
    const c = impactColors[d.impactQuartile ?? 0];
    return getContrastColor(c);
  });
;
    // impact score
    node.append("text").attr("text-anchor", "middle").attr("dy", "1.2em").style("font-size", `${Math.round(r * 0.35)}px`).attr("fill", "#555").attr("font-weight", 700).text((d) => d.title).attr("fill", d => {
    const c = impactColors[d.impactQuartile ?? 0];
    return getContrastColor(c);
  });

    node.on("mouseenter", function () {
      const tile = d3.select(this).select(".event-tile");
      tile.transition()
          .duration(120)
          .attr("stroke", "rgba(30,144,255,0.4)")
          .attr("fill", "rgba(30,144,255,0.05)");
    })
    .on("mouseleave", function () {
      const self = d3.select(this);
      const tile = self.select(".event-tile");
      if (!self.classed("active")) {
        tile.transition()
            .duration(120)
            .attr("stroke", "transparent")
            .attr("fill", "transparent");
      }
    })
    .on("click", function (event, d) {
      const self = d3.select(this);
      const isActive = self.classed("active");
      g.selectAll(".node").classed("active", false).select("circle").attr("stroke", "#444").attr("stroke-width", 1.5);
      if (!isActive) {
        self.classed("active", true).select("circle").attr("stroke", "#1e90ff").attr("stroke-width", 2.5);
        self.select(".event-tile").attr("stroke", "#1e90ff").attr("fill", "#1e90ff");
      }
      renderRight(d);
      const summaryBody = document.getElementById("summary-body");
      if (summaryBody) {
        const impactLabels = ["Low", "Moderate", "High", "Severe"];
        const impactLevel = impactLabels[d.impactQuartile ?? 0];
        const impactScore = d.title || "—";
        summaryBody.innerHTML = `
          <div style="margin-bottom: .4rem;"><strong>Date: </strong>${d.dateLabel}</div>
          <div style="margin-bottom: .4rem;"><strong>Impact score:</strong> ${impactScore}</div>
          <div style="margin-bottom: .4rem;"><strong>Level:</strong> ${impactLevel}</div>
          <div><strong>Context:</strong> ${(d.description && d.description.length > 0) ? d.description : "No additional explanation."}</div>
        `;
      }
      updateEventUrl(d);
    });
    

    let labelDx = r + 12;
    let labelWidth = 0;

    function computeLabelWidth() {
      const el = svg.node();
      const rectW = el.getBoundingClientRect().width;
      const svgPx = rectW || el.clientWidth || width;
      labelWidth = Math.max(380, svgPx - (laneX + labelDx) - margin.right);
      g.selectAll("foreignObject").attr("width", labelWidth);
      g.selectAll(".event-tile")
        .attr("width", labelDx + labelWidth + 24);
    }
    
    const label = node.append("g").attr("transform", `translate(${labelDx}, 0)`);
    label.append("line").attr("x1", -8).attr("x2", 0).attr("y1", 0).attr("y2", 0).attr("stroke", "#ccc");
    label.append("text").attr("font-weight", 500).attr("y", r * 0.1).text((d) => `${d.dateLabel}`).style("font-size", `${Math.round(r * 0.35)}px`)
    const tile = node.insert("rect", ":first-child")
      .attr("class", "event-tile")
      .attr("x", -r - 12)
      .attr("y", -r - nodeGap / 2)
      .attr("width", labelDx + 320 + 24) 
      .attr("height", Math.max(baseMinRow, 10) + r * 1.1 + nodeGap) 
      .attr("rx", 8).attr("ry", 8)
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("pointer-events", "all");
    const fo = node.append("foreignObject").attr("x", labelDx).attr("y", r*0.1).attr("width", d => d.tileWidth).attr("height", 10);
    const htmlBox = fo.append("xhtml:div").attr("class", "label-html");

     

    function renderRight(selectedEvent = null) {
      const fmtYMD = d3.utcFormat("%Y.%m.%d");
      const titleEl = graphWrap.querySelector(".right-title");
      const bodyEl = graphWrap.querySelector(".right-body");
      const mobileExtra = window.matchMedia("(max-width: 768px)").matches ? 380 : 0;

      titleEl.textContent = selectedEvent ? selectedEvent.dateLabel : "Rate over time";
      bodyEl.innerHTML = "";

      const seriesnew = deps.seriesForSelectedCountry;

      if (!seriesnew?.length) {
        bodyEl.append(html`<div class="empty">No time series.</div>`);
        return;
      }
      let seriesFiltered = seriesnew;
      if (startDate || endDate) {
        seriesFiltered = seriesnew.filter(d => {
          if (!d.date) return false;
          return (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate);
        });
      }
      if (!selectedEvent) {
        const yMax = d3.max(series, (d) => d.rate);
        const chart = resize((width) =>
          Plot.plot({
            height: (margin.top + margin.bottom + baseMinRow) + PX_PADDING + mobileExtra + 9,
            y: { grid: true, label: "" , domain: [0, yMax] },
            marks: [Plot.lineY(seriesFiltered, { x: "date", y: "rate", curve: "step", tip: true, title: d =>
    `Date: ${fmtYMD(d.date)}\n` +
    `Value: ${d.rate != null ? d.rate.toFixed(2) : "N/A"}` })],
          })
        );
        bodyEl.append(chart);
        return;
      }

      const s = selectedEvent.startDate || selectedEvent.date;
      const e = selectedEvent.endDate || selectedEvent.startDate || selectedEvent.date;
      const x0 = new Date(s.getTime() - 60 * DAY);
      const x1 = new Date(e.getTime() + 1 * DAY);
      const slice = seriesFiltered.filter((d) => d.date >= x0 && d.date <= x1);
      if (startDate || endDate) {
        slice = slice.filter(d => {
          return (!startDate || d.date >= startDate) && (!endDate || d.date <= endDate);
        });
      }
      const series = slice.length ? slice : seriesFiltered;

      const yMin = d3.min(series, (d) => d.rate);
      const yMax = d3.max(series, (d) => d.rate);

      const marks = [
        Plot.lineY(series, { x: "date", y: "rate", curve: "step", tip: true, title: d =>
    `Date: ${fmtYMD(d.date)}\n` +
    `Value: ${d.rate != null ? d.rate.toFixed(2) : "N/A"}` }),
        Plot.rectY([{ s, e }], {
          x1: (d) => d.s, x2: (d) => d.e, y1: yMin, y2: yMax,
          fill: "#ef4444", fillOpacity: 0.15,
          title: `${selectedEvent.dateLabel}\n${selectedEvent.who || ""}\n${selectedEvent.description || ""}`,
        }),
        Plot.ruleX([s], { stroke: "#ef4444", strokeOpacity: 0.9, strokeWidth: 2 }),
      ];
      if (+e !== +s) marks.push(Plot.ruleX([e], { stroke: "#ef4444", strokeOpacity: 0.9, strokeWidth: 2 }));

      const chart = resize((width) =>
        Plot.plot({
          height: (margin.top + margin.bottom + VISIBLE_ROWS * 90) + PX_PADDING + mobileExtra,
          y: { grid: true, label: "", domain: [0, yMax] },
          x: { domain: [x0, x1], nice: false },
          marks,
        })
      );

      const meta = html`<div class="event-meta" style="margin-top:.5rem;"></div>`;
      bodyEl.append(chart, meta);
    }

    renderRight(countryEvents.length ? countryEvents[0] : null);
    scroller.style.overflowY = "auto";
    scroller.append(svg.node());

    // detailSection.append(detailHeader, container);
    
    function layoutNodes() {
      node.each(function (d) {
        const foEl = d3.select(this).select("foreignObject");
        const div = d3.select(this).select(".label-html").node();
        const labelH = Math.ceil(div?.scrollHeight || 0);
        const rowH = Math.max(baseMinRow, labelH + 50);
        d.__rowH = rowH;
        foEl.attr("height", rowH);
      });

      let yCursor = r * 0.6 + 40;
      node.each(function (d) {
        d.__y = yCursor;
        d3.select(this).attr("transform", `translate(${laneX}, ${d.__y})`);
        const tileTop = -r - nodeGap / 2;
        const foTop = r * 0.1;
        const tileHeight = (foTop + d.__rowH + nodeGap / 2) + 19
        d3.select(this).select(".event-tile")
          .attr("x", -r - 24)
          .attr("y", tileTop + 15)
          .attr("width", labelDx + labelWidth + 90)
          .attr("height", tileHeight);
        yCursor += d.__rowH + nodeGap;
      });

      const newBase = yCursor;
      height = newBase + r * 0.6;
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      svg.style("height", "auto");
      svg.attr("height", null);
      

      const dataWithY = node.data();
      const firstY = d3.min(dataWithY, (d) => d.__y) ?? (margin.top + r);
      const lastY = d3.max(dataWithY, (d) => d.__y) ?? (margin.top + r);

      svg.select(".lane").attr("y1", firstY - r).attr("y2", lastY + r);
    }
    function doResizeLayout() {
      // recompute base width and sizes
      currentWidth = graphWrap.clientWidth || currentWidth;
      const sizes = computeSizes();
      r = sizes.r;
      baseMinRow = sizes.baseMinRow;
      nodeGap = sizes.nodeGap;

      width = graphWrap.clientWidth || width || 800;
      svg.attr("viewBox", `0 0 ${width} ${height}`);

      // update pixel height to match new viewBox height (prevents CSS scaling)
      // svg.style("height", `${height}px`);

      // recompute labelDx with new r and apply
      labelDx = r + 12;
      label.attr("transform", `translate(${labelDx}, 0)`);
      fo.attr("x", labelDx);

      // Update circle radii and adjust text sizes to match new r
      node.select("circle").attr("r", r);
      // first text (code)
      node.selectAll("text").nodes().forEach((t, idx) => {
        // idx 0 -> date/code text, idx 1 -> title text (order as appended)
        const sel = d3.select(t);
        if (idx % 2 === 0) {
          sel.style("font-size", `${Math.round(r * 0.45)}px`);
        } else {
          sel.style("font-size", `${Math.round(r * 0.36)}px`);
        }
      });

      // update foreignObject y because r changed (fo was created with r*0.1 initially)
      fo.attr("y", r * 0.1);

      // recompute label width now that svg width changed
      computeLabelWidth();

      requestAnimationFrame(() => {
        layoutNodes();
        // if labelWidth still small, try recompute once more (text measurement race)
        if (labelWidth <= 220) {
          computeLabelWidth();
          requestAnimationFrame(layoutNodes);
        }
      });
    }
    computeLabelWidth();
    requestAnimationFrame(() => {
      layoutNodes();
      if (labelWidth <= 200) {
        computeLabelWidth();
        requestAnimationFrame(layoutNodes);
      }
    });

    const onResize = () => {
      // call the in-place resize/layout routine
      doResizeLayout();
      // also update right and summary columns heights to match scroller to avoid float issues
      const baseH = scroller.clientHeight || scroller.scrollHeight;
      // graphWrap.style.height = `${baseH}px`;
      // summaryWrap.style.height = `${baseH}px`;
    };

    // wire the resize handler (remove duplicate full render)
    window.removeEventListener("resize", onResize); // safe no-op if not previously attached
    window.addEventListener("resize", onResize, { passive: true });
  }

  function openDetail(code, name, fullseries, timeseries, countryHasAnyEvents, selectedEventKey) {
    const fmtYMDdots = d3.utcFormat("%Y.%m.%d");
    const startDate = d3.min(timeseries, d => d.date);
    const endDate = d3.max(timeseries, d => d.date);
    const countryEvents = events
      .filter((d) => String(d.country).toUpperCase() === code)
      .map((d) => {
        const nImpact = Number(d.impact);
        const start = d.startDate ? fmtYMDdots(new Date(d.startDate)) : null;
        const end = d.endDate ? fmtYMDdots(new Date(d.endDate)) : null;
        const dateLabel = start && end && start !== end ? `${start} - ${end}` : start || end || "—";
        return {
          date: new Date(d.peak || d.start),
          dateLabel,
          startISO: d.startDate || null,
          endISO: d.endDate || null,
          startDate: d.startDate ? new Date(d.startDate) : null,
          endDate: d.endDate ? new Date(d.endDate) : null,
          code: "Impact",
          title: Number.isFinite(nImpact)
          ? formatImpact(nImpact).replace(/,/g, ".")
          : "—",
          who: d.reportedBy || "",
          impact: nImpact,
          impactQuartile: Math.floor(Math.random() * 4),
          description: softBreakLongTokens(d.description || "unknown", 16),
          __matchKey: d.startDate ? String(d.startDate) : (d.peak ? String(d.peak) : dateLabel)
        };
      })
      .filter((d) => {
        const s = d.startDate || d.date;
        const e = d.endDate || d.date;
        if (!s || !e) return false;
        return (!startDate || e >= startDate) && (!endDate || s <= endDate);
      })
      .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));

    deps.seriesForSelectedCountry = fullseries; 
    deps.seriesVisibleRange = timeseries;
    renderDetail(code, name, countryEvents, countryHasAnyEvents);
    gridSection.hidden = true;
    detailSection.hidden = false;
    window.scrollTo({ top: detailSection.offsetTop, behavior: "smooth" });
    
    if (selectedEventKey) {
      const nodes = Array.from(detailSection.querySelectorAll(".node"));
      let targetNode = null;

      for (const n of nodes) {
        const d = d3.select(n).datum();
        if (!d) continue;
        if (d.__matchKey && String(d.__matchKey) === String(selectedEventKey)) {
          targetNode = n;
          break;
        }
        if (d.dateLabel && d.dateLabel === selectedEventKey) {
          targetNode = n;
          break;
        }
      }

      if (targetNode) {
        const scroller = detailSection.querySelector(".events-scroller");
        if (scroller && typeof targetNode.scrollIntoView === "function") {
          targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        targetNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      } else {
        const first = detailSection.querySelector(".node");
        if (first) first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    }

  }
  return openDetail;
}

const style = document.createElement("style");
style.textContent = `
:root {
  --font-sans: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", monospace;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #444;
  --color-accent: #1e90ff;
}

/* Layout */
.detail-grid {
  display: flex;
  gap: 1.5rem;
  align-items: stretch;
  height: 82vh;
  min-height: 0;
  margin-top: 1.25rem;
  font-family: var(--font-sans);
  color: var(--color-text-primary);
}

.left-col,
.center-col,
.right-col {
  border: 1px solid #e0e0e0;
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  display: flex;
  height: 100%;
  align-self: stretch;
  flex-direction: column;
  flex: 1 1 0%;
  min-width: 0; 
  justify-content: flex-start;
}
.left-col {
  max-height: 82vh;   /* or whatever height you want */
  overflow-y: hidden; /* so only the scroller scrolls */
}

/* Column preferred widths but flexible */
.left-col { flex: 0 0 clamp(160px, 18%, 260px); }
.center-col { flex: 1 1 0%; }
.right-col { flex: 0 0 clamp(160px, 20%, 320px); max-width: 360px; }


/* === Title === */
.detail-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 1.7rem;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
  margin-bottom: 0.01rem;
}
.events-scroller {
  flex: 0 1 auto;
  overflow-y: auto;
  max-height: none;
  min-height: 0;
}

.detail-title .country-name {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 1.1rem !important;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}

.detail-title .flag {
  font-size: 1.6rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.detail-title .date-range {
  font-weight: 500;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
}

/* === Section subtitles === */
.right-title {
  font-family: var(--font-sans);
  font-size: 1rem !important;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 0.7rem;
}

.summary-title {
  font-family: var(--font-sans);
  font-size: 1rem !important;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 0.7rem;
}

.graph-wrap {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

/* keep svg responsive */
.graph-wrap svg {
  width: 100%;
  height: auto;
  max-width: 100%;
  transform-origin: top left;
  overflow: visible;
  display: block;
  margin-bottom: 0.1rem;
  box-sizing: border-box;
}

.graph-wrap text, 
.graph-wrap svg text {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  fill: var(--color-text-secondary);
}

/* === Summary === */
.summary-body {
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
  border-top: 1px solid #e6e6e6;
  padding-top: 0.5rem;
  flex-grow: 1;
}

.summary-body div {
  margin-bottom: 0.5rem;
}

.summary-body strong {
  color: var(--color-text-primary);
  font-weight: 600;
}

#bottom-desc {
  font-size: 0.9rem;
  color: #555;
  margin-top: 0.75rem;
  line-height: 1.5;
  padding-top: 0.75rem;
  font-style: italic;
}



/* === Event Nodes === */
.node text {
  font-family: var(--font-sans);
  font-weight: 500; /* was 700 — now subtler */
  letter-spacing: -0.01em;
}

.node .event-tile {
  transition: fill 140ms ease, stroke 140ms ease, transform 140ms ease;
  fill: transparent;
  stroke: transparent;
  cursor: pointer;
}

.node:hover .event-tile {
  stroke: rgba(30,144,255,0.4);
  fill: rgba(30,144,255,0.05);
}

.node.active .event-tile {
  stroke: var(--color-accent);
  fill: rgba(30,144,255,0.08);
}

/* === Responsive === */
@media (max-width: 900px) {
  .detail-grid {
    flex-direction: column;
  }
  .left-col, .right-col {
    flex: 1 1 auto;
    max-width: 100%;
  }
  .detail-title {
    font-size: 1.4rem;
  }
}

`;
document.head.appendChild(style);