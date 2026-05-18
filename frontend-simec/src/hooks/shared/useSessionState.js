import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useState com persistência em sessionStorage (sobrevive a reload e navegação
 * interna no mesmo tab; limpa ao fechar a aba do navegador).
 *
 * Padrão usado para preservar filtros/buscas/etc. de páginas listáveis quando
 * o usuário entra em um detalhe e clica em "voltar" — a página remonta mas
 * recupera o estado anterior automaticamente.
 *
 * Uso:
 *   const [filtros, setFiltros] = useSessionState('manutencoes:filtros', { status: '' });
 *
 * @param {string} key   Identificador único na sessionStorage. Use prefixo
 *                       por módulo pra não colidir (ex.: 'osCorretiva:Ocorrencia:filtros').
 * @param {any}    defaultValue Valor inicial caso a key não exista ou seja inválida.
 * @returns {[T, (next: T | (prev: T) => T) => void]}
 */
export function useSessionState(key, defaultValue) {
  const keyRef = useRef(key);
  keyRef.current = key;

  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return defaultValue;
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // sessionStorage cheia/quotaexceeded — silencioso, o estado em memória continua válido
    }
  }, [value]);

  const setAndPersist = useCallback((next) => {
    setValue(next);
  }, []);

  return [value, setAndPersist];
}
