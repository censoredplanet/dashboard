import * as htl from 'npm:htl';

export function downloadLinks(
  data,
  dashboardName,
  baseName,
  country,
  startDate,
  endDate,
  protocol = null,
) {
  const formatDate = (dateInput) => {
    if (!dateInput) return 'date';
    const d = new Date(dateInput);

    if (isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  const clean = (str) => String(str).toLowerCase().trim().replace(/\s+/g, '-');
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  const protocolPart = protocol ? `-${String(protocol).toLowerCase()}` : '';
  const fileName = `${dashboardName}-${clean(country)}${protocolPart}-from-${startStr}-till-${endStr}-${baseName}`;

  const download = (blob, extension) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onJson = (e) => {
    e.preventDefault();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    download(blob, 'json');
  };

  return htl.html`<div style="
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
    font-size: 12px;
    text-align: right;
    font-family: var(--sans-serif);
    color: #666;
  ">
    <span>Download Data: </span>
    <a href="#" onclick=${onJson} style="color: #17827B; text-decoration: none; font-weight: bold;">JSON</a>
  </div>`;
}
