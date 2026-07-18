---
title: Censored Planet Dashboard
style: styles/index.css
---

```js
const totalMeasurementsCount = await FileAttachment(
  "data/totalMeasurementsCount.json",
).json();
const totalMeasurementsCountFormatted = new Intl.NumberFormat("de-DE").format(
  Number(totalMeasurementsCount),
);

const countsByDate = await FileAttachment(
  "data/measurementsCountByDate.json",
).json();
const countsByDateFormatted = new Intl.NumberFormat("de-DE").format(
  Number(countsByDate),
);

const data = await FileAttachment("data/interferenceRateByCountry.json").json();
const countryCount = await FileAttachment("data/totalCountries.json").json();
const eventsFetched = await FileAttachment("data/cenalertEvents.json").json();
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const events = eventsFetched
  .map((d) => ({
    country: regionNames.of(d.country),
    impact: parseFloat(d.impact),
    start: d.startDate,
    end: d.endDate,
  }))
  .sort((a, b) => new Date(b.start) - new Date(a.start));

const fmtUS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const showDate = (s) =>
  new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

function normalizeCountryList(list) {
  const vals = Array.from(list.querySelectorAll(".val"));
  const nums = vals
    .map((v) => parseFloat(v.textContent.replace(/,/g, "")))
    .filter(Number.isFinite);
  const max = Math.max(1, ...nums);

  vals.forEach((v) => {
    const n = parseFloat(v.textContent.replace(/,/g, "")) || 0;
    const s = Math.max(0, Math.min(1, n / max));
    v.style.setProperty("--score", s);

    const light = 90 - s * 60;
    v.classList.toggle("is-dark", light < 55);
    v.title = `Value: ${n} (max: ${max})`;
  });

  return list;
}

function wireCountryList(list, basePath) {
  list.querySelectorAll("li").forEach((li) => {
    const nameEl = li.querySelector(".name");
    const country = (nameEl ? nameEl.textContent : li.textContent).trim();

    li.addEventListener("click", () => {
      window.location.href = `${basePath}?country=${encodeURIComponent(country)}`;
    });

    li.setAttribute("tabindex", "0");
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        li.click();
      }
    });
  });
  return list;
}

const listInterference = (() => {
  const el = html`<ul class="country-list">
    ${data.map(
      (d) => html`
        <li>
          <span class="name">${d.country_name}</span>
          <span class="val">${fmtUS.format(+d.unexpected_rate)}</span>
        </li>
      `,
    )}
  </ul>`;

  normalizeCountryList(el);
  wireCountryList(el, "/observatory.html");
  return el;
})();

const listAlerts = (() => {
  const el = html`<ul class="country-list country-list--alerts">
    ${events.map(
      (d) => html`
        <li>
          <span class="name">${d.country}</span>
          <span class="date">${showDate(d.start)}</span>
        </li>
      `,
    )}
  </ul>`;

  wireCountryList(el, "/cenalert.html");
  return el;
})();
```

<div class="hero">
  <h1>Censored Planet Dashboard</h1>

  <div class="grid grid-cols-3">
    <div class="card">
      <h2>📏 Total Measurements</h2>
      <span class="big">${totalMeasurementsCountFormatted}</span>
    </div>
    <div class="card">
      <h2>🌐 Countries <span class="muted"></span></h2>
      <span class="big">${countryCount}</span>
    </div>
    <div class="card">
      <h2>Measurements last 30 days</h2>
      <span class="big">${countsByDateFormatted}</span>
    </div>
  </div>
  <div class="explorer-link-container">
    <a style= "color: #17827B; font-weight: bold;"; 
    href="/observatory.html">Explore Censored Planet Data
    <span style="display: inline-block; margin-left: 0.25rem; color: #17827B;">↗︎
    </span></a>
  </div>
</div>

<div class="hero hero--lists">
<div class="grid grid-cols-4">
  <div class="card col-span-2">
    <h2>
      Interference Rate Last 30 Days
      <span
        class="info-icon"
        data-tip="Interference rates use Bayesian smoothing with a prior. 
        Each country’s observed rate is blended with the global average, weighted by the average measurements per country. 
        This tempers extremes for countries with few measurements. 
        More data means less pull toward the global rate."
        role="img"
        aria-label="Info"
        tabindex="0"
      >i</span>
    </h2>
    ${listInterference}
  </div>

  <div class="card col-span-2">
    <h2>Potential Censorship Alerts Last 6 Months</h2>
    ${listAlerts}
  </div>
  </div>
</div>
