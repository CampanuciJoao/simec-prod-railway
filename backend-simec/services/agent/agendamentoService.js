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
        // 1. Recupera a memória da conversa
        let estado = await ChatRepository.buscarEstado(usuarioNome);
        const estadoAnterior = { ...estado };

        // 2. Extração via IA: O 'Parser' tenta encontrar dados técnicos na frase natural
        const extraido = await extrairCamposComIA(mensagem, estado);
        
        // Verificamos se a IA conseguiu extrair ALGO novo ou se foi apenas conversa casual
        const houveNovosDados = Object.values(extraido).some(v => v !== null && v !== undefined);
        
        // 3. Merge Inteligente: Une o que já sabíamos com o que o usuário acabou de falar
        estado = mergeEstadoSeguro(estado, extraido);

        // 4. Detecção de Mudança de Rota: 
        // Se o usuário corrigiu algo (ex: mudou a unidade), precisamos re-confirmar tudo.
        if (houveAlteracaoRelevante(estadoAnterior, estado)) {
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
        }

        // 5. Resolução de IDs: Transforma nomes de texto em registros do banco (Prisma)
        estado = await resolverEntidades(estado);

        // 6. Tratamento de Ambiguidade: Caso o banco ache dois equipamentos parecidos
        if (estado.ambiguidadeEquipamento?.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            const opcoes = estado.ambiguidadeEquipamento.map(e => `**${e.tag}**`).join(', ');
            return `Encontrei mais de um equipamento com esse nome. Qual a TAG (Nº de Série) correta? (${opcoes})`;
        }

        // 7. Fluxo de Cancelamento: Se o usuário disser "Não", "Cancela" ou "Para tudo"
        if (extraido.confirmacao === false) {
            await ChatRepository.limparEstado(usuarioNome);
            return "Entendido. Cancelei o agendamento. Como posso te ajudar com outra coisa?";
        }

        // 8. Verificação de Dados Faltantes
        const faltantes = getFaltantes(estado);
        if (faltantes.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            
            // Se o usuário falou algo mas não era o que precisávamos, damos um feedback natural
            const prefixo = (houveNovosDados) ? "Legal, anotei." : "Entendi.";
            return `${prefixo} ${proximaPergunta(estado, faltantes)}`;
        }

        // 9. Etapa de Confirmação (Resumo antes de salvar no banco)
        if (!estado.aguardandoConfirmacao) {
            estado.aguardandoConfirmacao = true;
            await ChatRepository.salvarEstado(usuarioNome, estado);
            return buildResumoConfirmacao(estado);
        }

        // 10. Persistência Final: Só grava no banco se o usuário confirmou com "Sim"
        if (estado.aguardandoConfirmacao && extraido.confirmacao === true) {
            try {
                await criarManutencaoNoBanco(estado);
                await ChatRepository.limparEstado(usuarioNome);
                return "✅ **Perfeito! Agendamento realizado.** A Ordem de Serviço foi criada e o equipamento já está marcado como 'Em Manutenção' no sistema.";
            } catch (error) {
                console.error("[AGENT_SAVE_ERROR]:", error);
                return "Tive um erro ao salvar no banco. Pode tentar confirmar novamente?";
            }
        }

        // 11. Feedback para conversa "solta" durante a confirmação
        return "Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** para agendar ou **Não** para cancelar.";
    }
};

/**
 * Função Sênior de comparação de objetos:
 * Detecta se dados fundamentais do agendamento foram trocados pelo usuário.
 */
function houveAlteracaoRelevante(antes, depois) {
    const camposCriticos = ['equipamentoId', 'data', 'horaInicio', 'tipo', 'unidadeId'];
    return camposCriticos.some(campo => 
        antes[campo] !== undefined && 
        depois[campo] !== undefined && 
        antes[campo] !== depois[campo] &&
        depois[campo] !== null
    );
}