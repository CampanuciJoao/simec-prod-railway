// simec/backend-simec/services/agent/agendaValidator.js
import prisma from '../../prismaService.js';
import {
  criarDateUTC,
  isDataValida,
} from '../../timeService.js';

/**
 * Monta o intervalo de agendamento a partir do estado.
 */
function montarIntervaloAgendamento(estado) {
  if (!estado?.data || !estado?.horaInicio || !estado?.horaFim) {
    return null;
  }

  const inicio = criarDateUTC(estado.data, estado.horaInicio);
  const fim = criarDateUTC(estado.data, estado.horaFim);

  if (!isDataValida(inicio) || !isDataValida(fim)) {
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
      mensagem: 'Não consegui validar a data e os horários informados.',
    };
  }

  const { inicio, fim } = intervalo;

  if (fim <= inicio) {
    return {
      valido: false,
      motivo: 'FIM_ANTES_DO_INICIO',
      mensagem: 'O horário de término deve ser maior que o horário de início.',
    };
  }

  return {
    valido: true,
    inicio,
    fim,
  };
}

/**
 * Verifica se existe conflito de agenda para o mesmo equipamento
 * dentro do tenant informado.
 * Há conflito quando o intervalo solicitado se sobrepõe
 * a outra manutenção ativa.
 */
export async function validarConflitoAgenda(estado, tenantId) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO_PARA_VALIDAR_CONFLITO_AGENDA');
  }

  if (!estado?.equipamentoId) {
    return {
      valido: false,
      motivo: 'EQUIPAMENTO_NAO_RESOLVIDO',
      mensagem:
        'Não consegui validar a agenda porque o equipamento ainda não foi resolvido.',
    };
  }

  const intervalo = validarIntervaloBasico(estado);
  if (!intervalo.valido) {
    return intervalo;
  }

  const { inicio, fim } = intervalo;

  const conflito = await prisma.manutencao.findFirst({
    where: {
      tenantId,
      equipamentoId: estado.equipamentoId,
      status: {
        in: ['Agendada', 'EmAndamento', 'Pendente', 'AguardandoConfirmacao'],
      },
      AND: [
        {
          dataHoraAgendamentoInicio: {
            lt: fim,
          },
        },
        {
          OR: [
            {
              dataHoraAgendamentoFim: {
                gt: inicio,
              },
            },
            {
              AND: [
                { dataHoraAgendamentoFim: null },
                { dataHoraAgendamentoInicio: { lt: fim } },
              ],
            },
          ],
        },
      ],
    },
    orderBy: {
      dataHoraAgendamentoInicio: 'asc',
    },
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      dataHoraAgendamentoInicio: true,
      dataHoraAgendamentoFim: true,
    },
  });

  if (!conflito) {
    return {
      valido: true,
      inicio,
      fim,
    };
  }

  const inicioExistente = conflito.dataHoraAgendamentoInicio
    ? conflito.dataHoraAgendamentoInicio.toISOString()
    : 'sem início';

  const fimExistente = conflito.dataHoraAgendamentoFim
    ? conflito.dataHoraAgendamentoFim.toISOString()
    : 'sem fim';

  return {
    valido: false,
    motivo: 'CONFLITO_AGENDA',
    conflito,
    mensagem: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}, ${conflito.tipo}, status ${conflito.status}, de ${inicioExistente} até ${fimExistente}.`,
  };
}