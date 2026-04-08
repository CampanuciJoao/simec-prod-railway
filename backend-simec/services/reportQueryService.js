// simec/backend-simec/services/reportQueryService.js

import prisma from './prismaService.js';

/**
 * Busca manutenções realizadas com filtros dinâmicos
 */
export async function buscarManutencoesRealizadas({
    dataInicio,
    dataFim,
    unidadeId,
    equipamentoId,
    tipoManutencao
}) {
    const whereClause = {
        status: 'Concluida'
    };

    if (dataInicio && dataFim) {
        whereClause.dataConclusao = {
            gte: new Date(dataInicio),
            lte: new Date(new Date(dataFim).setDate(new Date(dataFim).getDate() + 1) - 1)
        };
    }

    if (tipoManutencao) whereClause.tipo = tipoManutencao;
    if (equipamentoId) whereClause.equipamentoId = equipamentoId;

    if (unidadeId) {
        whereClause.equipamento = {
            unidadeId
        };
    }

    return prisma.manutencao.findMany({
        where: whereClause,
        select: {
            id: true,
            numeroOS: true,
            tipo: true,
            status: true,
            dataConclusao: true,
            dataHoraAgendamentoInicio: true,
            tecnicoResponsavel: true,
            descricaoProblemaServico: true,
            numeroChamado: true,
            equipamento: {
                select: {
                    id: true,
                    modelo: true,
                    tag: true,
                    unidade: {
                        select: { nomeSistema: true }
                    }
                }
            }
        },
        orderBy: { dataConclusao: 'desc' }
    });
}

/**
 * Busca inventário de equipamentos
 */
export async function buscarInventarioEquipamentos({
    unidadeId,
    fabricante,
    status
}) {
    const whereClause = {};

    if (unidadeId) whereClause.unidadeId = unidadeId;
    if (fabricante) whereClause.fabricante = fabricante;
    if (status) whereClause.status = status;

    return prisma.equipamento.findMany({
        where: whereClause,
        select: {
            id: true,
            modelo: true,
            tag: true,
            fabricante: true,
            registroAnvisa: true,
            status: true,
            unidade: {
                select: { nomeSistema: true }
            }
        },
        orderBy: { modelo: 'asc' }
    });
}