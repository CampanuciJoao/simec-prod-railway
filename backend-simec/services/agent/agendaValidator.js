// simec/backend-simec/services/agent/agendaValidator.js
import prisma from '../prismaService.js';

/**
 * Monta o intervalo de agendamento a partir do estado.
 */
function montarIntervaloAgendamento(estado) {
    if (!estado?.data || !estado?.horaInicio || !estado?.horaFim) {
        return null;
    }

    const inicio = new Date(`${estado.data}T${estado.horaInicio}:00`);
    const fim = new Date(`${estado.data}T${estado.horaFim}:00`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        return null;
    }

    return { inicio, fim };
}

/**
 * Validação local do intervalo antes da consulta ao banco.
 */
export function validarIntervaloBasico(estado) {
    const intervalo = montarIntervaloAgendamento(estado);

    if (!intervalo) {
        return {
            valido: false,
            motivo: 'INTERVALO_INVALIDO',
            mensagem: 'Não consegui validar a data e os horários informados.'
        };
    }

    const { inicio, fim } = intervalo;

    if (fim <= inicio) {
        return {
            valido: false,
            motivo: 'FIM_ANTES_DO_INICIO',
            mensagem: 'O horário de término deve ser maior que o horário de início.'
        };
    }

    return {
        valido: true,
        inicio,
        fim
    };
}

/**
 * Verifica se existe conflito de agenda para o mesmo equipamento.
 * Há conflito quando o intervalo solicitado se sobrepõe a outra manutenção ativa.
 */
export async function validarConflitoAgenda(estado) {
    if (!estado?.equipamentoId) {
        return {
            valido: false,
            motivo: 'EQUIPAMENTO_NAO_RESOLVIDO',
            mensagem: 'Não consegui validar a agenda porque o equipamento ainda não foi resolvido.'
        };
    }

    const intervalo = validarIntervaloBasico(estado);
    if (!intervalo.valido) {
        return intervalo;
    }

    const { inicio, fim } = intervalo;

    const conflito = await prisma.manutencao.findFirst({
        where: {
            equipamentoId: estado.equipamentoId,
            status: {
                in: ['Agendada', 'EmAndamento', 'Pendente', 'AguardandoConfirmacao']
            },
            AND: [
                {
                    dataHoraAgendamentoInicio: {
                        lt: fim
                    }
                },
                {
                    OR: [
                        {
                            dataHoraAgendamentoFim: {
                                gt: inicio
                            }
                        },
                        {
                            AND: [
                                { dataHoraAgendamentoFim: null },
                                { dataHoraAgendamentoInicio: { lt: fim } }
                            ]
                        }
                    ]
                }
            ]
        },
        orderBy: {
            dataHoraAgendamentoInicio: 'asc'
        },
        select: {
            id: true,
            numeroOS: true,
            tipo: true,
            status: true,
            dataHoraAgendamentoInicio: true,
            dataHoraAgendamentoFim: true
        }
    });

    if (!conflito) {
        return {
            valido: true,
            inicio,
            fim
        };
    }

    const inicioExistente = conflito.dataHoraAgendamentoInicio
        ? conflito.dataHoraAgendamentoInicio.toLocaleString('pt-BR')
        : 'sem início';

    const fimExistente = conflito.dataHoraAgendamentoFim
        ? conflito.dataHoraAgendamentoFim.toLocaleString('pt-BR')
        : 'sem fim';

    return {
        valido: false,
        motivo: 'CONFLITO_AGENDA',
        conflito,
        mensagem: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}, ${conflito.tipo}, status ${conflito.status}, de ${inicioExistente} até ${fimExistente}.`
    };
}