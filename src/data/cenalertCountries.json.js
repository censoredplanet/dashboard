const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || 'https://data.censoredplanet.org/query';

const endDate = new Date().toISOString().slice(0, 10);
const START_DATE_DEFAULT = '2018-01-01';

const query = `
  query GetCenalertCountries {
    cenalertCountries
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

process.stdout.write(JSON.stringify(data.cenalertCountries));
