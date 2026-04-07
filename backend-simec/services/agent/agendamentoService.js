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
import {
    STEPS,
    inicializarStep,
    determinarProximoStep,
    resetarConfirmacaoSeHouverMudanca
} from './stateMachine.js';

export const AgendamentoService = {
    async processar(mensagem, usuarioNome) {
        // 1. Carrega estado e garante step inicial
        let estado = await ChatRepository.buscarEstado(usuarioNome);
        estado = inicializarStep(estado);

        // 2. Extrai dados da mensagem
        const extraido = await extrairCamposComIA(mensagem, estado);

        // 3. Merge seguro
        estado = mergeEstadoSeguro(estado, extraido);

        // 4. Detecta se houve correção em campos de formulário
        const houveCorrecao =
            !!extraido.tipo ||
            !!extraido.unidadeTexto ||
            !!extraido.equipamentoTexto ||
            !!extraido.data ||
            !!extraido.horaInicio ||
            !!extraido.horaFim ||
            !!extraido.numeroChamado ||
            !!extraido.descricao;

        // 5. Só reseta confirmação se houve alteração real nos dados
        estado = resetarConfirmacaoSeHouverMudanca(estado, houveCorrecao);

        // 6. Se o usuário disse "não" sem corrigir nada, cancela
        if (extraido.confirmacao === false && !houveCorrecao) {
            await ChatRepository.limparEstado(usuarioNome);
            return "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?";
        }

        // 7. Resolve entidades
        estado = await resolverEntidades(estado);

        // 8. Ambiguidade de equipamento
        if (estado.ambiguidadeEquipamento?.length > 0) {
            estado.step = STEPS.COLETANDO_DADOS;
            await ChatRepository.salvarEstado(usuarioNome, estado);

            const lista = estado.ambiguidadeEquipamento
                .map(e => `**${e.modelo}** (TAG: ${e.tag}) - ${e.unidade}`)
                .join(', ');

            return `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${lista}`;
        }

        // 9. Validação de horário futuro
        const validacaoHorario = validarHorarioFuturo(estado.data, estado.horaInicio);
        if (!validacaoHorario.valido) {
            estado.horaInicio = null;
            estado.horaFim = null;
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
            estado.step = STEPS.COLETANDO_DADOS;

            await ChatRepository.salvarEstado(usuarioNome, estado);
            return validacaoHorario.msg;
        }

        // 10. Campos faltantes
        const faltantes = getFaltantes(estado);

        // 11. Conflito de agenda só quando já temos tudo preenchido
        let conflitoAgenda = null;
        if (faltantes.length === 0) {
            conflitoAgenda = await validarConflitoAgenda(estado);
        }

        // 12. Define o próximo step
        const proximoStep = determinarProximoStep({
            estado,
            faltantes,
            conflitoAgenda,
            confirmacao: extraido.confirmacao,
            houveCorrecao
        });

        estado.step = proximoStep;

        // 13. Cancelamento
        if (proximoStep === STEPS.CANCELADO) {
            await ChatRepository.limparEstado(usuarioNome);
            return "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?";
        }

        // 14. Coleta de dados
        if (proximoStep === STEPS.COLETANDO_DADOS) {
            if (conflitoAgenda && !conflitoAgenda.valido) {
                estado.aguardandoConfirmacao = false;
                estado.confirmacao = null;

                await ChatRepository.salvarEstado(usuarioNome, estado);
                return `${conflitoAgenda.mensagem} Por favor, informe outro horário.`;
            }

            await ChatRepository.salvarEstado(usuarioNome, estado);

            const houveNovosDados = Object.values(extraido).some(v => v !== null && v !== undefined);
            const prefixo = houveNovosDados ? "Legal, anotei." : "Entendi.";

            return `${prefixo} ${proximaPergunta(estado, faltantes)}`;
        }

        // 15. Aguardando confirmação
        if (proximoStep === STEPS.AGUARDANDO_CONFIRMACAO) {
            // Se o usuário acabou de confirmar, não mostrar resumo de novo
            if (extraido.confirmacao === true && estado.aguardandoConfirmacao) {
                // deixa cair para FINALIZADO na próxima etapa
            } else if (!estado.aguardandoConfirmacao) {
                estado.aguardandoConfirmacao = true;
                await ChatRepository.salvarEstado(usuarioNome, estado);
                return buildResumoConfirmacao(estado);
            } else {
                await ChatRepository.salvarEstado(usuarioNome, estado);
                return "Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.";
            }
        }

        // 16. Finalização
        if (proximoStep === STEPS.FINALIZADO) {
            try {
                const revalidacao = await validarConflitoAgenda(estado);
                if (!revalidacao.valido) {
                    estado.step = STEPS.COLETANDO_DADOS;
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

        // 17. Fallback
        await ChatRepository.salvarEstado(usuarioNome, estado);
        return "Tive dificuldade para continuar o fluxo do agendamento. Pode repetir a última informação?";
    }
};