const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || "https://data.censoredplanet.org/query";

const today = new Date();
const endDate = today.toISOString().slice(0, 10);
const startDate = new Date(today);
startDate.setDate(startDate.getDate() - 30);
const startDateStr = startDate.toISOString().slice(0, 10);
const query = `
  query MeasurementsCountByDate($range: DateRange!) {
    measurementsCountByDate(range: $range)
  }
`;

const variables = {
  range: {
    startDate: startDateStr,
    endDate: endDate,
  },
};

const res = await fetch(GRAPHQL_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
});
if (!res.ok) {
  throw new Error(`GraphQL error: ${res.status} ${await res.text()}`);
}
const { data, errors } = await res.json();
if (errors) {
  throw new Error(errors.map((e) => e.message).join("\n"));
}

process.stdout.write(
  JSON.stringify(data.measurementsCountByDate),
);
