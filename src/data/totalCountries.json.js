const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || "https://data.censoredplanet.org/query";
const protocolsToQuery = ["https", "http", "echo", "discard", "dns"];

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");
const endDate = `${year}-${month}-${day}`;
const startDateStr = "2018-01-01";

const query = `
  query GetCountriesByProtocol($range: DateRange!, $protocol: String!) {
    countries(range: $range, protocol: $protocol)
  }
`;
const uniqueCountries = new Set();

async function fetchCountriesForProtocol(protocolName) {
  const variables = {
    range: {
      startDate: startDateStr,
      endDate: endDate,
    },
    protocol: protocolName,
  };

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    console.error(
      `GraphQL error for protocol ${protocolName}: ${res.status} ${await res.text()}`,
    );
    return [];
  }

  const { data, errors } = await res.json();
  if (errors) {
    console.error(
      `GraphQL errors for protocol ${protocolName}: ${errors.map((e) => e.message).join("\n")}`,
    );
    return [];
  }

  if (data && data.countries) {
    data.countries.forEach((country) => uniqueCountries.add(country));
  }
}

await Promise.all(protocolsToQuery.map(fetchCountriesForProtocol));
const totalUniqueCount = uniqueCountries.size;

process.stdout.write(JSON.stringify(totalUniqueCount));
