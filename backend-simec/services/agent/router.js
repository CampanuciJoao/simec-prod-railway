// simec/backend-simec/services/agent/router.js
import { AgendamentoService } from './agendamentoService.js';
import { classificarIntencao } from './intentClassifier.js';

/**
 * Mapa de Estratégias (Intenções)
 * Centraliza os serviços especializados do Agente.
 */
const STRATEGIES = {
    AGENDAR_MANUTENCAO: AgendamentoService,
    
    // Espaço reservado para expansão futura (Escalabilidade):
    // RELATORIO: RelatorioService,
    // BUSCAR_APOLICE: SeguroService
};

/**
 * Maestro do Agente: Identifica a intenção e delega a mensagem para o serviço correto.
 * @param {string} mensagem - Texto enviado pelo usuário.
 * @param {string} usuarioNome - Identificador do usuário para gestão de sessão.
 */
export const RoteadorAgente = async (mensagem, usuarioNome) => {
    try {
        // 1. Classificação via IA (Descobre o que o usuário quer fazer)
        const intencao = await classificarIntencao(mensagem);

        // 2. Log de monitoramento (Essencial para debug no Railway)
        console.log(`[AGENT_ROUTER] Usuário: ${usuarioNome} | Intenção detectada: ${intencao}`);

        // 3. Busca o executor correspondente no mapa de estratégias
        const executor = STRATEGIES[intencao];

        // 4. Tratamento para comandos não reconhecidos ou categoria 'OUTRO'
        if (!executor || intencao === 'OUTRO') {
            return "Olá! No momento, sou especialista em **agendar manutenções** para seus equipamentos. Como posso ajudar você com isso hoje?";
        }

        // 5. Execução: Passa a responsabilidade para o Especialista (Service)
        // O router não precisa saber "como" agendar, apenas "quem" agenda.
        return await executor.processar(mensagem, usuarioNome);

    } catch (error) {
        // Log crítico para o desenvolvedor analisar falhas de processamento
        console.error(`[AGENT_ROUTER_ERROR] Erro ao rotear pedido de ${usuarioNome}:`, error.message);

        // Resposta de fallback para o usuário não ficar sem retorno
        return "Tive um pequeno contratempo técnico ao processar sua mensagem. Poderia repetir de forma mais direta?";
    }
};