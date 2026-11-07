// Colour themes: an accent colour plus a background. Every accent shade
// (tints, heatmap levels, text on buttons) is derived from one hex value.

export const ACCENTS = {
  blue: ['Blue', '#0a84ff'],
  indigo: ['Indigo', '#5e5ce6'],
  violet: ['Violet', '#8b5cf6'],
  purple: ['Purple', '#bf5af2'],
  pink: ['Pink', '#ff375f'],
  red: ['Red', '#ff453a'],
  orange: ['Orange', '#ff9f0a'],
  yellow: ['Yellow', '#ffd60a'],
  green: ['Green', '#30d158'],
  teal: ['Teal', '#40c8e0'],
};

export const BACKGROUNDS = {
  dark: {
    label: 'Dark', bg: '#0a0a0b', card: '#161618', card2: '#222225', line: '#2b2b30', sheet: '#1a1a1d',
    bar: 'rgba(18, 18, 20, 0.88)', blur: 'rgba(10, 10, 11, 0.86)', lv0: '#262629',
  },
  black: {
    label: 'Black', bg: '#000000', card: '#111113', card2: '#1c1c1f', line: '#26262a', sheet: '#141416',
    bar: 'rgba(8, 8, 9, 0.9)', blur: 'rgba(0, 0, 0, 0.86)', lv0: '#1f1f22',
  },
  midnight: {
    label: 'Midnight', bg: '#0b1020', card: '#141a2e', card2: '#1e263f', line: '#2a3350', sheet: '#171e35',
    bar: 'rgba(16, 22, 40, 0.9)', blur: 'rgba(11, 16, 32, 0.86)', lv0: '#222b45',
  },
};

export const DEFAULT_THEME = { accent: 'blue', bg: 'dark' };

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
const luminance = (h) => {
  const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function applyTheme(theme = DEFAULT_THEME) {
  const accent = (ACCENTS[theme.accent] || ACCENTS.blue)[1];
  const bg = BACKGROUNDS[theme.bg] || BACKGROUNDS.dark;
  const [r, g, b] = hexToRgb(accent);
  const vars = {
    bg: bg.bg, card: bg.card, card2: bg.card2, line: bg.line, sheet: bg.sheet, bar: bg.bar, blur: bg.blur, lv0: bg.lv0,
    accent,
    'accent-2': mix(accent, '#ffffff', 0.28),
    'accent-ink': luminance(accent) > 0.4 ? '#101012' : '#ffffff',
    'accent-soft': `rgba(${r}, ${g}, ${b}, 0.15)`,
    'accent-fill': `rgba(${r}, ${g}, ${b}, 0.3)`,
    lv1: mix(bg.bg, accent, 0.25),
    lv2: mix(bg.bg, accent, 0.45),
    lv3: mix(bg.bg, accent, 0.7),
    lv4: accent,
  };
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => root.setProperty(`--${k}`, v));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', bg.bg);
}
