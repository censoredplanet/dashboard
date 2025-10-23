// components/detail-view.js
export function createDetailOpener(deps) {
  const {
    html, d3, Plot, resize,
    DAY, PX_PADDING,
    events, formatImpact, softBreakLongTokens,
    gridSection, detailSection,
    startDate, endDate,
  } = deps;

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

    // Put the rightCard (rate over time) into the center-col's graphWrap by default
    const rightCard = html`<div class="card right-card">
      <h3 class="right-title">Rate over time</h3>
      <div class="right-body"></div>
    </div>`;
    graphWrap.append(rightCard);

    const summaryCard = html`<div class="card summary-card">
      <h3 class="summary-title">Event summary</h3>
      <div id="summary-body" class="summary-body">Select an event to see details.</div>
    </div>`;
    summaryWrap.append(summaryCard);
    let bottomDesc = document.getElementById("bottom-desc");
    if (!bottomDesc) {
      bottomDesc = html`<div id="bottom-desc" class="bottom-desc hidden"></div>`;
      summaryWrap.append(bottomDesc);
    } else {
      // ensure it's inside the summaryWrap
      summaryWrap.append(bottomDesc);
    }
    const r = window.matchMedia("(max-width: 768px)").matches ? 68 : 36;
    const margin = { top: 24, right: 10, bottom: 24, left: 20 };
    const laneX = 70;
    const width = 540;
    const baseMinRow = r * 2.2;
    const nodeGap = 12;
    const extraLastGap = 0;
    let height = 600;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const VISIBLE_ROWS = isMobile ? 2 : 5;
    const viewHeight = margin.top + margin.bottom + VISIBLE_ROWS * baseMinRow;

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

    node.append("circle").attr("r", r).attr("fill", "#fcfcfc").attr("stroke", "#444").attr("stroke-width", 1.5);
    node.append("text").attr("text-anchor", "middle").attr("dy", "-0.2em").text((d) => d.code);
    node.append("text").attr("text-anchor", "middle").attr("dy", "1.1em").attr("font-size", 12).attr("fill", "#555").attr("font-weight", 700).text((d) => d.title);

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
      // const descBox = document.getElementById("bottom-desc");
      // if (d.description && d.description.length > 0) {
      //   descBox.textContent = d.description;
      //   descBox.classList.remove("hidden");
      // } else {
      //   descBox.textContent = "";
      //   descBox.classList.add("hidden");
      // }
      const summaryBody = document.getElementById("summary-body");
      if (summaryBody) {
        summaryBody.innerHTML = `
          <div><strong>${d.dateLabel}</strong></div>
          <div style="margin-top:.5rem"><em>${d.title}</em></div>
          <div style="margin-top:.5rem">Reported by: ${d.who || "—"}</div>
          <div style="margin-top:.75rem">${(d.description && d.description.length > 0) ? d.description : "No additional explanation."}</div>
        `;
      }
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
    label.append("text").attr("font-weight", 600).attr("y", -10).text((d) => `${d.dateLabel}`);

    const fo = node.append("foreignObject").attr("x", labelDx).attr("y", 6).attr("width", 320).attr("height", 10);
    const htmlBox = fo.append("xhtml:div").attr("class", "label-html");

    const rowWho = htmlBox.append("xhtml:div").attr("class", "label-row who-row");
    rowWho.append("xhtml:span").attr("class", "label-key").text("Reported By:");
    rowWho.append("xhtml:span").attr("class", "label-value").text((d) => d.who || "—");
    rowWho.style("display", (d) => (d.who ? null : "none"));

    const rowDesc = htmlBox.append("xhtml:div").attr("class", "label-row desc-row");

    rowDesc.append("xhtml:span").attr("class", "label-key").text("Cause:");

    rowDesc.append("xhtml:span")
      .attr("class", "label-value")
      .text(d => {
        const desc = d.description || "—";
        return desc.length > 80 ? "Click to read more" : desc;
      })
      .attr("data-full", d => d.description || "")
      .style("color", d => (d.description?.length > 80 ? "#1e90ff" : null))
      .style("cursor", d => (d.description?.length > 80 ? "pointer" : null));
    // const rightCard = html`<div class="card">
    //   <h3 class="right-title">Rate over time</h3>
    //   <div class="right-body"></div>
    // </div>`;

    function renderRight(selectedEvent = null) {
      const titleEl = rightCard.querySelector(".right-title");
      const bodyEl = rightCard.querySelector(".right-body");
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
            height: (margin.top + margin.bottom + VISIBLE_ROWS * baseMinRow) + PX_PADDING + mobileExtra + 9,
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
          height: (margin.top + margin.bottom + VISIBLE_ROWS * baseMinRow) + PX_PADDING + mobileExtra,
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

      let yCursor = margin.top + r;
      node.each(function (d) {
        d.__y = yCursor;
        d3.select(this).attr("transform", `translate(${laneX}, ${d.__y})`);
        yCursor += d.__rowH + nodeGap;
      });

      const newBase = yCursor + r + margin.bottom;
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
      const newViewHeight = margin.top + margin.bottom + rows * baseMinRow;
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
    window.addEventListener("resize", onResize, { passive: true });
  }

  function openDetail(code, name, seriesForSelectedCountry) {
    const fmtYMDdots = d3.utcFormat("%Y.%m.%d");
    const startDate = d3.min(seriesForSelectedCountry, d => d.date);
    const endDate = d3.max(seriesForSelectedCountry, d => d.date);
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
          description: softBreakLongTokens(d.description || "unknown", 16),
        };
      })
      .filter((d) => {
        const s = d.startDate || d.date;
        const e = d.endDate || d.date;
        if (!s || !e) return false;
        return (!startDate || e >= startDate) && (!endDate || s <= endDate);
      })
      .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));

    deps.seriesForSelectedCountry = seriesForSelectedCountry;
    renderDetail(code, name, countryEvents, seriesForSelectedCountry);
    gridSection.hidden = true;
    detailSection.hidden = false;
    window.scrollTo({ top: detailSection.offsetTop, behavior: "smooth" });
  }

  return openDetail;
}

const style = document.createElement("style");
style.textContent = `
  .bottom-desc {
    position: sticky; /* or fixed if you prefer */
    bottom: 0;
    left: 0;
    width: 97.5%;
    background: #fff;
    border-top: 1px solid #ddd;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    color: #333;
    max-height: 8rem;
    overflow-y: auto;
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.08);
    transition: opacity 0.3s ease;
    z-index: 10;
  }
  .hidden {
    opacity: 0;
    pointer-events: none;
  }
`;
document.head.appendChild(style);