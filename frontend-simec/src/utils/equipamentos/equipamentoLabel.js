// Helper compartilhado para exibir e agrupar equipamentos de forma
// consistente em todos os selects/combos do SIMEC (Seguro, Contrato,
// Manutencao, OsCorretiva, ControleQualidade, etc.).
//
// Padrao acordado com o cliente:
//   - Com apelido:  "Apelido (Numero de serie/tag)"
//   - Sem apelido:  "Tipo (Numero de serie/tag)"
//   - Sem tag:       cai para apenas o nome (apelido ou tipo).

export function equipamentoLabel(eq) {
  if (!eq) return '';
  const principal = (eq.apelido && eq.apelido.trim()) || eq.tipo || 'Equipamento';
  const tag = eq.tag && eq.tag.trim();
  return tag ? `${principal} (${tag})` : principal;
}

// Chave de ordenacao alinhada ao label visivel: usa apelido se houver,
// senao usa tipo. Mantem grupo (unidade) ordenado A-Z naturalmente.
export function equipamentoSortKey(eq) {
  return ((eq.apelido && eq.apelido.trim()) || eq.tipo || '').toLowerCase();
}

// Agrupa equipamentos por nome da unidade. Retorna [[unidade, [eqs...]], ...]
// ja ordenado por unidade A-Z e equipamentos por sortKey A-Z dentro de cada
// grupo. Util para usar com <optgroup> em <select>.
export function equipamentosPorUnidade(equipamentos = []) {
  const grupos = new Map();
  for (const eq of equipamentos) {
    const u = eq?.unidade?.nomeSistema || 'Sem unidade';
    if (!grupos.has(u)) grupos.set(u, []);
    grupos.get(u).push(eq);
  }
  for (const lista of grupos.values()) {
    lista.sort((a, b) => equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR'));
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
}
