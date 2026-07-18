# Censored Planet Dashboard

An [Observable Framework](https://observablehq.com/framework/) app for exploring
Censored Planet internet censorship measurements.
It reads from the public [Censored Planet GraphQL API](https://data.censoredplanet.org/) and builds to a static site.

The app has three pages:

**Home** (`/`) — total measurements, countries covered, and measurements in the
last 30 days, plus two ranked lists: interference rate over the last 30 days, and
potential censorship alerts over the last 6 months. Rows are clickable and
deep-link into the other two pages, filtered to that country.

**Observatory** (`/observatory`) — measurement explorer. Filter by source,
country, domains and date range, then read the results as a table, an outcome
timeline, an outcome-per-network breakdown and a measurement summary.

**CenAlert** (`/cenalert`) — censorship alert events for a single country. A VPN
search-volume time series with event highlights, alongside a detail view pairing
an event timeline with per-event impact and context.

## Getting started

Requires Node 18 or newer.

```sh
npm install
npm run dev
```

Then open <http://localhost:3000>.

Data loaders hit the public API at `https://data.censoredplanet.org/query`.

Note that the endpoint is only configurable for build-time loaders. The
interactive queries in `src/components/queries.js`, which run in the browser as
you change filters, currently hard-code the public endpoint.

## Data

Everything in `src/data` ending in `.json.js` is a
[data loader](https://observablehq.com/framework/data-loaders): a Node script
that Framework runs at build time and whose stdout becomes a static file the
pages import. Each one posts a GraphQL query and prints JSON.

| Loader                              | Query                                                            | Range              |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------ |
| `totalMeasurementsCount.json.js`    | `totalMeasurementsCount`                                         | 2018-01-01 → today |
| `totalCountries.json.js`            | `countries`, once per protocol (https, http, echo, discard, dns) | 2018-01-01 → today |
| `countries.json.js`                 | `interferenceRateByCountry` (names only)                         | 2018-01-01 → today |
| `interferenceRateByCountry.json.js` | `interferenceRateByCountry` with rates                           | last 30 days       |
| `measurementsCountByDate.json.js`   | `measurementsCountByDate`                                        | last 30 days       |
| `cenalertCountries.json.js`         | `cenalertCountries`                                              | all time           |
| `cenalertEvents.json.js`            | `cenalertEvents`                                                 | last 6 months      |

Loader output is cached in `src/.observablehq/cache`. Because several loaders
compute their range relative to _today_, a stale cache will quietly serve old
windows — run `npm run clean` to force a refetch.

`src/data/domains.csv` is a static list used by the observatory domain picker.

## Project structure

```ini
.
├─ src
│  ├─ components            # importable JS modules, shared across pages
│  │  ├─ queries.js         # browser-side GraphQL calls
│  │  ├─ detail-view.js     # cenalert event timeline + impact panel
│  │  ├─ time-series-chart.js
│  │  ├─ stacked-bar-chart.js
│  │  ├─ hierarchical-bar-chart.js
│  │  ├─ sunburst-chart.js
│  │  ├─ domain-selector.js # Slim Select multi-select
│  │  ├─ table.js
│  │  ├─ aggregators.js
│  │  ├─ data-download.js   # "Download Data: JSON" footer
│  │  └─ utils.js
│  ├─ data                  # data loaders and static data
│  ├─ styles
│  │  ├─ components         # stylesheets shared by two or more pages
│  │  │  ├─ info-icon.css
│  │  │  └─ download-links.css
│  │  ├─ base.css           # app-wide: framework imports + design tokens
│  │  ├─ index.css          # one stylesheet per page, named after the page
│  │  ├─ observatory.css
│  │  └─ cenalert.css
│  ├─ index.md              # the home page
│  ├─ observatory.md
│  └─ cenalert.md
├─ observablehq.config.js   # app config: title, sidebar pages, style
├─ eslint.config.js
├─ .prettierrc.json
└─ package.json
```

`src` is the source root. Framework uses
[file-based routing](https://observablehq.com/framework/project-structure#routing),
so `src/observatory.md` is served at `/observatory`.

## Styling

`base.css` is the app-wide stylesheet, wired up through the `style` option in
`observablehq.config.js`. It imports the framework defaults and the built-in
themes, and defines the design tokens — but deliberately contains no rules that
paint anything.

Each page has its own stylesheet named in its front matter:

```yaml
---
title: CenAlert Dashboard
style: styles/cenalert.css
---
```

A page-level stylesheet **replaces** the app-wide one rather than adding to it,
so every page stylesheet starts by importing `base.css`. Rules used by more than
one page live in `src/styles/components` and are imported by the pages that need
them, which keeps each page's bundle free of CSS it never uses.

Two conventions worth keeping:

- **No `<style>` blocks in Markdown, and no stylesheets injected from JavaScript.**
  Put the rules in the relevant stylesheet so Framework can bundle, minify, hash
  and preload them. Only genuinely dynamic values — a width computed from data, a
  font size derived from a radius — belong inline.
- **Overrides of Observable Inputs need `!important`.** Framework appends
  `observablehq:stdlib/inputs.css` _after_ the page stylesheet, so where the two
  declare the same property at equal specificity the framework wins on source
  order. Several rules in `cenalert.css` are marked accordingly, with comments.

One trap specific to this app: `htl` wraps an interpolated template in a `<span>`
when that template produces more than one node, which multi-line templates always
do. In `src/index.md` the country-list rows come out as
`ul.country-list > span > li`, so a `> li` child combinator matches nothing. Use
descendant combinators for rows built that way.

## Code style

ESLint checks correctness — unused variables and imports, import ordering, plus
the Google style guide. Prettier owns formatting exclusively;
`eslint-config-prettier` is spread last in `eslint.config.js` to switch off every
ESLint rule that would otherwise argue with it.

```sh
npm run format      # rewrite files
npm run lint        # report problems
```

Both scripts are scoped by the globs in `package.json`. If you widen them beyond
`src/components`, note that `src/data` and `src/styles` were written with
double quotes while the components use single quotes, so expect a one-time
reformat.

Prettier is pinned to 3.8.1 in the lockfile; 3.9.x formats some template literals
differently, so install from the lockfile rather than letting `^3.8.1` float.

## Deploying
 
This app is served from a **static host**, not from Observable. `npm run deploy`
exists because it ships with the Framework template, but it publishes to
Observable and is not the path used here — ignore it.
 
The actual workflow is build and upload:
 
```sh
npm run build          # writes ./dist
# then copy ./dist to the web root of the static host
```
 
`dist` is entirely self-contained: pre-rendered HTML, hashed CSS and JS bundles,
and the JSON that the data loaders produced at build time. No Node runtime is
needed on the server, and there is nothing to configure beyond serving files.
 
Because the data is baked in at build time, the site is only as fresh as its last
build — rebuild and re-upload to refresh it. Run `npm run clean` first, since
several loaders derive their date range from _today_ and a warm cache will
otherwise reuse an older window.

## Command reference

| Command                | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `npm install`          | Install or reinstall dependencies                     |
| `npm run dev`          | Start the local preview server on port 3000           |
| `npm run build`        | Build the static site into `./dist`                   |
| `npm run deploy`       | Deploy to Observable                                  |
| `npm run clean`        | Clear the data loader cache in `src/.observablehq`    |
| `npm run observable`   | Run the Framework CLI, e.g. `npm run observable help` |
| `npm run lint`         | Report ESLint problems                                |
| `npm run lint:fix`     | Auto-fix what ESLint can                              |
| `npm run format`       | Rewrite files with Prettier                           |
| `npm run format:check` | Report formatting deviations                          |