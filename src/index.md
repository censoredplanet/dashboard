---
title: Censored Planet Dashboard
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

<style>
.info-icon {
  display: inline-block;
  margin-left: 6px;
  width: 16px;
  height: 16px;
  line-height: 16px;
  border-radius: 50%;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  background-color: #17827B;
  cursor: default;
  position: relative;
}

.info-icon::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  bottom: 125%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: pre-line;
  width: 300px;  
  text-align: left;  
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s ease, transform .2s ease;
  pointer-events: none;
  z-index: 1000;
}

.info-icon::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 115%;
  transform: translateX(-50%);
  border-width: 5px;
  border-style: solid;
  border-color: rgba(0,0,0,0.85) transparent transparent transparent;
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s ease;
}

.info-icon:hover::after,
.info-icon:hover::before,
.info-icon:focus-visible::after,
.info-icon:focus-visible::before {
  opacity: 1;
  visibility: visible;
}

h2 .info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2em;
  height: 1.2em;
  font-size: 0.65em;
  line-height: 1;
  vertical-align: middle;
  position: relative;
  top: -0.1em;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--sans-serif);
  margin: 4rem 0 2rem;
  text-wrap: balance;
  text-align: center;
}

.hero h1 {
  margin: 1rem 0;
  padding: 1rem 0;
  max-width: none;
  font-size: 14vw;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(30deg, #17827B, #A8EDE9); 
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fadeInUp 2s ease-out forwards;
}

.hero h2 {
  margin: 0;
  max-width: 34em;
  font-size: 20px;
  font-style: initial;
  font-weight: 500;
  line-height: 1.5;
  color: var(--theme-foreground-muted);
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 0.4s;
}

@media (min-width: 640px) {
  .hero h1 {
    font-size: 90px;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero .grid {
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 0.8s;
}

.explorer-link-container {
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 1.2s;
}

.chart-container {
  opacity: 0;
  margin-top: 2rem; 
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 2.0s;
}

.lists-row {
  width: min(1100px, 100%);
  margin: 0 auto;
  gap: 1rem;
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 2.4s;
}

.hero--lists .country-list {
  display: grid;
  row-gap: 8px;
}

.hero--lists .country-list > li:not(:first-child)::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in oklab, var(--theme-foreground-muted), transparent 85%);
}

@media (max-width: 768px) {
  .lists-row {
    grid-template-columns: 1fr;
  }
}

.lists-row .card {
  display: flex;
  flex-direction: column;
}

.country-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  max-height: 160px;
  overflow: auto;
}

.country-list li {
  padding: 2px 0;
  font-size: 0.95rem;
  text-align: left;
}

.lists-row {
  width: min(1100px, 100%);
  margin: 0 auto;
  gap: 1rem;
  opacity: 0;
  animation: fadeInUp 0.8s ease-out forwards;
  animation-delay: 2.4s;
}


@media (max-width: 768px) {
  .lists-row { grid-template-columns: 1fr; }
}

.grid { display: grid; gap: 1rem; }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.col-span-2 { grid-column: span 2 / span 2; }
.hero--lists .card h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--theme-foreground);
}

.hero--lists .country-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 150px;
  padding: 6px 0.75rem;
  font-size: 1.05rem;    
  font-weight: 600;
  border-radius: 8px;
  background: color-mix(in oklab, #3bcbcbff, transparent 92%);
  transition: background 0.2s ease;
}

.country-list li:hover {
  background: color-mix(in oklab, #17827B, transparent 85%);
  transform: translateY(-2px);
}

.country-list .val{
  --score: 0;
  --light: calc(var(--Lbase) - var(--score) * var(--Lspread));
  background: hsl(0 70% var(--light));
  color: #e6f3efff;
  padding: 2px 10px;
  border-radius: 999px;
  min-width: 40px;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border: 1px solid hsl(0 60% calc(var(--light) + 5%));
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}

.country-list .val.is-dark{
  color: white;
  border-color: hsl(0 70% calc(var(--light) + 5%));
}

.hero--lists .country-list .name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero--lists .country-list {
  max-height: 280px;
  overflow: auto;
}

.hero--lists {
  --Lbase: 62%;
  --Lspread: 32%;
}

.hero--lists .country-list:not(.country-list--alerts) > li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 150px;
  padding: 6px 0.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  border-radius: 8px;
  background: color-mix(in oklab, #3bcbcbff, transparent 92%);
  transition: background 0.2s ease;
}

.hero--lists .country-list.country-list--alerts > li {
  display: grid;
  grid-template-columns: 1fr 10ch auto;
  align-items: center;
  gap: 0.75rem;
  padding: 6px 0.75rem;
}

@media (max-width: 768px) {
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: 1fr !important;
  }
  .col-span-2 {
    grid-column: auto;
  }

  .hero,
  .lists-row {
    padding-left: 1rem;
    padding-right: 1rem;
    box-sizing: border-box;
  }

  .hero > .grid,
  .hero--lists > .grid {
    padding-left: 1rem;
    padding-right: 1rem;
    box-sizing: border-box;
  }

  html, body {
    overflow-x: hidden;
  }

  .hero--lists .country-list li,
  .hero--lists .country-list:not(.country-list--alerts) > li {
    gap: 0.75rem;           /* was 150px */
  }

  .hero--lists .country-list.country-list--alerts > li {
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
  }
}


</style>
