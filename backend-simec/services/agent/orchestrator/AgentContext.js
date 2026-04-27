import { getSessionKey } from '../core/sessionKeys.js';

export function criarContexto({ mensagem, usuarioId, usuarioNome, tenantId }) {
  return {
    mensagem,
    usuarioId,
    usuarioNome,
    tenantId,
    sessionKey: getSessionKey(usuarioId, tenantId),
    sessoes: {
      agendamento: null,
      relatorio: null,
      seguro: null,
    },
    interpretacao: null,
    plano: null,
    validacao: null,
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
