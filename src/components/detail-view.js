// components/detail-view.js
export function createDetailOpener(deps) {
  const {
    html, d3, Plot, resize,
    DAY, PX_PADDING,
    events, formatImpact, softBreakLongTokens,
    gridSection, detailSection,
    startDate, endDate,
  } = deps;
  function updateEventUrl(selectedEvent) {
    if (!selectedEvent) return;

    const params = new URLSearchParams(window.location.search);
    params.set("event", selectedEvent.__matchKey || selectedEvent.dateLabel || "");
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  function renderDetail(code, name, countryEvents, countryHasAnyEvents) {
    const rangeStart = d3.min(countryEvents, d => d.date);
    const rangeEnd = d3.max(countryEvents, d => d.date);
    detailSection.innerHTML = "";
    const flag = (code) =>
      code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
    const fmtYMDdots = d3.utcFormat("%Y.%m.%d");
    const dateRangeLabel =
      rangeStart && rangeEnd
        ? `${fmtYMDdots(rangeStart)} - ${fmtYMDdots(rangeEnd)}`
        : "";
    const heading = html`<h2 class="detail-title">
      <span class="flag">${flag(code)}</span>
      <span class="country-name">Events in ${name}</span>
      ${dateRangeLabel ? html`<span class="date-range">(${dateRangeLabel})</span>` : ""}
    </h2>`;
     const detailHeader = html`<div class="detail-header">${heading}</div>`;

    // Always append the header (keeps "Events in ..." visible)
    detailSection.append(detailHeader);
    if (!countryEvents.length) {
      if (!countryHasAnyEvents) {
        // Country truly has no events at all
        detailSection.append(html`<div class="empty">No events.</div>`);
      } else {
        // Country has events overall, but none matching the current filters
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
    const summaryTitle = html`<h3 class="summary-title">Event summary</h3>`;
    const summaryBody = html`<div id="summary-body" class="summary-body">Select an event to see details.</div>`;
    summaryWrap.append(summaryTitle, summaryBody);
    let bottomDesc = document.getElementById("bottom-desc");
    if (!bottomDesc) {
      bottomDesc = html`<div id="bottom-desc" class="bottom-desc hidden"></div>`;
      summaryWrap.append(bottomDesc);
    } else {
      // ensure it's inside the summaryWrap
      summaryWrap.append(bottomDesc);
    }
    const r = window.matchMedia("(max-width: 768px)").matches ? 110 : 70;
    const margin = { top: 24, right: 10, bottom: 24, left: 20 };
    const laneX = margin.left + r;
    const width = 540;
    const baseMinRow = 110;
    const nodeGap = 50;
    const extraLastGap = 0;
    let height = 600;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const VISIBLE_ROWS = isMobile ? 2 : 5;
    const viewHeight = VISIBLE_ROWS * 90;
    summaryWrap.style.height = `${viewHeight}px`;
    summaryWrap.style.overflowY = "auto";
    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMinYMin meet")
      .style("width", "100%")
      .style("height", "auto")
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

    const impactColors = ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"];
    function getContrastColor(color) {
      const rgb = d3.color(color);
      if (!rgb) return "#000";
      const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      return luminance < 140 ? "#fff" : "#000"; // lower threshold = darker color
    }
    
    node.append("circle").attr("r", r).attr("fill",  d => impactColors[d.impactQuartile ?? Math.floor(Math.random() * 4)]).attr("stroke", "#444").attr("stroke-width", 1.5);
    node.append("text").attr("text-anchor", "middle").attr("dy", "-0.25em").style("font-size", "22px").text((d) => d.code).attr("fill", d => {
    const c = impactColors[d.impactQuartile ?? 0];
    return getContrastColor(c);
  });
;
    node.append("text").attr("text-anchor", "middle").attr("dy", "1.2em").style("font-size", "20px").attr("fill", "#555").attr("font-weight", 700).text((d) => d.title).attr("fill", d => {
    const c = impactColors[d.impactQuartile ?? 0];
    return getContrastColor(c);
  });

    node.on("mouseenter", function () {
      d3.select(this).select("circle").attr("stroke", "#1e90ff").attr("stroke-width", 2);
    })
    .on("mouseleave", function () {
      if (!d3.select(this).classed("active")) {
        d3.select(this).select("circle").attr("stroke", "#444").attr("stroke-width", 1.5);
      }
    })
    .on("click", function (event, d) {
      const self = d3.select(this);
      const isActive = self.classed("active");
      g.selectAll(".node").classed("active", false).select("circle").attr("stroke", "#444").attr("stroke-width", 1.5);
      if (!isActive) self.classed("active", true).select("circle").attr("stroke", "#1e90ff").attr("stroke-width", 2.5);
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
    

    const labelDx = r + 12;
    let labelWidth = 0;

    function computeLabelWidth() {
      const el = svg.node();
      const rectW = el.getBoundingClientRect().width;
      const svgPx = rectW || el.clientWidth || width;
      labelWidth = Math.max(380, svgPx - (laneX + labelDx) - margin.right);
      g.selectAll("foreignObject").attr("width", labelWidth);
    }

    const label = node.append("g").attr("transform", `translate(${labelDx}, 0)`);
    label.append("line").attr("x1", -8).attr("x2", 0).attr("y1", 0).attr("y2", 0).attr("stroke", "#ccc");
    label.append("text").attr("font-weight", 500).attr("y", r * 0.1).text((d) => `${d.dateLabel}`).style("font-size", "24px");

    const fo = node.append("foreignObject").attr("x", labelDx).attr("y", r*0.1).attr("width", 320).attr("height", 10);
    const htmlBox = fo.append("xhtml:div").attr("class", "label-html");

    // const rowWho = htmlBox.append("xhtml:div").attr("class", "label-row who-row");
    // rowWho.append("xhtml:span").attr("class", "label-key").text("Reported By:").style("font-size", "18px");
    // rowWho.append("xhtml:span").attr("class", "label-value").text((d) => d.who || "—").style("font-size", "18px");
    // rowWho.style("display", (d) => (d.who ? null : "none"));

    // const rowDesc = htmlBox.append("xhtml:div").attr("class", "label-row desc-row");

    // rowDesc.append("xhtml:span").attr("class", "label-key").style("font-size", "18px").text("Cause:");

    // rowDesc.append("xhtml:span")
    //   .attr("class", "label-value")
    //   .text(d => {
    //     const desc = d.description || "—";
    //     return desc.length > 80 ? "Click to read more" : desc;
    //   })
    //   .attr("data-full", d => d.description || "")
    //   .style("color", d => (d.description?.length > 80 ? "#1e90ff" : null))
    //   .style("font-size", "18px")
    //   .style("cursor", d => (d.description?.length > 80 ? "pointer" : null));
      
    // const rightCard = html`<div class="card">
    //   <h3 class="right-title">Rate over time</h3>
    //   <div class="right-body"></div>
    // </div>`;

    function renderRight(selectedEvent = null) {
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
        const chart = resize((width) =>
          Plot.plot({
            height: (margin.top + margin.bottom + baseMinRow) + PX_PADDING + mobileExtra + 9,
            y: { grid: true, label: "" },
            marks: [Plot.lineY(seriesFiltered, { x: "date", y: "rate", curve: "step", tip: true })],
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
        Plot.lineY(series, { x: "date", y: "rate", curve: "step", tip: true }),
        Plot.rectY([{ s, e }], {
          x1: (d) => d.s, x2: (d) => d.e, y1: yMin, y2: yMax,
          fill: "#d33", fillOpacity: 0.15,
          title: `${selectedEvent.dateLabel}\n${selectedEvent.who || ""}\n${selectedEvent.description || ""}`,
        }),
        Plot.ruleX([s], { stroke: "#d33", strokeOpacity: 0.9, strokeWidth: 2 }),
      ];
      if (+e !== +s) marks.push(Plot.ruleX([e], { stroke: "#d33", strokeOpacity: 0.9, strokeWidth: 2 }));

      const chart = resize((width) =>
        Plot.plot({
          height: (margin.top + margin.bottom + VISIBLE_ROWS * 90) + PX_PADDING + mobileExtra,
          y: { grid: true, label: "" },
          x: { domain: [x0, x1], nice: false },
          marks,
        })
      );

      const meta = html`<div class="event-meta" style="margin-top:.5rem;"></div>`;
      bodyEl.append(chart, meta);
    }

    renderRight(countryEvents.length ? countryEvents[0] : null);
    scroller.style.height = `${viewHeight}px`;
    scroller.style.overflowY = "auto";
    scroller.append(svg.node());

    // Append the container (which already has the three columns)
    detailSection.append(detailHeader, container);
    // const bottomDesc = html`<div id="bottom-desc" class="bottom-desc hidden"></div>`;
    // detailSection.append(detailHeader, layout, bottomDesc);
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
        yCursor += d.__rowH + nodeGap;
      });

      const newBase = yCursor;
      height = newBase + extraLastGap;
      svg.attr("viewBox", `0 0 ${width} ${height}`);

      const dataWithY = node.data();
      const firstY = d3.min(dataWithY, (d) => d.__y) ?? (margin.top + r);
      const lastY = d3.max(dataWithY, (d) => d.__y) ?? (margin.top + r);

      svg.select(".lane").attr("y1", firstY - r).attr("y2", lastY + r);
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
      const nowMobile = window.matchMedia("(max-width: 768px)").matches;
      const rows = nowMobile ? 4 : 5;
      const newViewHeight = margin.top + margin.bottom + rows * 50;
      scroller.style.height = `${newViewHeight}px`;
      computeLabelWidth();
      requestAnimationFrame(() => {
        layoutNodes();
        if (labelWidth <= 200) {
          computeLabelWidth();
          requestAnimationFrame(layoutNodes);
        }
      });
    };
    function syncColumnHeights() {
    // Use the visible scroller height (already set by viewHeight)
    const baseH = scroller.clientHeight || scroller.scrollHeight;

    graphWrap.style.height = `${baseH}px`;
    summaryWrap.style.height = `${baseH}px`;
  }

  // Run once after layout
  requestAnimationFrame(syncColumnHeights);

  // Reapply on window resize (throttled)
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(syncColumnHeights, 150);
  }, { passive: true });
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
      setTimeout(() => {
        try {
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
              // center it visually
              targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            targetNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          } else {
            const first = detailSection.querySelector(".node");
            if (first) first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          }
        } catch (err) {
          console.warn("auto-select event failed", err);
        }
      }, 300);
    } else {
      setTimeout(() => {
        const first = detailSection.querySelector(".node");
        if (first) first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }, 150);
    }
  }
  return openDetail;
}

