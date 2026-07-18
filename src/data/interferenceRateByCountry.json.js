const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT || 'https://data.censoredplanet.org/query';

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const endDate = `${year}-${month}-${day}`;

const startDate = new Date(today);
startDate.setDate(startDate.getDate() - 30);
const startYear = startDate.getFullYear();
const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
const startDay = String(startDate.getDate()).padStart(2, '0');
const startDateVal = `${startYear}-${startMonth}-${startDay}`;

const query = `
  query GetInterferenceRateByCountry($range: DateRange!) {
    interferenceRateByCountry(range: $range) {
      country_name: country
      unexpected_rate: unexpectedRate
    }
  }
`;

const variables = {
  range: {
    startDate: startDateVal,
    endDate: endDate,
  },
};

const res = await fetch(GRAPHQL_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables }),
});
if (!res.ok) {
  throw new Error(`GraphQL error: ${res.status} ${await res.text()}`);
}
const { data, errors } = await res.json();
if (errors) {
  throw new Error(errors.map((e) => e.message).join('\n'));
}

process.stdout.write(JSON.stringify(data.interferenceRateByCountry));
