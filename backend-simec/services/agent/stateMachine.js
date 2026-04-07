// simec/backend-simec/services/agent/agendamentoService.js
import { ChatRepository } from './chatRepository.js';
import {
    extrairCamposComIA,
    mergeEstadoSeguro,
    getFaltantes,
    proximaPergunta,
    buildResumoConfirmacao,
    validarHorarioFuturo
} from './agendamentoUtils.js';
import { resolverEntidades } from './entityResolver.js';
import { criarManutencaoNoBanco } from './dbManager.js';
import { validarConflitoAgenda } from './agendaValidator.js';

export const AgendamentoService = {
    async processar(mensagem, usuarioNome) {
        // 1. Carrega o estado atual
        let estado = await ChatRepository.buscarEstado(usuarioNome);
        const estadoAnterior = JSON.stringify(estado);

        // 2. Extrai dados da mensagem
        const extraido = await extrairCamposComIA(mensagem, estado);

        // 3. Merge seguro
        estado = mergeEstadoSeguro(estado, extraido);

        // 4. Detecta se houve correção de dados
        const houveCorrecao =
            extraido.tipo ||
            extraido.unidadeTexto ||
            extraido.equipamentoTexto ||
            extraido.data ||
            extraido.horaInicio ||
            extraido.horaFim ||
            extraido.numeroChamado ||
            extraido.descricao;

        // 5. Se houve alteração, reseta confirmação anterior
        if (estadoAnterior !== JSON.stringify(estado)) {
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
        }

        // 6. Se o usuário disse "não" sem corrigir nada, cancela
        if (extraido.confirmacao === false && !houveCorrecao) {
            await ChatRepository.limparEstado(usuarioNome);
            return "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?";
        }

        // 7. Resolve unidade e equipamento no banco
        estado = await resolverEntidades(estado);

        // 8. Trata ambiguidade de equipamento
        if (estado.ambiguidadeEquipamento?.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);

            const lista = estado.ambiguidadeEquipamento
                .map(e => `**${e.modelo}** (TAG: ${e.tag}) - ${e.unidade}`)
                .join(', ');

            return `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${lista}`;
        }

        // 9. Valida se o horário é futuro
        const validacaoHorario = validarHorarioFuturo(estado.data, estado.horaInicio);
        if (!validacaoHorario.valido) {
            estado.horaInicio = null;
            estado.horaFim = null;
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;

            await ChatRepository.salvarEstado(usuarioNome, estado);
            return validacaoHorario.msg;
        }

        // 10. Verifica campos obrigatórios faltantes
        const faltantes = getFaltantes(estado);
        if (faltantes.length > 0) {
            await ChatRepository.salvarEstado(usuarioNome, estado);

            const houveNovosDados = Object.values(extraido).some(v => v !== null && v !== undefined);
            const prefixo = houveNovosDados ? "Legal, anotei." : "Entendi.";

            return `${prefixo} ${proximaPergunta(estado, faltantes)}`;
        }

        // 11. NOVO: valida conflito de agenda antes de mostrar o resumo
        const conflitoAgenda = await validarConflitoAgenda(estado);
        if (!conflitoAgenda.valido) {
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;

            await ChatRepository.salvarEstado(usuarioNome, estado);
            return `${conflitoAgenda.mensagem} Por favor, informe outro horário.`;
        }

        // 12. Se já temos tudo, mostra resumo e pede confirmação
        if (!estado.aguardandoConfirmacao) {
            estado.aguardandoConfirmacao = true;
            await ChatRepository.salvarEstado(usuarioNome, estado);
            return buildResumoConfirmacao(estado);
        }

        // 13. Se confirmou, revalida conflito e grava
        if (estado.aguardandoConfirmacao && extraido.confirmacao === true) {
            try {
                // Revalidação para evitar corrida entre resumo e confirmação
                const revalidacao = await validarConflitoAgenda(estado);
                if (!revalidacao.valido) {
                    estado.aguardandoConfirmacao = false;
                    estado.confirmacao = null;

                    await ChatRepository.salvarEstado(usuarioNome, estado);
                    return `${revalidacao.mensagem} O horário ficou indisponível antes da confirmação. Por favor, informe outro horário.`;
                }

                await criarManutencaoNoBanco(estado);
                await ChatRepository.limparEstado(usuarioNome);

                return "✅ **Perfeito! Agendamento realizado com sucesso.** A Ordem de Serviço foi gerada e o ativo atualizado no sistema.";
            } catch (error) {
                console.error("[AGENT_DB_ERROR]:", error);
                return "Tive um erro técnico ao salvar no banco. Por favor, tente confirmar novamente ou contate o suporte.";
            }
        }

        // 14. Fallback de confirmação
        return "Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.";
    }
};