const style = document.createElement("style");
style.textContent = `
  .detail-grid {
  display: flex;
  gap: 1.5rem;
  align-items: stretch; /* ensures all columns stay equal height */
  margin-top: 1rem;
}

.left-col,
.center-col,
.right-col {
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

/* Maintain fixed column widths */
.left-col { flex: 0 0 240px; max-width: 240px; }
.center-col { flex: 1 1 auto; min-width: 400px; }
.right-col { flex: 0 0 280px; max-width: 280px; }

/* Modern typography for summary column only */
.detail-grid .summary-wrap .summary-title {
  font-size: 1.15rem !important;
  font-weight: 600 !important;
  color: #222 !important;
  margin-bottom: 0.5rem !important;
  letter-spacing: -0.01em;
}

.detail-grid .summary-body {
  font-size: 0.95rem;
  line-height: 1.55;
  color: #333;
  border-top: 1px solid #e0e0e0;
  padding-top: 0.5rem;
  flex-grow: 1; /* ensures it fills column height evenly */
}

.detail-grid .summary-body div {
  margin-bottom: 0.4rem;
}

.detail-grid .summary-body strong {
  color: #111;
  font-weight: 600;
}

#bottom-desc {
  font-size: 0.9rem;
  color: #555;
  margin-top: 0.75rem;
  line-height: 1.5;
  border-top: 1px dashed #ddd;
  padding-top: 0.75rem;
}

/* Responsive stack for narrow viewports */
@media (max-width: 900px) {
  .detail-grid {
    flex-direction: column;
  }

  .left-col,
  .right-col {
    flex: 1 1 auto;
    max-width: 100%;
  }
}

`;
document.head.appendChild(style);