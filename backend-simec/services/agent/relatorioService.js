// simec/backend-simec/services/agent/relatorioService.js
import prisma from '../prismaService.js';
import { AgentSessionRepository } from './agentSessionRepository.js';
import { resolverEntidades } from './entityResolver.js';
import {
    extrairFiltrosRelatorio,
    montarResumoUltima,
    montarResumoLista,
    construirPayloadConsultaUnica,
    construirPayloadLista
} from './relatorioUtils.js';
import { ACTIONS } from './actionResolver.js';
import { buscarManutencoesRealizadas } from '../reportQueryService.js';

async function registrarSessaoRelatorio(
    usuarioNome,
    mensagem,
    respostaTexto,
    payload,
    sessaoExistente = null
) {
    let sessao = sessaoExistente;

    if (!sessao) {
        sessao = await AgentSessionRepository.criarSessao({
            usuario: usuarioNome,
            intent: 'RELATORIO',
            step: 'FINALIZADO',
            state: payload
        });
    } else {
        await AgentSessionRepository.salvarSessao(sessao.id, {
            step: 'FINALIZADO',
            state: payload,
            resumo: respostaTexto
        });
    }

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);
    await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', respostaTexto, payload);

    return sessao;
}

async function buscarUltimaManutencao({
    tipoManutencao,
    unidadeId,
    equipamentoId
}) {
    const where = {
        tipo: tipoManutencao
    };

    if (equipamentoId) {
        where.equipamentoId = equipamentoId;
    } else if (unidadeId) {
        where.equipamento = {
            unidadeId
        };
    }

    return prisma.manutencao.findFirst({
        where,
        include: {
            equipamento: {
                include: {
                    unidade: true
                }
            }
        },
        orderBy: {
            dataHoraAgendamentoInicio: 'desc'
        }
    });
}

export const RelatorioService = {
    async processar(mensagem, usuarioNome, sessaoExistente = null, acaoContextual = null) {
        // 1. Follow-up de ação contextual
        if (acaoContextual?.matched) {
            const estadoAnterior = acaoContextual.state || {};
            let respostaPayload = null;

            if (acaoContextual.action === ACTIONS.GERAR_PDF_OS) {
                respostaPayload = {
                    mensagem: `Perfeito. Vou preparar o PDF da OS ${estadoAnterior.numeroOS || ''}.`,
                    acao: 'GERAR_PDF_OS',
                    contexto: {
                        manutencaoId: acaoContextual.context.manutencaoId
                    }
                };
            } else if (acaoContextual.action === ACTIONS.GERAR_PDF_RELATORIO) {
                respostaPayload = {
                    mensagem: `Perfeito. Vou preparar o PDF do relatório com ${estadoAnterior.total || 0} registros.`,
                    acao: 'GERAR_PDF_RELATORIO',
                    contexto: {
                        ids: acaoContextual.context.ids
                    }
                };
            } else if (acaoContextual.action === ACTIONS.ABRIR_OS) {
                respostaPayload = {
                    mensagem: `Perfeito. Vou abrir os detalhes da OS ${estadoAnterior.numeroOS || ''}.`,
                    acao: 'ABRIR_OS',
                    contexto: {
                        manutencaoId: acaoContextual.context.manutencaoId
                    }
                };
            } else {
                respostaPayload = {
                    mensagem: 'Entendi a ação sobre a consulta anterior, mas ainda não tenho um tratador específico para ela.'
                };
            }

            await registrarSessaoRelatorio(
                usuarioNome,
                mensagem,
                respostaPayload.mensagem,
                {
                    ...estadoAnterior,
                    ultimaAcaoExecutada: acaoContextual.action
                },
                sessaoExistente
            );

            return respostaPayload;
        }

        // 2. Extrai filtros da pergunta
        const filtros = extrairFiltrosRelatorio(mensagem);

        if (!filtros.tipoManutencao) {
            filtros.tipoManutencao = 'Preventiva';
        }

        // 3. Resolve unidade/equipamento
        let contexto = {
            unidadeTexto: filtros.unidadeTexto,
            equipamentoTexto: filtros.equipamentoTexto
        };

        contexto = await resolverEntidades(contexto);

        if (!contexto.unidadeId && !contexto.equipamentoId) {
            return {
                mensagem: "Não consegui identificar a unidade ou o equipamento da consulta. Pode informar novamente, por exemplo: 'últimas preventivas do último ano na unidade de Coxim'?"
            };
        }

        // 4. Consulta única: última manutenção
        if (filtros.somenteUltima) {
            const manutencao = await buscarUltimaManutencao({
                tipoManutencao: filtros.tipoManutencao,
                unidadeId: contexto.unidadeId || null,
                equipamentoId: contexto.equipamentoId || null
            });

            const respostaTexto = montarResumoUltima(manutencao, filtros, {
                unidadeNome: contexto.unidadeNome,
                equipamentoNome: contexto.equipamentoNome || contexto.modelo || contexto.tipoEquipamento
            });

            const payload = construirPayloadConsultaUnica(manutencao, respostaTexto);

            await registrarSessaoRelatorio(
                usuarioNome,
                mensagem,
                respostaTexto,
                payload,
                sessaoExistente
            );

            return {
                mensagem: `${respostaTexto}${manutencao ? " Deseja que eu gere o PDF da OS ou um relatório em PDF dessa consulta?" : ""}`,
                meta: payload
            };
        }

        // 5. Consulta em lista
        const manutencoes = await buscarManutencoesRealizadas({
            dataInicio: filtros.periodoInicio
                ? new Date(filtros.periodoInicio).toISOString().slice(0, 10)
                : null,
            dataFim: filtros.periodoFim
                ? new Date(filtros.periodoFim).toISOString().slice(0, 10)
                : null,
            unidadeId: contexto.unidadeId || null,
            equipamentoId: contexto.equipamentoId || null,
            tipoManutencao: filtros.tipoManutencao
        });

        const respostaTexto = montarResumoLista(manutencoes, filtros, {
            unidadeNome: contexto.unidadeNome,
            equipamentoNome: contexto.equipamentoNome || contexto.modelo || contexto.tipoEquipamento
        });

        const payload = construirPayloadLista(manutencoes, filtros, respostaTexto);

        await registrarSessaoRelatorio(
            usuarioNome,
            mensagem,
            respostaTexto,
            payload,
            sessaoExistente
        );

        return {
            mensagem: `${respostaTexto}${manutencoes.length > 0 ? " Deseja que eu gere um PDF com esse relatório?" : ""}`,
            meta: payload
        };
    }
};