import { useEffect, useState } from 'react';

// The initial theme is applied by the inline script in index.html (before paint, no flash).
// Stored choice wins; with no stored choice we follow the OS setting live.
const KEY = 'theme';
const mq = window.matchMedia('(prefers-color-scheme: dark)');

function stored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function current() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#161b22' : '#0b5cad');
}

export function useTheme() {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    const onSystem = () => {
      if (stored()) return;
      apply(mq.matches ? 'dark' : 'light');
      setTheme(current());
    };
    mq.addEventListener('change', onSystem);
    // Keep every toggle on the page (bar + drawer) in sync.
    const stop = onThemeChange(() => setTheme(current()));
    return () => { mq.removeEventListener('change', onSystem); stop(); };
  }, []);

  const toggle = () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode: theme still applies this session */ }
    setTheme(next);
  };

  return { theme, toggle };
}

// Fires whenever the resolved theme changes (toggle or OS flip).
export function onThemeChange(cb) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
