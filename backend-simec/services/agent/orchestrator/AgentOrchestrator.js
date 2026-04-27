import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { InterpretationAgent } from '../agents/InterpretationAgent.js';
import { PlanningAgent } from '../agents/PlanningAgent.js';
import { ValidationAgent } from '../agents/ValidationAgent.js';
import { ExecutionAgent } from '../agents/ExecutionAgent.js';
import { AuditAgent } from '../agents/AuditAgent.js';
import { respostaAgente } from '../core/agentResponse.js';
import { criarContexto } from './AgentContext.js';

async function carregarSessoes(tenantId, sessionKey) {
  const [agendamento, relatorio, seguro] = await Promise.all([
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'AGENDAR_MANUTENCAO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'RELATORIO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'SEGURO'),
  ]);
  return { agendamento, relatorio, seguro };
}

export async function RoteadorAgente({ mensagem, usuarioId, usuarioNome, tenantId }) {
  try {
    const contexto = criarContexto({ mensagem, usuarioId, usuarioNome, tenantId });

    await AgentSessionRepository.expirarSessoesAntigas(tenantId, contexto.sessionKey);

    contexto.sessoes = await carregarSessoes(tenantId, contexto.sessionKey);

    await InterpretationAgent.executar(contexto);
    await PlanningAgent.executar(contexto);
    await ValidationAgent.executar(contexto);
    await ExecutionAgent.executar(contexto);
    await AuditAgent.executar(contexto);

    console.log(
      `[ORCHESTRATOR] Tenant: ${tenantId} | User: ${usuarioNome} | Intent: ${contexto.interpretacao?.intent} | Plano: ${contexto.plano?.acao}/${contexto.plano?.dominio} | Confiança: ${contexto.interpretacao?.confianca}`
    );

    return contexto.resposta || respostaAgente('Não consegui processar sua solicitação. Poderia repetir?');
  } catch (error) {
    console.error('[ORCHESTRATOR_ERROR]', error);
    return respostaAgente('Tive um problema técnico ao processar sua mensagem. Poderia repetir?');
  }
}
