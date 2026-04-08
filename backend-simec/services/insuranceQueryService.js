// simec/backend-simec/services/insuranceQueryService.js
import prisma from './prismaService.js';

function getSeguroInclude() {
    return {
        equipamento: {
            select: {
                id: true,
                modelo: true,
                tag: true
            }
        },
        unidade: {
            select: {
                id: true,
                nomeSistema: true
            }
        },
        anexos: true
    };
}

export async function buscarSeguroMaisRecente({
    unidadeId = null,
    equipamentoId = null
}) {
    const where = {};

    if (equipamentoId) {
        where.equipamentoId = equipamentoId;
    } else if (unidadeId) {
        where.unidadeId = unidadeId;
    }

    return prisma.seguro.findFirst({
        where,
        include: getSeguroInclude(),
        orderBy: [
            { dataFim: 'desc' },
            { createdAt: 'desc' }
        ]
    });
}

export async function buscarSeguroVigente({
    unidadeId = null,
    equipamentoId = null
}) {
    const agora = new Date();
    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);

    const where = {
        dataInicio: { lte: fimDoDia },
        dataFim: { gte: agora }
    };

    if (equipamentoId) {
        where.equipamentoId = equipamentoId;
    } else if (unidadeId) {
        where.unidadeId = unidadeId;
    }

    return prisma.seguro.findFirst({
        where,
        include: getSeguroInclude(),
        orderBy: [
            { dataFim: 'asc' },
            { createdAt: 'desc' }
        ]
    });
}

export async function buscarSegurosPorPeriodo({
    unidadeId = null,
    equipamentoId = null,
    dataInicio = null,
    dataFim = null
}) {
    const where = {};

    if (equipamentoId) {
        where.equipamentoId = equipamentoId;
    } else if (unidadeId) {
        where.unidadeId = unidadeId;
    }

    if (dataInicio || dataFim) {
        const inicio = dataInicio ? new Date(dataInicio) : null;
        const fim = dataFim ? new Date(dataFim) : null;

        if (fim) {
            fim.setHours(23, 59, 59, 999);
        }

        // Retorna seguros que cruzam o período informado
        where.AND = [
            inicio ? { dataFim: { gte: inicio } } : {},
            fim ? { dataInicio: { lte: fim } } : {}
        ];
    }

    return prisma.seguro.findMany({
        where,
        include: getSeguroInclude(),
        orderBy: [
            { dataFim: 'desc' },
            { createdAt: 'desc' }
        ]
    });
}