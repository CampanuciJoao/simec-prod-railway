export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export function isValidThemeMode(value) {
  return value === THEME_MODES.LIGHT || value === THEME_MODES.DARK;
}