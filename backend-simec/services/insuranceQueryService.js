// simec/backend-simec/services/insuranceQueryService.js
import prisma from './prismaService.js';

function getSeguroInclude() {
    return {
        equipamento: {
            select: {
                id: true,
                modelo: true,
                tag: true,
                tipo: true
            }
        },
        unidade: {
            select: {
                id: true,
                nomeSistema: true
            }
        },
        anexos: {
            select: {
                id: true,
                nomeOriginal: true,
                path: true,
                tipoMime: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        }
    };
}

function aplicarFiltroAlvo(where, { unidadeId = null, equipamentoId = null }) {
    if (equipamentoId) {
        where.equipamentoId = equipamentoId;
    } else if (unidadeId) {
        where.unidadeId = unidadeId;
    }

    return where;
}

export async function buscarSeguroMaisRecente({
    unidadeId = null,
    equipamentoId = null
}) {
    const where = aplicarFiltroAlvo(
        {
            status: {
                not: 'Cancelado'
            }
        },
        { unidadeId, equipamentoId }
    );

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

    const where = aplicarFiltroAlvo(
        {
            dataInicio: { lte: fimDoDia },
            dataFim: { gte: agora },
            status: {
                in: ['Ativo', 'Vigente']
            }
        },
        { unidadeId, equipamentoId }
    );

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
    const where = aplicarFiltroAlvo(
        {
            status: {
                not: 'Cancelado'
            }
        },
        { unidadeId, equipamentoId }
    );

    const and = [];

    if (dataInicio) {
        and.push({
            dataFim: {
                gte: new Date(dataInicio)
            }
        });
    }

    if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);

        and.push({
            dataInicio: {
                lte: fim
            }
        });
    }

    if (and.length > 0) {
        where.AND = and;
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