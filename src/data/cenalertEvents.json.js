const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || 'https://data.censoredplanet.org/query';

const pad = (n) => String(n).padStart(2, '0');
function fmtYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const today = new Date();
const start = new Date(today);
start.setMonth(start.getMonth() - 6);

const variables = {
  range: {
    startDate: fmtYMD(start),
    endDate: fmtYMD(today),
  },
};

const query = `
  query GetCenalertEvents($range: DateRange) {
    cenalertEvents(range: $range) {
      country
      startDate
      endDate
      peak
      impact
      cause
      reportedBy
    }
  }
`;

const res = await fetch(GRAPHQL_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables }),
});

if (!res.ok) {
  const body = await res.text();
  throw new Error(`GraphQL error: ${res.status} ${body}`);
}

const { data, errors } = await res.json();
if (Array.isArray(errors) && errors.length) {
  throw new Error(errors.map((e) => e.message).join('\n'));
}

process.stdout.write(JSON.stringify(data?.cenalertEvents ?? []));
