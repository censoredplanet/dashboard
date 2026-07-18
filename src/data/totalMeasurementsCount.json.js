const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || 'https://data.censoredplanet.org/query';

const query = `
  query {
    totalMeasurementsCount
  }
`;

const res = await fetch(GRAPHQL_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
if (!res.ok) {
  throw new Error(`GraphQL error: ${res.status} ${await res.text()}`);
}
const { data, errors } = await res.json();
if (errors) {
  throw new Error(errors.map((e) => e.message).join('\n'));
}

process.stdout.write(JSON.stringify(data.totalMeasurementsCount));
