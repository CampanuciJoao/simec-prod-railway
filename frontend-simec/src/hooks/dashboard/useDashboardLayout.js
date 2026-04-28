import { useState, useCallback } from 'react';

export const ROW_HEIGHT = 58;
export const GRID_COLS = 12;
export const GRID_MARGIN = [12, 12];

export const DEFAULT_LAYOUT = [
  { i: 'ocorrencias', x: 0,  y: 0,  w: 7, h: 6, minW: 3, minH: 3 },
  { i: 'alertas',     x: 7,  y: 0,  w: 5, h: 6, minW: 3, minH: 3 },
  { i: 'fila',        x: 0,  y: 6,  w: 7, h: 5, minW: 4, minH: 4 },
  { i: 'parque',      x: 7,  y: 6,  w: 5, h: 5, minW: 3, minH: 3 },
  { i: 'historico',   x: 0,  y: 11, w: 12, h: 5, minW: 6, minH: 3 },
];

function storageKey(userId) {
  return `simec_dashboard_layout_${userId || 'default'}`;
}

function loadLayout(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_LAYOUT;
    const saved = JSON.parse(raw);
    // Garantir que novos cards adicionados no DEFAULT não sejam perdidos
    const ids = new Set(saved.map((l) => l.i));
    const missing = DEFAULT_LAYOUT.filter((d) => !ids.has(d.i));
    return [...saved, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(userId, layout) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout));
  } catch {}
}

/**
 * Calcula quantos itens de lista um card comporta com base na sua altura (h).
 * Usa a mesma fórmula em todos os cards de lista.
 */
export function calcItemsVisible(h, itemHeightPx = 56, headerHeightPx = 90) {
  const cardHeightPx = h * ROW_HEIGHT + (h - 1) * GRID_MARGIN[1];
  const availablePx = cardHeightPx - headerHeightPx;
  return Math.max(1, Math.floor(availablePx / itemHeightPx));
}

export function useDashboardLayout(userId) {
  const [layout, setLayout] = useState(() => loadLayout(userId));

  const onLayoutChange = useCallback(
    (newLayout) => {
      setLayout(newLayout);
      saveLayout(userId, newLayout);
    },
    [userId]
  );

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    saveLayout(userId, DEFAULT_LAYOUT);
  }, [userId]);

  return { layout, onLayoutChange, resetLayout };
}
