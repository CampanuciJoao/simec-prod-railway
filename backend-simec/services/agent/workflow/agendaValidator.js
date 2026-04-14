// Ficheiro: services/agent/workflow/agendaValidator.js
// Versão: timezone-aware (padrão SIMEC novo)

import {
  criarIntervaloUTCFromLocal,
  getTenantTimezone,
  getAgora,
  isDataValida,
} from '../../timeService.js';

/**
 * Monta intervalo de agendamento corretamente usando timezone do tenant
 */
export function montarIntervaloAgendamento(estado, tenant) {
  const { data, horaInicio, horaFim } = estado;

  if (!data || !horaInicio) return null;

  const timeZone = getTenantTimezone(tenant);

  const { inicio, fim } = criarIntervaloUTCFromLocal({
    dataLocal: data,
    horaInicioLocal: horaInicio,
    horaFimLocal: horaFim,
    timeZone,
  });

  if (!isDataValida(inicio)) return null;

  return {
    inicio,
    fim,
  };
}

/**
 * Validação básica de intervalo
 */
export function validarIntervaloBasico(estado, tenant) {
  const intervalo = montarIntervaloAgendamento(estado, tenant);

  if (!intervalo || !intervalo.inicio) {
    return {
      valido: false,
      motivo: 'INTERVALO_INVALIDO',
      mensagem: 'Data ou horário inválido.',
    };
  }

  if (intervalo.fim && intervalo.fim <= intervalo.inicio) {
    return {
      valido: false,
      motivo: 'FIM_ANTES_DO_INICIO',
      mensagem: 'A hora final deve ser maior que a inicial.',
    };
  }

  return {
    valido: true,
    inicio: intervalo.inicio,
    fim: intervalo.fim,
  };
}

/**
 * Validação de conflito de agenda
 */
export async function validarConflitoAgenda(
  estado,
  tenant,
  prisma,
  equipamentoId
) {
  const intervalo = montarIntervaloAgendamento(estado, tenant);

  if (!intervalo || !intervalo.inicio) {
    return {
      valido: false,
      motivo: 'INTERVALO_INVALIDO',
      mensagem: 'Não foi possível montar o intervalo.',
    };
  }

  const { inicio, fim } = intervalo;

  const conflitos = await prisma.manutencao.findMany({
    where: {
      tenantId: tenant.id,
      equipamentoId,
      status: {
        in: ['Agendada', 'EmAndamento', 'Pendente', 'AguardandoConfirmacao'],
      },
      AND: [
        {
          dataHoraAgendamentoInicio: {
            lt: fim || new Date('9999-12-31'),
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
              dataHoraAgendamentoFim: null,
              dataHoraAgendamentoInicio: {
                lt: fim || new Date('9999-12-31'),
              },
            },
          ],
        },
      ],
    },
    take: 1,
  });

  if (conflitos.length > 0) {
    const c = conflitos[0];

    return {
      valido: false,
      motivo: 'CONFLITO_AGENDA',
      conflito: c,
      mensagem: `Já existe uma manutenção conflitante: OS ${c.numeroOS}`,
    };
  }

  return {
    valido: true,
    inicio,
    fim,
  };
}