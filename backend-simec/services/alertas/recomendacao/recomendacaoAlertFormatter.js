export const JANELA_DIAS = 90;

export function montarTituloRecomendacao(unidadeNome) {
  return `Recomendação de preventiva para equipamento da unidade de ${unidadeNome}`;
}

export function montarSubtituloRecomendacao({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const partes = [];

  partes.push(`${equipamento.modelo} (${equipamento.tag || 'Sem TAG'})`);
  partes.push(`score ${metricas.scoreFinal}`);

  if (metricas.ocorrencias > 0) {
    partes.push(`${metricas.ocorrencias} ocorrência(s)`);
  }

  if (metricas.corretivas > 0) {
    partes.push(`${metricas.corretivas} corretiva(s)`);
  }

  if (metricas.maiorReincidencia >= 2) {
    partes.push(`reincidência ${metricas.maiorReincidencia}x`);
  }

  partes.push(`últimos ${JANELA_DIAS} dias`);

  return `${partes.join(' | ')} | unidade ${unidadeNome}`;
}

export function montarResumoAnalitico({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const fatores = [];

  if (metricas.ocorrencias > 0) {
    fatores.push(`${metricas.ocorrencias} ocorrência(s) recente(s)`);
  }

  if (metricas.corretivas > 0) {
    fatores.push(`${metricas.corretivas} manutenção(ões) corretiva(s)`);
  }

  if (metricas.maiorReincidencia >= 2) {
    fatores.push(
      `reincidência técnica detectada (${metricas.maiorReincidencia} registros parecidos)`
    );
  }

  if (equipamento?.status === 'Inoperante') {
    fatores.push('equipamento atualmente inoperante');
  } else if (equipamento?.status === 'EmManutencao') {
    fatores.push('equipamento já em manutenção');
  } else if (equipamento?.status === 'UsoLimitado') {
    fatores.push('equipamento com uso limitado');
  }

  const motivo =
    fatores.length > 0
      ? fatores.join(', ')
      : 'histórico recente acima do padrão esperado';

  return `Recomenda-se avaliar preventiva/preditiva para ${equipamento.modelo} (${equipamento.tag || 'Sem TAG'}) na unidade de ${unidadeNome}, pois o ativo apresentou ${motivo} nos últimos ${JANELA_DIAS} dias.`;
}

export function buildRecomendacaoAlertId(tenantId, equipamentoId, agora) {
  return `tenant-${tenantId}-recomendacao-preventiva-${equipamentoId}-${agora.getFullYear()}-${agora.getMonth() + 1}`;
}