// Ficheiro: backend-simec/services/agent/workflow/agendaValidator.js
// Versão: profissional, timezone-aware, alinhada ao núcleo temporal oficial

import {
  buildUtcIntervalFromLocal,
  resolveOperationalTimezone,
  validateSchedulingWindow,
  MANUTENCAO_STATUSS_CONFLITANTES,
  FAR_FUTURE_UTC_DATE,
} from '../../time/index.js';
import prismaClient from '../../prismaService.js';

/**
 * Resolve o timezone operacional para o contexto da manutenção.
 * Prioridade:
 * 1. unidade.timezone
 * 2. tenant.timezone
 * 3. fallback do sistema
 */
function resolverTimezoneOperacional(tenant, unidade = null) {
  return resolveOperationalTimezone({
    tenantTimezone: tenant?.timezone,
    unidadeTimezone: unidade?.timezone,
  });
}

/**
 * Monta intervalo UTC a partir da intenção local.
 * Entrada esperada em estado:
 * - data
 * - horaInicio
 * - horaFim
 */
export function montarIntervaloAgendamento(estado, tenant, unidade = null) {
  const dateLocal = estado?.data;
  const startTimeLocal = estado?.horaInicio;
  const endTimeLocal = estado?.horaFim || null;

  if (!dateLocal || !startTimeLocal) {
    return null;
  }

  const timezone = resolverTimezoneOperacional(tenant, unidade);

  const { startUtc, endUtc } = buildUtcIntervalFromLocal({
    dateLocal,
    startTimeLocal,
    endTimeLocal,
    timezone,
  });

  if (!startUtc) {
    return null;
  }

  return {
    inicio: startUtc,
    fim: endUtc,
    timezone,
    dataLocal: dateLocal,
    horaInicioLocal: startTimeLocal,
    horaFimLocal: endTimeLocal,
  };
}

/**
 * Validação básica do intervalo de agendamento.
 */
export function validarIntervaloBasico(estado, tenant, unidade = null) {
  const dateLocal = estado?.data;
  const startTimeLocal = estado?.horaInicio;
  const endTimeLocal = estado?.horaFim || null;

  const timezone = resolverTimezoneOperacional(tenant, unidade);

  const validation = validateSchedulingWindow({
    dateLocal,
    startTimeLocal,
    endTimeLocal,
    timezone,
  });

  if (!validation.valid) {
    return {
      valido: false,
      motivo: validation.code,
      mensagem: validation.message || 'Data ou horário inválido.',
    };
  }

  return {
    valido: true,
    inicio: validation.startUtc,
    fim: validation.endUtc,
    timezone,
  };
}

/**
 * Validação de conflito de agenda para o equipamento.
 *
 * Opções:
 * - manutencaoIdIgnorar: usado em edição para ignorar a própria manutenção
 */
export async function validarConflitoAgenda(
  estado,
  tenant,
  prisma,
  equipamentoId,
  unidade = null,
  opcoes = {}
) {
  let tenantContext = tenant;
  let prismaContext = prisma || prismaClient;
  let equipamentoIdContext = equipamentoId || estado?.equipamentoId || null;
  let unidadeContext = unidade;

  if (typeof tenant === 'string') {
    tenantContext = await prismaContext.tenant.findFirst({
      where: {
        id: tenant,
        ativo: true,
      },
      select: {
        id: true,
        timezone: true,
      },
    });

    if (!tenantContext) {
      return {
        valido: false,
        motivo: 'TENANT_INVALIDO',
        mensagem: 'Nao foi possivel validar a agenda para o tenant informado.',
      };
    }

    if (equipamentoIdContext && !unidadeContext) {
      const equipamento = await prismaContext.equipamento.findFirst({
        where: {
          tenantId: tenantContext.id,
          id: equipamentoIdContext,
        },
        select: {
          unidade: {
            select: {
              timezone: true,
            },
          },
        },
      });

      unidadeContext = equipamento?.unidade || null;
    }
  }

  if (!tenantContext?.id) {
    return {
      valido: false,
      motivo: 'TENANT_INVALIDO',
      mensagem: 'Nao foi possivel validar a agenda do tenant.',
    };
  }

  if (!equipamentoIdContext) {
    return {
      valido: false,
      motivo: 'EQUIPAMENTO_INVALIDO',
      mensagem: 'Nao foi possivel validar a agenda sem um equipamento definido.',
    };
  }

  const dateLocal = estado?.data;
  const startTimeLocal = estado?.horaInicio;
  const endTimeLocal = estado?.horaFim || null;

  const timezone = resolverTimezoneOperacional(tenantContext, unidadeContext);

  const validation = validateSchedulingWindow({
    dateLocal,
    startTimeLocal,
    endTimeLocal,
    timezone,
  });

  if (!validation.valid) {
    return {
      valido: false,
      motivo: validation.code,
      mensagem: validation.message || 'Não foi possível montar o intervalo.',
    };
  }

  const { startUtc, endUtc } = validation;
  const manutencaoIdIgnorar = opcoes?.manutencaoIdIgnorar || null;

  const conflito = await prismaContext.manutencao.findFirst({
    where: {
      tenantId: tenantContext.id,
      equipamentoId: equipamentoIdContext,
      ...(manutencaoIdIgnorar
        ? {
            id: {
              not: manutencaoIdIgnorar,
            },
          }
        : {}),
      status: {
        in: MANUTENCAO_STATUSS_CONFLITANTES,
      },
      AND: [
        {
          dataHoraAgendamentoInicio: {
            lt: endUtc || FAR_FUTURE_UTC_DATE,
          },
        },
        {
          OR: [
            {
              dataHoraAgendamentoFim: {
                gt: startUtc,
              },
            },
            {
              dataHoraAgendamentoFim: null,
              dataHoraAgendamentoInicio: {
                lt: endUtc || FAR_FUTURE_UTC_DATE,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      agendamentoDataInicioLocal: true,
      agendamentoHoraInicioLocal: true,
      agendamentoDataFimLocal: true,
      agendamentoHoraFimLocal: true,
      agendamentoTimezone: true,
      dataHoraAgendamentoInicio: true,
      dataHoraAgendamentoFim: true,
    },
  });

  if (conflito) {
    return {
      valido: false,
      motivo: 'CONFLITO_AGENDA',
      conflito,
      mensagem: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}.`,
    };
  }

  return {
    valido: true,
    inicio: startUtc,
    fim: endUtc,
    timezone,
  };
}
