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
        // 1. Carrega a memória e faz snapshot para detectar mudanças
        let estado = await ChatRepository.buscarEstado(usuarioNome);
        const estadoAnterior = JSON.stringify(estado);

        // 2. Extração via IA (NLP)
        const extraido = await extrairCamposComIA(mensagem, estado);
        
        // 3. Merge de Dados: Une o que a IA acabou de ler com o que já tínhamos
        estado = mergeEstadoSeguro(estado, extraido);

        // --- 4. VALIDAÇÃO DE REGRA DE NEGÓCIO: BLOQUEIO DE PASSADO ---
        if (estado.data && estado.horaInicio) {
            const agora = new Date();
            // Criamos o objeto de data combinando o dia e a hora extraídos
            const dataAgendada = new Date(`${estado.data}T${estado.horaInicio}:00`);

            if (dataAgendada < agora) {
                // Se o horário já passou, limpamos a hora no estado para forçar correção
                estado.horaInicio = null;
                estado.horaFim = null;
                estado.aguardandoConfirmacao = false; // Reseta fluxo de resumo
                await ChatRepository.salvarEstado(usuarioNome, estado);
                
                const horaAtual = `${agora.getHours()}:${agora.getMinutes().toString().padStart(2, '0')}`;
                return `O horário das **${extraido.horaInicio || 'solicitado'}** não é válido pois já passou. Agora são **${horaAtual}**. Por favor, informe um horário futuro para hoje ou outra data.`;
            }
        }

        // 5. Detecção de Alteração: Se o usuário corrigiu algo, cancelamos confirmações antigas
        if (estadoAnterior !== JSON.stringify(estado)) {
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
        }

        // 6. Resolução de IDs: Traduz texto para registros reais do Prisma
        estado = await resolverEntidades(estado);

        // 7. Tratamento de Ambiguidade (Ex: 2 tomógrafos na mesma unidade)
        if (estado.ambiguidadeEquipamento?.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            const listaTags = estado.ambiguidadeEquipamento.map(e => `**${e.tag}**`).join(', ');
            return `Encontrei mais de um equipamento com esse nome. Qual a TAG correta? (${listaTags})`;
        }

        // 8. Fluxo de Cancelamento
        if (extraido.confirmacao === false) {
            await ChatRepository.limparEstado(usuarioNome);
            return "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?";
        }

        // 9. Verificação de Dados Faltantes
        const faltantes = getFaltantes(estado);
        if (faltantes.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);
            // Se a IA não extraiu nada novo (ex: o usuário só disse "Oi"), usamos um tom neutro
            const houveNovosDados = Object.values(extraido).some(v => v !== null && v !== undefined);
            const prefixo = houveNovosDados ? "Legal, anotei." : "Entendi.";
            return `${prefixo} ${proximaPergunta(estado, faltantes)}`;
        }

        // 10. Etapa de Resumo (Pre-Confirmação)
        if (!estado.aguardandoConfirmacao) {
            estado.aguardandoConfirmacao = true;
            await ChatRepository.salvarEstado(usuarioNome, estado);
            return buildResumoConfirmacao(estado);
        }

        // 11. Finalização: Gravação atômica no Banco de Dados
        if (estado.aguardandoConfirmacao && extraido.confirmacao === true) {
            try {
                await criarManutencaoNoBanco(estado);
                await ChatRepository.limparEstado(usuarioNome);
                return "✅ **Perfeito! Agendamento realizado com sucesso.** A Ordem de Serviço foi gerada e o ativo atualizado no sistema.";
            } catch (error) {
                console.error("[AGENT_DB_ERROR]:", error);
                return "Tive um erro técnico ao salvar no banco. Por favor, tente confirmar novamente ou contate o suporte.";
            }
        }

        // 12. Fallback de Diálogo: Mantém o usuário no trilho do agendamento
        return "Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.";
    }
};