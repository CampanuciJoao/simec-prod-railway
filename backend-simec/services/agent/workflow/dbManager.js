// Ficheiro: backend-simec/services/agent/dbManager.js
// Versão: profissional, multi-tenant, timezone-aware, alinhada ao núcleo temporal oficial

import prisma from '../../prismaService.js';
import {
  resolveOperationalTimezone,
  validateSchedulingWindow,
} from '../../time/index.js';

function normalizarTipoManutencao(tipoManutencao) {
  const tipo = (tipoManutencao || '').toString().trim().toLowerCase();

  if (tipo === 'preventiva') return 'Preventiva';
  if (tipo === 'corretiva') return 'Corretiva';
  if (tipo === 'calibracao' || tipo === 'calibração') return 'Calibracao';
  if (tipo === 'inspecao' || tipo === 'inspeção') return 'Inspecao';

  return null;
}

function montarDescricaoFinal(tipoManutencao, estado) {
  if (estado?.descricaoProblemaServico?.trim()) {
    return estado.descricaoProblemaServico.trim();
  }

  if (estado?.descricao?.trim()) {
    return estado.descricao.trim();
  }

  if (tipoManutencao === 'Corretiva') {
    return 'Manutenção Corretiva';
  }

  return 'Manutenção Preventiva Programada';
}

export async function criarManutencaoNoBanco(estado, tenantId) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO_PARA_CRIAR_MANUTENCAO');
  }

  if (!estado?.equipamentoId) {
    throw new Error('Falha na persistência: ID do equipamento não resolvido.');
  }

  if (!estado?.data || !estado?.horaInicio) {
    throw new Error(
      'Falha na persistência: data e hora de início são obrigatórias.'
    );
  }

  const tipoManutencao = normalizarTipoManutencao(estado.tipoManutencao);

  if (!tipoManutencao) {
    throw new Error(
      `Falha na persistência: tipo de manutenção inválido (${estado.tipoManutencao || 'não informado'}).`
    );
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findFirst({
        where: {
          id: tenantId,
          ativo: true,
        },
        select: {
          id: true,
          timezone: true,
        },
      });

      if (!tenant) {
        throw new Error('TENANT_NAO_ENCONTRADO_OU_INATIVO');
      }

      const equipamento = await tx.equipamento.findFirst({
        where: {
          id: estado.equipamentoId,
          tenantId,
        },
        select: {
          id: true,
          tag: true,
          modelo: true,
          status: true,
          unidadeId: true,
          unidade: {
            select: {
              id: true,
              timezone: true,
            },
          },
        },
      });

      if (!equipamento) {
        throw new Error('EQUIPAMENTO_NAO_ENCONTRADO_NO_TENANT');
      }

      const timezone = resolveOperationalTimezone({
        tenantTimezone: tenant.timezone,
        unidadeTimezone: equipamento.unidade?.timezone,
      });

      const dateLocal = estado.data;
      const startTimeLocal = estado.horaInicio;
      const endTimeLocal = estado.horaFim || null;

      const scheduling = validateSchedulingWindow({
        dateLocal,
        startTimeLocal,
        endTimeLocal,
        timezone,
      });

      if (!scheduling.valid) {
        throw new Error(scheduling.code || 'JANELA_AGENDAMENTO_INVALIDA');
      }

      const totalTenant = await tx.manutencao.count({
        where: {
          tenantId,
        },
      });

      const osSequence = String(totalTenant + 1).padStart(4, '0');
      const tagPrefix = (estado.tag || equipamento.tag || 'MAN')
        .substring(0, 3)
        .toUpperCase();
      const typeInitial = tipoManutencao.charAt(0).toUpperCase();
      const numeroOS = `${typeInitial}${tagPrefix}-${osSequence}`;

      const descricaoFinal = montarDescricaoFinal(tipoManutencao, estado);

      const novaManutencao = await tx.manutencao.create({
        data: {
          tenant: {
            connect: { id: tenantId },
          },
          numeroOS,
          tipo: tipoManutencao,
          descricaoProblemaServico: descricaoFinal,
          tecnicoResponsavel:
            estado.tecnicoResponsavel?.trim() || 'Agente Guardião',
          numeroChamado:
            tipoManutencao === 'Corretiva'
              ? estado.numeroChamado?.trim() || null
              : null,

          agendamentoDataLocal: dateLocal,
          agendamentoHoraInicioLocal: startTimeLocal,
          agendamentoHoraFimLocal: endTimeLocal,
          agendamentoTimezone: timezone,

          dataHoraAgendamentoInicio: scheduling.startUtc,
          dataHoraAgendamentoFim: scheduling.endUtc,

          equipamento: {
            connect: {
              tenantId_id: {
                tenantId,
                id: estado.equipamentoId,
              },
            },
          },

          status: 'Agendada',
        },
      });

      await tx.equipamento.update({
        where: {
          tenantId_id: {
            tenantId,
            id: estado.equipamentoId,
          },
        },
        data: {
          status: 'EmManutencao',
        },
      });

      return novaManutencao;
    });

    console.log(
      `[DB_MANAGER] Sucesso: OS ${resultado.numeroOS} criada no tenant ${tenantId} e ativo atualizado.`
    );

    return resultado;
  } catch (error) {
    if (error.message === 'EQUIPAMENTO_NAO_ENCONTRADO_NO_TENANT') {
      throw new Error(
        'Falha na persistência: equipamento não encontrado no tenant informado.'
      );
    }

    if (error.message === 'TENANT_NAO_ENCONTRADO_OU_INATIVO') {
      throw new Error('Falha na persistência: tenant inválido ou inativo.');
    }

    if (error.message === 'INVALID_LOCAL_DATE') {
      throw new Error('Falha na persistência: data local inválida.');
    }

    if (error.message === 'INVALID_LOCAL_START_TIME') {
      throw new Error('Falha na persistência: hora inicial inválida.');
    }

    if (error.message === 'INVALID_LOCAL_END_TIME') {
      throw new Error('Falha na persistência: hora final inválida.');
    }

    if (error.message === 'PAST_LOCAL_DATETIME') {
      throw new Error(
        'Falha na persistência: a data/hora de início está no passado.'
      );
    }

    if (error.message === 'END_BEFORE_OR_EQUAL_START') {
      throw new Error(
        'Falha na persistência: a hora final deve ser maior que a hora inicial.'
      );
    }

    console.error('[DB_MANAGER_TRANSACTION_ERROR]:', error);
    throw new Error('Erro ao processar gravação no banco de dados.');
  }
}