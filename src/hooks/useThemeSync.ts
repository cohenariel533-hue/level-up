import { useEffect } from 'react';
import { useSetting } from '../db/settings';

const THEME_COLORS = { dark: '#07070c', light: '#f2f2f7' } as const;

/**
 * Keeps <html data-theme> in sync with the theme setting.
 * "Auto" follows the phone's or computer's dark/light mode live.
 * The resolved theme is also mirrored to localStorage so index.html can
 * apply it before the app loads (no white flash on launch).
 */
export function useThemeSync() {
  const pref = useSetting('theme');

  useEffect(() => {
    if (!pref) return; // still loading — keep whatever index.html applied
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const resolved = pref === 'system' ? (prefersLight.matches ? 'light' : 'dark') : pref;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
      try {
        localStorage.setItem('levelup-theme', resolved);
      } catch {
        // Private mode etc. — the theme still works, it just may flash on launch.
      }
    };

    apply();
    if (pref === 'system') {
      prefersLight.addEventListener('change', apply);
      return () => prefersLight.removeEventListener('change', apply);
    }
  }, [pref]);
}
