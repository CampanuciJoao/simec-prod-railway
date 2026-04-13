// Ficheiro: services/logService.js
// Versão: Multi-tenant ready

import prisma from './prismaService.js';

/**
 * Registra um evento de auditoria no banco de dados.
 * @param {object} dadosLog
 * @param {string} dadosLog.tenantId - ID do tenant.
 * @param {string} dadosLog.usuarioId - ID do usuário que realizou a ação.
 * @param {string} dadosLog.acao - A ação realizada (ex: 'CRIAÇÃO', 'EDIÇÃO').
 * @param {string} dadosLog.entidade - A entidade afetada (ex: 'Equipamento', 'Contrato').
 * @param {string} dadosLog.entidadeId - O ID da entidade afetada.
 * @param {string} dadosLog.detalhes - A descrição do log.
 */
export async function registrarLog(dadosLog) {
  try {
    const {
      tenantId,
      usuarioId,
      acao,
      entidade,
      entidadeId,
      detalhes,
    } = dadosLog;

    if (!tenantId || !usuarioId || !acao || !entidade || !entidadeId || !detalhes) {
      console.error(
        '[LOG_SERVICE_VALIDATION_ERROR] Falha ao registrar log: dados obrigatórios faltando.',
        dadosLog
      );
      return;
    }

    await prisma.logAuditoria.create({
      data: {
        tenantId,
        acao,
        entidade,
        entidadeId,
        detalhes,
        autorId: usuarioId,
      },
    });
  } catch (error) {
    console.error('[LOG_SERVICE_ERROR] Falha ao registrar log de auditoria:', error);
  }
}