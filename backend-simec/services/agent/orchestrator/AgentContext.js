import { getSessionKey } from '../core/sessionKeys.js';

export function criarContexto({ mensagem, usuarioId, usuarioNome, tenantId, tenantTimezone = 'UTC' }) {
  return {
    mensagem,
    usuarioId,
    usuarioNome,
    tenantId,
    tenantTimezone,
    sessionKey: getSessionKey(usuarioId, tenantId),
    sessoes: {
      agendamento: null,
      relatorio: null,
      seguro: null,
      batch: null,
    },
    // Catalogo compacto de equipamentos do tenant (modelo|tipo|tag|unidade),
    // carregado pelo Orchestrator e usado pelo LLM na interpretacao.
    catalogoEquipamentos: [],
    interpretacao: null,
    plano: null,
    validacao: null,
    subtarefas: null,
    trilha: [],
    resposta: null,
  };
}

export function adicionarAuditoria(contexto, entrada) {
  contexto.trilha.push({
    ts: new Date().toISOString(),
    ...entrada,
  });
}
