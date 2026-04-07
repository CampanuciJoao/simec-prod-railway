// simec/backend-simec/services/agent/agendamentoService.js
import { ChatRepository } from './chatRepository.js';
import { 
    extrairCamposComIA, 
    mergeEstadoSeguro, 
    getFaltantes, 
    proximaPergunta, 
    buildResumoConfirmacao 
} from './agendamentoUtils.js';
import { resolverEntidades } from './entityResolver.js';
import { criarManutencaoNoBanco } from './dbManager.js';

export const AgendamentoService = {
    async processar(mensagem, usuarioNome) {
        // 1. Recupera o estado atual e cria uma cópia para comparação
        let estado = await ChatRepository.buscarEstado(usuarioNome);
        const snapshotAnterior = JSON.stringify(estado);

        // 2. Extração via IA (Parser) e Merge Seguro (Filtro de campos)
        const extraido = await extrairCamposComIA(mensagem, estado);
        estado = mergeEstadoSeguro(estado, extraido);

        // 3. Gerenciamento de Estado: Se o usuário alterou algum dado crítico,
        // invalidamos qualquer confirmação pendente para evitar erros de gravação.
        if (houveAlteracaoRelevante(snapshotAnterior, JSON.stringify(estado))) {
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
        }

        // 4. Resolução de Entidades: Traduz "Nomes" em "IDs" reais do Prisma
        estado = await resolverEntidades(estado);

        // 5. Tratamento de Ambiguidade: Se a busca no banco retornou + de 1 item
        if (estado.ambiguidadeEquipamento?.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            const tags = estado.ambiguidadeEquipamento.map(e => e.tag).join(', ');
            return `Encontrei mais de um equipamento com esse nome. Qual a TAG correta? (${tags})`;
        }

        // 6. Fluxo de Cancelamento: Se o usuário negar a confirmação explicitamente
        if (extraido.confirmacao === false) {
            await ChatRepository.limparEstado(usuarioNome);
            return "❌ Agendamento cancelado. Como posso te ajudar agora?";
        }

        // 7. Verificação de Pendências: Se faltam dados, gera a próxima pergunta
        const faltantes = getFaltantes(estado);
        if (faltantes.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            return proximaPergunta(estado, faltantes);
        }

        // 8. Etapa de Resumo (Pre-Confirm): Prepara os dados para o "Sim/Não" do usuário
        if (!estado.aguardandoConfirmacao) {
            estado.aguardandoConfirmacao = true;
            await ChatRepository.salvarEstado(usuarioNome, estado);
            return buildResumoConfirmacao(estado);
        }

        // 9. Finalização: Se tudo estiver preenchido e o usuário confirmou com "Sim"
        if (estado.aguardandoConfirmacao && extraido.confirmacao === true) {
            try {
                await criarManutencaoNoBanco(estado);
                await ChatRepository.limparEstado(usuarioNome);
                return "✅ **Ordem de Serviço gerada com sucesso!** Já atualizei o status do equipamento no sistema.";
            } catch (error) {
                console.error("[AGENT_DB_ERROR]:", error);
                return "Houve um erro técnico ao salvar no banco de dados. Por favor, tente novamente em instantes.";
            }
        }

        // 10. Fallback: Se o usuário responder algo aleatório durante a confirmação
        return "Por favor, responda apenas **Sim** para confirmar o agendamento acima ou **Não** para cancelar.";
    }
};

/**
 * Compara o estado antes e depois da interação. 
 * Se houver mudança nos dados técnicos, o fluxo de confirmação deve ser reiniciado.
 */
function houveAlteracaoRelevante(antesStr, depoisStr) {
    // Se as strings de estado são diferentes, houve mudança.
    // Ignoramos o campo 'confirmacao' na comparação para não entrar em loop.
    const antes = JSON.parse(antesStr);
    const depois = JSON.parse(depoisStr);
    
    return antes.equipamentoId !== depois.equipamentoId || 
           antes.data !== depois.data || 
           antes.horaInicio !== depois.horaInicio ||
           antes.tipo !== depois.tipo;
}