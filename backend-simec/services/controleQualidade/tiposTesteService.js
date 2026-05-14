// Service de gestao do catalogo de tipos de teste (admin only).

import { registrarLog } from '../logService.js';
import {
  tipoTesteCreateSchema,
  tipoTesteUpdateSchema,
} from '../../validators/controleQualidadeValidator.js';
import {
  listarTipos,
  buscarTipoPorId,
  buscarTipoPorCodigo,
  criarTipo,
  atualizarTipo,
} from './controleQualidadeRepository.js';

export async function listarTiposService({ tenantId, modalidade = null, somenteAtivos = true }) {
  const tipos = await listarTipos({ tenantId, modalidade, somenteAtivos });
  return { ok: true, data: tipos };
}

export async function criarTipoService({ tenantId, usuarioId, dados }) {
  const v = tipoTesteCreateSchema.safeParse(dados);
  if (!v.success) {
    const fieldErrors = {};
    for (const issue of v.error.issues) {
      if (issue.path?.[0]) fieldErrors[issue.path[0]] = issue.message;
    }
    return { ok: false, status: 400, message: 'Dados invalidos.', fieldErrors };
  }

  const existente = await buscarTipoPorCodigo({ tenantId, codigo: v.data.codigo });
  if (existente) {
    return {
      ok: false, status: 409,
      message: `Ja existe um tipo de teste com codigo "${v.data.codigo}".`,
    };
  }

  const tipo = await criarTipo({ tenantId, dados: v.data });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'CRIACAO',
    entidade: 'TipoTesteQualidade',
    entidadeId: tipo.id,
    detalhes: `Tipo "${tipo.codigo}" (${tipo.nome}) criado para modalidade "${tipo.modalidade}".`,
  });

  return { ok: true, status: 201, data: tipo };
}

export async function atualizarTipoService({ tenantId, usuarioId, tipoId, dados }) {
  const tipo = await buscarTipoPorId({ tenantId, tipoId });
  if (!tipo) return { ok: false, status: 404, message: 'Tipo de teste nao encontrado.' };

  const v = tipoTesteUpdateSchema.safeParse(dados);
  if (!v.success) {
    const fieldErrors = {};
    for (const issue of v.error.issues) {
      if (issue.path?.[0]) fieldErrors[issue.path[0]] = issue.message;
    }
    return { ok: false, status: 400, message: 'Dados invalidos.', fieldErrors };
  }

  // Codigo nao eh atualizavel (eh chave estavel)
  const dadosLimpos = { ...v.data };
  delete dadosLimpos.codigo;

  const atualizado = await atualizarTipo({ tenantId, tipoId, dados: dadosLimpos });

  await registrarLog({
    tenantId, usuarioId,
    acao: 'EDICAO',
    entidade: 'TipoTesteQualidade',
    entidadeId: tipoId,
    detalhes: `Tipo "${tipo.codigo}" editado.`,
  });

  return { ok: true, data: atualizado };
}
