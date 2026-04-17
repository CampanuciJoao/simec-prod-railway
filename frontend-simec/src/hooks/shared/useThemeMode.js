import { useCallback, useEffect, useMemo, useState } from 'react';
import { THEME_MODES, isValidThemeMode } from '@/utils/theme/themeTokens';

const STORAGE_KEY = 'simec-theme-mode';

function getInitialThemeMode() {
  if (typeof window === 'undefined') {
    return THEME_MODES.DARK;
  }

  const savedMode = window.localStorage.getItem(STORAGE_KEY);

  if (isValidThemeMode(savedMode)) {
    return savedMode;
  }

  return THEME_MODES.DARK;
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    window.localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  const setLightMode = useCallback(() => {
    setThemeMode(THEME_MODES.LIGHT);
  }, []);

  const setDarkMode = useCallback(() => {
    setThemeMode(THEME_MODES.DARK);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) =>
      prev === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK
    );
  }, []);

  return useMemo(
    () => ({
      themeMode,
      isDarkMode: themeMode === THEME_MODES.DARK,
      isLightMode: themeMode === THEME_MODES.LIGHT,
      setLightMode,
      setDarkMode,
      toggleThemeMode,
    }),
    [themeMode, setLightMode, setDarkMode, toggleThemeMode]
  );
}

export default useThemeMode;