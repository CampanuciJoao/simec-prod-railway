// simec/backend-simec/services/agent/agendamentoService.js
import { AgentSessionRepository } from './agentSessionRepository.js';
import { UserAgentMemoryRepository } from './userAgentMemoryRepository.js';
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
    async processar(mensagem, usuarioNome, sessaoExistente = null) {
        // 1. Recupera ou cria sessão ativa
        let sessao = sessaoExistente;

        if (!sessao) {
            sessao = await AgentSessionRepository.criarSessao({
                usuario: usuarioNome,
                intent: 'AGENDAR_MANUTENCAO',
                step: 'START',
                state: {}
            });
        }

        // 2. Recupera estado da sessão
        let estado = JSON.parse(sessao.stateJson || '{}');
        estado = inicializarStep(estado);

        // 3. Registra mensagem do usuário
        await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);

        // 4. Extrai dados da mensagem
        const extraido = await extrairCamposComIA(mensagem, estado);

        // 5. Merge seguro
        estado = mergeEstadoSeguro(estado, extraido);

        // 6. Detecta correção em campos reais
        const houveCorrecao =
            !!extraido.tipo ||
            !!extraido.unidadeTexto ||
            !!extraido.equipamentoTexto ||
            !!extraido.data ||
            !!extraido.horaInicio ||
            !!extraido.horaFim ||
            !!extraido.numeroChamado ||
            !!extraido.descricao;

        // 7. Reseta confirmação se houve correção
        estado = resetarConfirmacaoSeHouverMudanca(estado, houveCorrecao);

        // 8. Cancelamento explícito sem correção
        if (extraido.confirmacao === false && !houveCorrecao) {
            estado.step = STEPS.CANCELADO;

            await AgentSessionRepository.salvarSessao(sessao.id, {
                step: estado.step,
                state: estado,
                resumo: null
            });

            await AgentSessionRepository.registrarMensagem(
                sessao.id,
                'agent',
                "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?",
                { step: estado.step, acao: 'CANCELAMENTO' }
            );

            await AgentSessionRepository.cancelarSessao(sessao.id);

            return "Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?";
        }

        // 9. Resolve entidades
        estado = await resolverEntidades(estado);

        // 10. Ambiguidade de equipamento
        if (estado.ambiguidadeEquipamento?.length > 0) {
            estado.step = STEPS.COLETANDO_DADOS;

            const resposta = `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${estado.ambiguidadeEquipamento
                .map(e => `**${e.modelo}** (TAG: ${e.tag}) - ${e.unidade}`)
                .join(', ')}`;

            await AgentSessionRepository.salvarSessao(sessao.id, {
                step: estado.step,
                state: estado,
                resumo: null
            });

            await AgentSessionRepository.registrarMensagem(
                sessao.id,
                'agent',
                resposta,
                { step: estado.step, tipo: 'AMBIGUIDADE_EQUIPAMENTO' }
            );

            return resposta;
        }

        // 11. Horário no passado
        const validacaoHorario = validarHorarioFuturo(estado.data, estado.horaInicio);
        if (!validacaoHorario.valido) {
            estado.horaInicio = null;
            estado.horaFim = null;
            estado.aguardandoConfirmacao = false;
            estado.confirmacao = null;
            estado.step = STEPS.COLETANDO_DADOS;

            await AgentSessionRepository.salvarSessao(sessao.id, {
                step: estado.step,
                state: estado,
                resumo: null
            });

            await AgentSessionRepository.registrarMensagem(
                sessao.id,
                'agent',
                validacaoHorario.msg,
                { step: estado.step, tipo: 'HORARIO_INVALIDO' }
            );

            return validacaoHorario.msg;
        }

        // 12. Campos faltantes
        const faltantes = getFaltantes(estado);

        // 13. Conflito de agenda só quando tudo está preenchido
        let conflitoAgenda = null;
        if (faltantes.length === 0) {
            conflitoAgenda = await validarConflitoAgenda(estado);
        }

        // 14. State machine decide próximo passo
        const proximoStep = determinarProximoStep({
            estado,
            faltantes,
            conflitoAgenda,
            confirmacao: extraido.confirmacao,
            houveCorrecao
        });

        estado.step = proximoStep;

        // 15. Se continuar coletando
        if (proximoStep === STEPS.COLETANDO_DADOS) {
            let resposta;

            if (conflitoAgenda && !conflitoAgenda.valido) {
                estado.aguardandoConfirmacao = false;
                estado.confirmacao = null;
                resposta = `${conflitoAgenda.mensagem} Por favor, informe outro horário.`;
            } else {
                const houveNovosDados = Object.values(extraido).some(v => v !== null && v !== undefined);
                const prefixo = houveNovosDados ? "Legal, anotei." : "Entendi.";
                resposta = `${prefixo} ${proximaPergunta(estado, faltantes)}`;
            }

            await AgentSessionRepository.salvarSessao(sessao.id, {
                step: estado.step,
                state: estado,
                resumo: null
            });

            await AgentSessionRepository.registrarMensagem(
                sessao.id,
                'agent',
                resposta,
                { step: estado.step, faltantes }
            );

            return resposta;
        }

        // 16. Aguardando confirmação
        if (proximoStep === STEPS.AGUARDANDO_CONFIRMACAO) {
            let resposta;

            if (!estado.aguardandoConfirmacao) {
                estado.aguardandoConfirmacao = true;
                resposta = buildResumoConfirmacao(estado);
            } else {
                resposta = "Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.";
            }

            await AgentSessionRepository.salvarSessao(sessao.id, {
                step: estado.step,
                state: estado,
                resumo: resposta
            });

            await AgentSessionRepository.registrarMensagem(
                sessao.id,
                'agent',
                resposta,
                { step: estado.step, aguardandoConfirmacao: true }
            );

            return resposta;
        }

        // 17. Finalização
        if (proximoStep === STEPS.FINALIZADO) {
            try {
                const revalidacao = await validarConflitoAgenda(estado);

                if (!revalidacao.valido) {
                    estado.step = STEPS.COLETANDO_DADOS;
                    estado.aguardandoConfirmacao = false;
                    estado.confirmacao = null;

                    const resposta = `${revalidacao.mensagem} O horário ficou indisponível antes da confirmação. Por favor, informe outro horário.`;

                    await AgentSessionRepository.salvarSessao(sessao.id, {
                        step: estado.step,
                        state: estado,
                        resumo: null
                    });

                    await AgentSessionRepository.registrarMensagem(
                        sessao.id,
                        'agent',
                        resposta,
                        { step: estado.step, tipo: 'REVALIDACAO_CONFLITO' }
                    );

                    return resposta;
                }

                const manutencao = await criarManutencaoNoBanco(estado);

                // Atualiza memória leve do usuário
                await UserAgentMemoryRepository.upsertMemoria(usuarioNome, {
                    ultimaUnidadeId: estado.unidadeId || null,
                    ultimaUnidadeNome: estado.unidadeNome || null,
                    ultimoEquipamentoId: estado.equipamentoId || null,
                    ultimoEquipamentoTag: estado.tag || null,
                    ultimoEquipamentoModelo: estado.equipamentoNome || estado.modelo || null
                });

                const resposta = "✅ **Perfeito! Agendamento realizado com sucesso.** A Ordem de Serviço foi gerada e o ativo atualizado no sistema.";

                await AgentSessionRepository.salvarSessao(sessao.id, {
                    step: STEPS.FINALIZADO,
                    state: {
                        ...estado,
                        manutencaoId: manutencao.id,
                        numeroOS: manutencao.numeroOS
                    },
                    resumo: resposta
                });

                await AgentSessionRepository.registrarMensagem(
                    sessao.id,
                    'agent',
                    resposta,
                    {
                        step: STEPS.FINALIZADO,
                        manutencaoId: manutencao.id,
                        numeroOS: manutencao.numeroOS
                    }
                );

                await AgentSessionRepository.finalizarSessao(sessao.id);

                return resposta;
            } catch (error) {
                console.error("[AGENT_DB_ERROR]:", error);

                const resposta = "Tive um erro técnico ao salvar no banco. Por favor, tente confirmar novamente ou contate o suporte.";

                await AgentSessionRepository.registrarMensagem(
                    sessao.id,
                    'agent',
                    resposta,
                    { step: estado.step, tipo: 'ERRO_BANCO' }
                );

                return resposta;
            }
        }

        // 18. Fallback absoluto
        const fallback = "Tive dificuldade para continuar o fluxo do agendamento. Pode repetir a última informação?";

        await AgentSessionRepository.salvarSessao(sessao.id, {
            step: estado.step,
            state: estado,
            resumo: fallback
        });

        await AgentSessionRepository.registrarMensagem(
            sessao.id,
            'agent',
            fallback,
            { step: estado.step, tipo: 'FALLBACK' }
        );

        return fallback;
    }
};