import prisma from '../prismaService.js';

/**
 * Registra uso de tokens LLM no log de auditoria.
 * Falha silenciosamente para nunca bloquear a chamada principal.
 */
export async function logLlmUsage({ tenantId, feature, provider, model, promptTokens, completionTokens }) {
  try {
    const total = (promptTokens || 0) + (completionTokens || 0);

    await prisma.logAuditoria.create({
      data: {
        tenantId: tenantId || 'system',
        acao: 'LLM_USAGE',
        entidade: 'LlmCall',
        entidadeId: feature || 'unknown',
        detalhes: JSON.stringify({ provider, model, promptTokens, completionTokens, total }),
        autorId: null,
      },
    });
  } catch {
    // silencioso — uso de tokens nunca deve bloquear operação
  }
}
