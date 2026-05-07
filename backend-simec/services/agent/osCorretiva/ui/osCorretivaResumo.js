const STATUS_LABEL = {
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso Limitado',
  EmManutencao: 'Em Manutenção',
};

export function buildResumoAbrirOs(estado) {
  const status = STATUS_LABEL[estado.statusEquipamentoAbertura] || estado.statusEquipamentoAbertura;
  const equipamento = estado.equipamentoNome || estado.equipamentoTexto || 'Equipamento';
  const unidade = estado.unidadeNome ? ` (${estado.unidadeNome})` : '';

  return [
    '📋 **Confirme os dados da ocorrência:**',
    `🔧 **Equipamento:** ${equipamento}${unidade}${estado.tag ? ` — TAG ${estado.tag}` : ''}`,
    `📝 **Problema:** ${estado.descricaoProblema}`,
    `⚠️ **Status do equipamento:** ${status}`,
    `👤 **Solicitante:** ${estado.solicitante}`,
    '',
    'Confirma o registro? Responda **Sim** ou **Não**.',
  ].join('\n');
}

export function buildResumoAgendarVisita(estado) {
  const equipamento = estado.equipamentoNome || estado.equipamentoTexto || 'Equipamento';
  const unidade = estado.unidadeNome ? ` (${estado.unidadeNome})` : '';
  const data = estado.data ? formatarData(estado.data) : '—';

  return [
    '📋 **Confirme os dados da visita:**',
    `🔧 **Equipamento:** ${equipamento}${unidade}${estado.tag ? ` — TAG ${estado.tag}` : ''}`,
    `📄 **OS:** ${estado.osNumero}${estado.osDescricao ? ` — "${estado.osDescricao.slice(0, 60)}"` : ''}`,
    `🏢 **Prestador:** ${estado.prestadorNome}`,
    `📅 **Data:** ${data}`,
    `🕐 **Horário:** ${estado.horaInicio || '—'} às ${estado.horaFim || '—'}`,
    '',
    'Confirma o agendamento da visita? Responda **Sim** ou **Não**.',
  ].join('\n');
}

function formatarData(dataYMD) {
  if (!dataYMD) return '—';
  const [y, m, d] = dataYMD.split('-');
  return `${d}/${m}/${y}`;
}
