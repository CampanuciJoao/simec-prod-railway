import { useState, useCallback } from 'react';

export const BI_ROW_HEIGHT = 58;
export const BI_GRID_MARGIN = [12, 12];

export const DEFAULT_BI_LAYOUT = [
  { i: 'downtime',   x: 0, y: 0,  w: 6,  h: 7, minW: 3, minH: 4 },
  { i: 'frequencia', x: 6, y: 0,  w: 6,  h: 7, minW: 3, minH: 4 },
  { i: 'ranking',    x: 0, y: 7,  w: 12, h: 7, minW: 6, minH: 4 },
];

function storageKey(userId) {
  return `simec_bi_layout_${userId || 'default'}`;
}

function loadLayout(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_BI_LAYOUT;
    const saved = JSON.parse(raw);
    const ids = new Set(saved.map((l) => l.i));
    const missing = DEFAULT_BI_LAYOUT.filter((d) => !ids.has(d.i));
    return [...saved, ...missing];
  } catch {
    return DEFAULT_BI_LAYOUT;
  }
}

function saveLayout(userId, layout) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout));
  } catch {}
}

export function useBILayout(userId) {
  const [layout, setLayout] = useState(() => loadLayout(userId));

  const onLayoutChange = useCallback(
    (newLayout) => {
      setLayout(newLayout);
      saveLayout(userId, newLayout);
    },
    [userId]
  );

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_BI_LAYOUT);
    saveLayout(userId, DEFAULT_BI_LAYOUT);
  }, [userId]);

  return { layout, onLayoutChange, resetLayout };
}
