import { AgentSessionRepository } from '../session/agentSessionRepository.js';

export const AuditAgent = {
  nome: 'AuditAgent',
  capacidades: ['registrar_raciocinio', 'persistir_trilha'],

  async executar(contexto) {
    const { mensagem, plano, interpretacao, validacao, trilha } = contexto;
    const sessao = plano?.sessao_alvo || null;

    if (!sessao?.id) return;

    try {
      await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem, {
        trilha_agentes: trilha,
        intent_detectado: interpretacao?.intent,
        confianca: interpretacao?.confianca,
        metodo_classificacao: interpretacao?.metodo,
        urgencia: interpretacao?.entidades?.urgencia,
        entidades: interpretacao?.entidades,
        plano_acao: plano?.acao,
        plano_dominio: plano?.dominio,
        validacao_aprovada: validacao?.aprovado,
        avisos: validacao?.avisos,
      });
    } catch (err) {
      console.warn('[AUDIT_AGENT] Falha ao registrar auditoria:', err.message);
    }
  },
};
