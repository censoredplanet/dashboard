const ENDPOINT = "https://data.censoredplanet.org/query";

async function gqlRequest({ query, variables }) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  }
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map(e => e.message).join("\n"));
  return data;
}

export async function fetchCenalertEvents({ country, range } = {}) {
  const query = `
    query Events($country: String, $range: DateRange) {
      cenalertEvents(country: $country, range: $range) {
        country
        startDate
        endDate
        peak
        impact
        description: cause
        reportedBy
      }
    }
  `;
  const data = await gqlRequest({
    query,
    variables: {
      country: country ?? null,   // optional per schema
      range: range ?? null,       // { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
    },
  });
  return data?.cenalertEvents ?? [];
}

export async function fetchCenalertTimeseries({ country, range } = {}) {
  if (!country) {
    throw new Error("fetchCenalertTimeseries: 'country' is required (String!).");
  }

  const query = `
    query Timeseries($country: String!, $range: DateRange) {
      cenalertTimeseries(country: $country, range: $range) {
        country
        rate: value
        date
      }
    }
  `;
  const data = await gqlRequest({
    query,
    variables: {
      country,
      range: range ?? null
    },
  });
  return data?.cenalertTimeseries ?? [];
}

export async function fetchDashboard(country, source, startDate, endDate, domains) {
  const query = `
    query GetDashboard($filter: FilterDashboard!) {
      dashboard(filter: $filter) {
        domain
        category
        network
        subnetwork: subNetwork
        date
        outcome
        probe_count: count  
        unexpected_count: unexpectedCount
      }
    }
  `;

  const filter = {
    country,
    source,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    domains,
  };

  const variables = { filter };
  const data = await gqlRequest({ query, variables });
  return data.dashboard;
}

