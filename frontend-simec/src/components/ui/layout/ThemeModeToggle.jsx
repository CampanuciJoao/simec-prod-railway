import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/ui/primitives/Button';
import { useThemeMode } from '@/hooks/shared/useThemeMode';

function ThemeModeToggle() {
  const { isDarkMode, toggleThemeMode } = useThemeMode();

  return (
    <Button variant="secondary" onClick={toggleThemeMode}>
      <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
      {isDarkMode ? 'Modo claro' : 'Modo escuro'}
    </Button>
  );
}

export default ThemeModeToggle;