const SVG_NS = 'http://www.w3.org/2000/svg';

const SCALE = 2;
const PAD = 24;
const LOGO_HEIGHT = 30;
const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const LIGHT_THEME = {
  '--theme-foreground': '#1b1e23',
  '--theme-background': '#ffffff',
  '--theme-background-alt': '#f5f7fa',
  '--theme-foreground-muted': '#6e7684',
  '--theme-foreground-faint': '#c4c9d0',
  '--theme-foreground-faintest': '#e6e9ee',
  '--color-text-primary': '#1a1a1a',
  '--color-text-secondary': '#444444',
  '--text': '#222222',
  '--text-light': '#555555',
  '--plot-text': '#222222',
  '--plot-line': '#222222',
  '--plot-grid': '#555555',
  '--plot-bg': 'transparent',
};

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'visibility',
  'display',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
];

function freezeStyles(clone) {
  const stage = document.createElement('div');
  stage.setAttribute(
    'style',
    'position:absolute;left:-99999px;top:0;width:2000px;',
  );
  for (const [name, value] of Object.entries(LIGHT_THEME)) {
    stage.style.setProperty(name, value);
  }
  document.body.append(stage);
  stage.append(clone);

  try {
    const nodes = [clone, ...clone.querySelectorAll('*')];
    const frozen = nodes.map((node) => {
      const computed = window.getComputedStyle(node);
      let css = '';
      for (const prop of STYLE_PROPS) {
        const value = computed.getPropertyValue(prop);
        if (value) css += `${prop}:${value};`;
      }
      return css;
    });
    nodes.forEach((node, i) => node.setAttribute('style', frozen[i]));
  } finally {
    stage.remove();
  }
}

async function inlineAsset(url) {
  const response = await fetch(url);
  const markup = await response.text();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

function textEl(content, attrs) {
  const el = svgEl('text', { 'font-family': FONT, ...attrs });
  el.textContent = content;
  return el;
}

/**
 * Renders a chart as a PNG poster and triggers a download.
 *
 * The chart is cloned from the live DOM rather than re-rendered, so whatever is
 * on screen is what gets exported — including optional layers the reader has
 * toggled off. Describe that state in `meta` so the image is self-explanatory
 * once it leaves the dashboard.
 *
 * @param {object} options
 * @param {SVGElement} options.chart live chart node to capture
 * @param {string} options.title heading printed above the chart
 * @param {Array<[string, string]>} options.meta label/value pairs for the caption
 * @param {string} options.logoUrl URL of an SVG logo, e.g. FileAttachment(…).href
 * @param {string} options.filename download name, without extension
 * @param {string} [options.background] poster background colour
 */
export async function exportChartPng({
  chart,
  title,
  meta,
  logoUrl,
  filename,
  background = '#ffffff',
}) {
  const box = chart.getBoundingClientRect();
  const chartWidth = Math.round(box.width);
  const bbox = chart.getBBox();
  const chartHeight = Math.ceil(Math.max(box.height, bbox.y + bbox.height)) + 4;

  const headerHeight = PAD + LOGO_HEIGHT + 46;
  const width = chartWidth + PAD * 2;
  const height = headerHeight + chartHeight + PAD;

  const clone = chart.cloneNode(true);
  clone.setAttribute('width', chartWidth);
  clone.setAttribute('height', chartHeight);
  freezeStyles(clone);

  const poster = svgEl('svg', {
    xmlns: SVG_NS,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  });

  poster.append(svgEl('rect', { width, height, fill: background }));

  poster.append(
    svgEl('image', {
      href: await inlineAsset(logoUrl),
      x: PAD,
      y: PAD,
      height: LOGO_HEIGHT,
      width: LOGO_HEIGHT * 6,
      preserveAspectRatio: 'xMinYMid meet',
    }),
  );

  poster.append(
    textEl(title, {
      x: PAD,
      y: PAD + LOGO_HEIGHT + 24,
      'font-size': 16,
      'font-weight': 600,
      fill: '#1a1a1a',
    }),
  );

  poster.append(
    textEl(meta.map(([label, value]) => `${label}: ${value}`).join('   ·   '), {
      x: PAD,
      y: PAD + LOGO_HEIGHT + 42,
      'font-size': 11,
      fill: '#555555',
    }),
  );

  const group = svgEl('g', { transform: `translate(${PAD}, ${headerHeight})` });
  group.append(clone);
  poster.append(group);

  poster.append(
    textEl('censoredplanet.org', {
      x: width - PAD,
      y: PAD + 20,
      'font-size': 11,
      fill: '#888888',
      'text-anchor': 'end',
    }),
  );

  const markup = new XMLSerializer().serializeToString(poster);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not rasterise the chart'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const context = canvas.getContext('2d');
  context.scale(SCALE, SCALE);
  context.drawImage(image, 0, 0);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${filename}.png`;
  link.click();
  URL.revokeObjectURL(href);
}
