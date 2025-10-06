// components/utils.js
export function flagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

export const formatDMYdots = (s) => {
  if (!s) return "";
  const y = s.slice(0, 4),
    m = s.slice(5, 7),
    d = s.slice(8, 10);
  return y && m && d ? `${d}.${m}.${y}` : "";
};

export const norm = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();