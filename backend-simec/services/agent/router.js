// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { classificarIntencao } from './intentClassifier.js';
import { ChatRepository } from './chatRepository.js'; // Importação essencial para verificar o estado

/**
 * Mapa de Estratégias (Intenções)
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
};

/**
 * Maestro do Agente: Inteligente o suficiente para manter o contexto da conversa.
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        // 1. RECUPERAÇÃO DE CONTEXTO (O segredo da conversa natural)
        // Verificamos se o usuário já tem um processo (como agendamento) em aberto no banco.
        const estadoAtual = await ChatRepository.buscarEstado(usuarioNome);
        const temProcessoAtivo = Object.keys(estadoAtual).length > 0;

        // 2. Classificação da intenção da nova mensagem
        const intencao = await classificarIntencao(mensagem);

        console.log(`[AGENT_ROUTER] Usuário: ${usuarioNome} | Ativo: ${temProcessoAtivo} | Intenção: ${intencao}`);

        // 3. LÓGICA DE CONTINUIDADE SÊNIOR
        // Se já existe um agendamento em curso, ignoramos o 'OUTRO' e mandamos para o especialista.
        // Isso permite que o usuário diga "Oi", "Sim", "Muda o horário" sem cair no loop da saudação.
        if (temProcessoAtivo && (intencao === 'AGENDAR_MANUTENCAO' || intencao === 'OUTRO')) {
            return await AgendamentoService.processar(mensagem, usuarioNome);
        }

        // 4. LÓGICA DE NOVA INTENÇÃO (Início de conversa)
        const executor = STRATEGIES[intencao];

        // Só exibe a saudação inicial se NÃO houver processo ativo e a intenção for vaga.
        if (!executor || intencao === 'OUTRO') {
            return "Olá! Sou o Agente Guardião do SIMEC. No momento, sou especialista em **agendar manutenções** para seus equipamentos. Como posso ser útil agora?";
        }

        // 5. Execução de nova estratégia
        return await executor.processar(mensagem, usuarioNome);

    } catch (error) {
        console.error(`[AGENT_ROUTER_ERROR] Erro ao rotear pedido de ${usuarioNome}:`, error.message);
        return "Tive um pequeno contratempo técnico. Poderia repetir sua solicitação de outra forma?";
    }
};