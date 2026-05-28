import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { InterpretationAgent } from '../agents/InterpretationAgent.js';
import { TaskDecomposerAgent } from '../agents/TaskDecomposerAgent.js';
import { PlanningAgent } from '../agents/PlanningAgent.js';
import { ValidationAgent } from '../agents/ValidationAgent.js';
import { ExecutionAgent } from '../agents/ExecutionAgent.js';
import { AuditAgent } from '../agents/AuditAgent.js';
import { respostaAgente } from '../core/agentResponse.js';
import { criarContexto } from './AgentContext.js';
import { getCatalogoEquipamentos } from '../shared/equipamentoCatalog.js';

async function carregarSessoes(tenantId, sessionKey) {
  const [agendamento, relatorio, seguro, batch] = await Promise.all([
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'AGENDAR_MANUTENCAO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'RELATORIO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'SEGURO'),
    AgentSessionRepository.buscarSessaoAtiva(tenantId, sessionKey, 'BATCH_AGENDAMENTO'),
  ]);
  return { agendamento, relatorio, seguro, batch };
}

export async function RoteadorAgente({ mensagem, usuarioId, usuarioNome, tenantId, tenantTimezone = 'UTC' }) {
  try {
    const contexto = criarContexto({ mensagem, usuarioId, usuarioNome, tenantId, tenantTimezone });

    await AgentSessionRepository.expirarSessoesAntigas(tenantId, contexto.sessionKey);

    // Sessoes + catalogo de equipamentos em paralelo — ambos sao input
    // do InterpretationAgent (catalogo eh usado pelo LLM pra resolver
    // apelidos parciais tipo "Tomografia Evo" -> "Revolution Evo").
    const [sessoes, catalogoEquipamentos] = await Promise.all([
      carregarSessoes(tenantId, contexto.sessionKey),
      getCatalogoEquipamentos(tenantId),
    ]);
    contexto.sessoes = sessoes;
    contexto.catalogoEquipamentos = catalogoEquipamentos;

    await InterpretationAgent.executar(contexto);
    await TaskDecomposerAgent.executar(contexto);
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
