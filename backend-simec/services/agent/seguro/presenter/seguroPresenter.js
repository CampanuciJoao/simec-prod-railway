import { formatarDataTenant } from '../../../shared/dateFormatter.js';

function formatarMoedaBR(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarDataBR(data, timezone = 'UTC') {
  return formatarDataTenant(data, timezone);
}

export function montarResumoSeguro(seguro, contexto) {
  if (!seguro) {
    return 'Não encontrei um seguro correspondente com os filtros informados.';
  }

  const timezone = contexto?.tenantTimezone || 'UTC';

  const alvo = seguro.equipamento
    ? `equipamento ${seguro.equipamento.modelo} (TAG ${seguro.equipamento.tag || 'N/A'})`
    : seguro.unidade
      ? `unidade ${seguro.unidade.nomeSistema}`
      : 'objeto segurado';

  const statusTexto = seguro.status ? ` Status atual: ${seguro.status}.` : '';

  return `Encontrei a apólice ${seguro.apoliceNumero} da seguradora ${seguro.seguradora}, vinculada ao ${alvo}. A vigência vai de ${formatarDataBR(seguro.dataInicio, timezone)} até ${formatarDataBR(seguro.dataFim, timezone)}.${statusTexto}`;
}

export function montarMensagemCoberturas(payload) {
  const coberturasEstruturadas = Array.isArray(payload?.coberturasDetalhadas)
    ? payload.coberturasDetalhadas
    : [];

  if (coberturasEstruturadas.length > 0) {
    const linhas = coberturasEstruturadas.map((item) => {
      if (typeof item === 'string') return item;
      return `${item.nome}: ${formatarMoedaBR(item.valor)}`;
    });

    return `As coberturas cadastradas para a apólice ${payload.numeroApolice} são:\n- ${linhas.join('\n- ')}`;
  }

  if (payload?.cobertura) {
    return `A descrição de cobertura cadastrada para a apólice ${payload.numeroApolice} é: ${payload.cobertura}`;
  }

  return `Encontrei a apólice ${payload?.numeroApolice || ''}, mas não há coberturas cadastradas com valor no sistema.`;
}
