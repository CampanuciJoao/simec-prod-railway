// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { classificarIntencao } from './intentClassifier.js';
import { ChatRepository } from './chatRepository.js';

/**
 * Mapa de Estratégias (Habilidades do Agente)
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
};

/**
 * Maestro do Agente: Orquestra a conversa, mantendo o contexto e tratando falhas da IA.
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        // 1. RECUPERAÇÃO DE CONTEXTO
        // Verificamos se o usuário já deixou um agendamento incompleto no banco.
        const estadoAtual = await ChatRepository.buscarEstado(usuarioNome);
        const temProcessoAtivo = Object.keys(estadoAtual).length > 0;

        // 2. CLASSIFICAÇÃO DA INTENÇÃO (VIA IA)
        let intencao = await classificarIntencao(mensagem);

        // 3. REDE DE SEGURANÇA (Heurística Sênior)
        // Se a IA falhou (OUTRO) mas o usuário usou palavras claras de agendamento,
        // nós "corrigimos" a intenção manualmente no backend.
        const termosChaveAgendamento = ['agendar', 'marcar', 'manutenção', 'corretiva', 'preventiva', 'conserto', 'os', 'abrir'];
        const msgMinuscula = mensagem.toLowerCase();
        
        if (intencao === 'OUTRO' && termosChaveAgendamento.some(t => msgMinuscula.includes(t))) {
            console.log(`[ROUTER] Heurística ativada: Corrigindo intenção para AGENDAR_MANUTENCAO`);
            intencao = 'AGENDAR_MANUTENCAO';
        }

        console.log(`[AGENT_ROUTER] Usuário: ${usuarioNome} | Ativo: ${temProcessoAtivo} | Intenção: ${intencao}`);

        // 4. LÓGICA DE ROTEAMENTO (PRIORIDADES)

        // Prioridade 1: Se já existe um agendamento em curso, manda direto para o especialista.
        // Ignoramos a intenção 'OUTRO' se ele estiver no meio de um processo.
        if (temProcessoAtivo) {
            return await AgendamentoService.processar(mensagem, usuarioNome);
        }

        // Prioridade 2: Se é um novo pedido de agendamento detectado.
        if (intencao === 'AGENDAR_MANUTENCAO') {
            return await AgendamentoService.processar(mensagem, usuarioNome);
        }

        // Prioridade 3: Fallback para Saudações ou Conversas Casuais.
        // Só cai aqui se NÃO houver processo ativo e a intenção for REALMENTE 'OUTRO'.
        return "Olá! Sou o Agente Guardião do SIMEC. No momento, sou especialista em **agendar manutenções** para seus equipamentos. Como posso ser útil agora?";

    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro crítico no roteamento:`, error.message);
        return "Tive um problema técnico ao processar sua mensagem. Poderia repetir de forma mais direta?";
    }
};