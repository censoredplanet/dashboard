// components/render-grid.js
import { fetchCenalertTimeseries } from "./queries.js";
import { flagEmoji } from "./utils.js";

export function createGridRenderer({ html, parseISO, openDetail }) {
  return async function renderGrid(grid, list, state) {
    const { tsCache, setCurrentList } = state; 

    setCurrentList(list);
    grid.innerHTML = "";

    for (const { code, name, totalEvents } of list) {
      const isSelected = code === state.selectedCode;

      const tile = html`
        <div
          class=${`tile card ${isSelected ? "selected" : ""}`}
          data-code=${code}
          data-name=${name}
          role="button"
          tabindex="0"
          onclick=${async () => {
            state.selectedCode = code;                // ← update in-place
            await renderGrid(grid, list, state); 

            if (!tsCache.has(code)) {
              const data = await fetchCenalertTimeseries({ country: code });
              const series = data
                .map((d) => ({ ...d, date: parseISO(d.date) }))
                .sort((a, b) => a.date - b.date);
              tsCache.set(code, series);
            }

            openDetail(code, name, tsCache.get(code));
          }}
          onkeydown=${(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              state.selectedCode = code;  
              renderGrid(grid, list, state);
              openDetail(code, name, tsCache.get(code) || []);
            }
          }}
        >
          <div class="tile-content">
            <div class="line-top">
              <span class="flag">${flagEmoji(code)}</span>
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
  };
}
