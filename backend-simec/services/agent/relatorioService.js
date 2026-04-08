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

async function registrarSessaoRelatorio(usuarioNome, mensagem, respostaTexto, payload) {
    let sessao = await AgentSessionRepository.buscarSessaoAtiva(usuarioNome, 'RELATORIO');

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
}

export const RelatorioService = {
    async processar(mensagem, usuarioNome) {
        const filtros = extrairFiltrosRelatorio(mensagem);

        if (!filtros.tipoManutencao) {
            filtros.tipoManutencao = 'Preventiva';
        }

        let contexto = {
            unidadeTexto: filtros.unidadeTexto,
            equipamentoTexto: filtros.equipamentoTexto
        };

        contexto = await resolverEntidades(contexto);

        if (!contexto.unidadeId && !contexto.equipamentoId) {
            return "Não consegui identificar a unidade ou o equipamento da consulta. Pode informar novamente, por exemplo: 'últimas preventivas do último ano na unidade de Coxim'?";
        }

        const where = {
            tipo: filtros.tipoManutencao
        };

        if (filtros.periodoInicio || filtros.periodoFim) {
            where.dataHoraAgendamentoInicio = {};

            if (filtros.periodoInicio) {
                where.dataHoraAgendamentoInicio.gte = new Date(filtros.periodoInicio);
            }

            if (filtros.periodoFim) {
                where.dataHoraAgendamentoInicio.lte = new Date(filtros.periodoFim);
            }
        }

        if (contexto.equipamentoId) {
            where.equipamentoId = contexto.equipamentoId;
        } else if (contexto.unidadeId) {
            where.equipamento = {
                unidadeId: contexto.unidadeId
            };
        }

        const include = {
            equipamento: {
                include: {
                    unidade: true
                }
            }
        };

        // Consulta única: última
        if (filtros.somenteUltima) {
            const manutencao = await prisma.manutencao.findFirst({
                where,
                include,
                orderBy: {
                    dataHoraAgendamentoInicio: 'desc'
                }
            });

            const respostaTexto = montarResumoUltima(manutencao, filtros, {
                unidadeNome: contexto.unidadeNome,
                equipamentoNome: contexto.equipamentoNome || contexto.modelo || contexto.tipoEquipamento
            });

            const payload = construirPayloadConsultaUnica(manutencao, respostaTexto);

            await registrarSessaoRelatorio(usuarioNome, mensagem, respostaTexto, payload);

            return `${respostaTexto}${manutencao ? " Deseja que eu gere o PDF da OS ou um relatório em PDF dessa consulta?" : ""}`;
        }

        // Consulta lista
        const manutencoes = await prisma.manutencao.findMany({
            where,
            include,
            orderBy: {
                dataHoraAgendamentoInicio: 'desc'
            },
            take: 100
        });

        const respostaTexto = montarResumoLista(manutencoes, filtros, {
            unidadeNome: contexto.unidadeNome,
            equipamentoNome: contexto.equipamentoNome || contexto.modelo || contexto.tipoEquipamento
        });

        const payload = construirPayloadLista(manutencoes, filtros, respostaTexto);

        await registrarSessaoRelatorio(usuarioNome, mensagem, respostaTexto, payload);

        return `${respostaTexto}${manutencoes.length > 0 ? " Deseja que eu gere um PDF com esse relatório?" : ""}`;
    }
};