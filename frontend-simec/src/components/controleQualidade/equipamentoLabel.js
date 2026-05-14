// Helper compartilhado para exibir um equipamento de forma consistente
// nos selects do modulo CQ (RegistrarTesteForm, ImportarLoteCqPanel).
//
// Padrao acordado:
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
