import { adicionarAuditoria } from '../orchestrator/AgentContext.js';

export const ValidationAgent = {
  nome: 'ValidationAgent',
  capacidades: ['validar_permissao', 'validar_plano', 'detectar_acao_insegura'],

  async executar(contexto) {
    const { plano, tenantId, usuarioId, interpretacao } = contexto;
    const bloqueios = [];
    const avisos = [];

    if (!tenantId || !usuarioId) {
      bloqueios.push('Contexto de usuário ou tenant inválido');
    }

    if (!plano) {
      bloqueios.push('Plano de execução ausente');
    }

    if (plano?.acao === 'NOVA_SESSAO' && !plano.dominio) {
      bloqueios.push('Nova sessão requisitada sem domínio definido');
    }

    if (interpretacao?.entidades?.urgencia === 'Alta') {
      avisos.push('Solicitação de urgência Alta — priorize o atendimento');
    }

    const resultado = {
      aprovado: bloqueios.length === 0,
      bloqueios,
      avisos,
      raciocinio: bloqueios.length > 0
        ? `Bloqueado: ${bloqueios.join('; ')}`
        : 'Validação aprovada',
    };

    contexto.validacao = resultado;
    adicionarAuditoria(contexto, { agente: 'ValidationAgent', ...resultado });

    if (!resultado.aprovado) {
      console.warn('[VALIDATION_AGENT] Bloqueado:', bloqueios);
    }

    if (avisos.length > 0) {
      console.log('[VALIDATION_AGENT] Avisos:', avisos);
    }

    return resultado;
  },
};
