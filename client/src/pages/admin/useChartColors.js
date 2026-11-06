import { useEffect, useState } from 'react';
import { onThemeChange } from '../../theme.js';

const VARS = {
  positive: '--sentiment-positive',
  neutral: '--sentiment-neutral',
  negative: '--sentiment-negative',
  series: '--series-1',
  surface: '--surface',
  grid: '--grid',
  axis: '--text-muted',
  text: '--text',
};

function read() {
  const css = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.entries(VARS).map(([k, v]) => [k, css.getPropertyValue(v).trim()]));
}

// Recharts needs concrete colors; re-read the CSS tokens whenever the theme flips.
export function useChartColors() {
  const [colors, setColors] = useState(read);
  useEffect(() => onThemeChange(() => setColors(read())), []);
  return colors;
}
