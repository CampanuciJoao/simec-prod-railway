import {
  buscarSeguroMaisRecente,
  buscarSeguroVigente,
} from '../../insuranceQueryService.js';

export async function buscarSeguroMaisRecenteAdapter({
  tenantId,
  unidadeId,
  equipamentoId,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  return buscarSeguroMaisRecente({
    tenantId,
    unidadeId,
    equipamentoId,
  });
}

export async function buscarSeguroVigenteAdapter({
  tenantId,
  unidadeId,
  equipamentoId,
}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO');
  }

  return buscarSeguroVigente({
    tenantId,
    unidadeId,
    equipamentoId,
  });
}