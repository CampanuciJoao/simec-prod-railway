import { TIPO_SEGURO_OPTIONS } from '@/utils/seguros';

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function getNomeUnidade(seguro) {
  if (typeof seguro?.unidade === 'string') return seguro.unidade;
  if (seguro?.unidade?.nomeSistema) return seguro.unidade.nomeSistema;
  if (seguro?.unidade?.nome) return seguro.unidade.nome;
  if (seguro?.equipamento?.unidade?.nomeSistema) {
    return seguro.equipamento.unidade.nomeSistema;
  }
  return 'Não vinculado';
}

export function getAlvoSeguro(seguro) {
  if (seguro?.equipamento?.modelo || seguro?.equipamento?.tag) {
    return {
      label: 'Equipamento',
      value: [seguro.equipamento?.modelo, seguro.equipamento?.tag]
        .filter(Boolean)
        .join(' - '),
    };
  }

  if (seguro?.veiculo?.placa || seguro?.veiculo?.modelo) {
    return {
      label: 'Veiculo',
      value: [seguro.veiculo?.placa, seguro.veiculo?.modelo]
        .filter(Boolean)
        .join(' - '),
    };
  }

  const unidade = getNomeUnidade(seguro);

  return {
    label: unidade === 'Não vinculado' ? 'Vinculo' : 'Unidade',
    value: unidade,
  };
}

export function getTipoVinculo(seguro) {
  if (seguro?.veiculoId || seguro?.veiculo?.id) return 'Veiculo';
  if (seguro?.equipamentoId || seguro?.equipamento?.id) return 'Equipamento';
  if (seguro?.unidadeId || seguro?.unidade?.id) return 'Unidade';
  return 'Geral';
}

export function getTipoSeguroLabel(tipoSeguro) {
  const option = TIPO_SEGURO_OPTIONS.find((item) => item.value === tipoSeguro);
  return option?.label || tipoSeguro || 'Não informado';
}
