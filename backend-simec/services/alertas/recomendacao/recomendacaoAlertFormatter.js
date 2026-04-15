export const JANELA_DIAS = 90;

/**
 * 🔧 Helpers
 */
function normalizarTexto(valor, fallback = 'N/A') {
  return String(valor || fallback).trim();
}

function formatarNumero(valor) {
  return Number(valor || 0);
}

/**
 * 🟢 TÍTULO
 */
export function montarTituloRecomendacao(unidadeNome) {
  const unidade = normalizarTexto(unidadeNome);
  return `Recomendação de preventiva para equipamento da unidade de ${unidade}`;
}

/**
 * 🟡 SUBTÍTULO (compacto para UI)
 */
export function montarSubtituloRecomendacao({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const modelo = normalizarTexto(equipamento?.modelo, 'Equipamento');
  const tag = normalizarTexto(equipamento?.tag, 'Sem TAG');

  const partes = [];

  partes.push(`${modelo} (${tag})`);
  partes.push(`score ${formatarNumero(metricas.scoreFinal)}`);

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

  return `${partes.join(' • ')} • unidade ${normalizarTexto(unidadeNome)}`;
}

/**
 * 🧠 DESCRIÇÃO ANALÍTICA (ESSENCIAL PARA IA)
 */
export function montarResumoAnalitico({
  equipamento,
  unidadeNome,
  metricas,
}) {
  const modelo = normalizarTexto(equipamento?.modelo, 'Equipamento');
  const tag = normalizarTexto(equipamento?.tag, 'Sem TAG');
  const unidade = normalizarTexto(unidadeNome);

  const fatores = [];

  if (metricas.ocorrencias > 0) {
    fatores.push(`${metricas.ocorrencias} ocorrência(s) recente(s)`);
  }

  if (metricas.corretivas > 0) {
    fatores.push(`${metricas.corretivas} manutenção(ões) corretiva(s)`);
  }

  if (metricas.maiorReincidencia >= 2) {
    fatores.push(
      `reincidência técnica detectada (${metricas.maiorReincidencia} registros similares)`
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
      : 'comportamento fora do padrão esperado';

  return `Recomenda-se avaliar preventiva/preditiva para ${modelo} (${tag}) na unidade de ${unidade}, pois o ativo apresentou ${motivo} nos últimos ${JANELA_DIAS} dias.`;
}

/**
 * 🔥 ID PADRONIZADO (CONSISTENTE COM OUTROS ALERTAS)
 */
export function buildRecomendacaoAlertId(
  tenantId,
  equipamentoId,
  agora
) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');

  return `tenant-${tenantId}-recomendacao-${equipamentoId}-${ano}-${mes}`;
}