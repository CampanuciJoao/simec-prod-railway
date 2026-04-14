// Ficheiro: services/agent/dbManager.js
// Versão: Multi-tenant + timezone standardized

import prisma from '../../prismaService.js';
import {
  criarIntervaloUTCFromLocal,
  getTenantTimezone,
  isDataValida,
} from '../../timeService.js';

function normalizarTipoManutencao(tipoManutencao) {
  const tipo = (tipoManutencao || '').toString().trim().toLowerCase();

  if (tipo === 'preventiva') return 'Preventiva';
  if (tipo === 'corretiva') return 'Corretiva';
  if (tipo === 'calibracao' || tipo === 'calibração') return 'Calibracao';
  if (tipo === 'inspecao' || tipo === 'inspeção') return 'Inspecao';

  return null;
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

      const tenantTimezone = getTenantTimezone(tenant);

      const dataLocal = estado.data;
      const horaInicioLocal = estado.horaInicio;
      const horaFimLocal = estado.horaFim || null;

      const intervalo = criarIntervaloUTCFromLocal({
        dataLocal,
        horaInicioLocal,
        horaFimLocal,
        timeZone: tenantTimezone,
      });

      const dataInicio = intervalo.inicio;
      const dataFim = intervalo.fim;

      if (!isDataValida(dataInicio)) {
        throw new Error('DATA_HORA_INICIO_INVALIDA');
      }

      if (dataFim && !isDataValida(dataFim)) {
        throw new Error('DATA_HORA_FIM_INVALIDA');
      }

      if (dataFim && dataFim.getTime() <= dataInicio.getTime()) {
        throw new Error('FIM_ANTES_DO_INICIO');
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
        },
      });

      if (!equipamento) {
        throw new Error('EQUIPAMENTO_NAO_ENCONTRADO_NO_TENANT');
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

      const descricaoFinal =
        tipoManutencao === 'Corretiva'
          ? estado.descricao || 'Manutenção Corretiva'
          : estado.descricao || 'Manutenção Preventiva Programada';

      const novaManutencao = await tx.manutencao.create({
        data: {
          tenant: {
            connect: { id: tenantId },
          },
          numeroOS,
          tipo: tipoManutencao,
          descricaoProblemaServico: descricaoFinal,
          tecnicoResponsavel:
            estado.tecnicoResponsavel || 'Agente Guardião',
          numeroChamado:
            tipoManutencao === 'Corretiva'
              ? estado.numeroChamado || null
              : null,

          agendamentoDataLocal: dataLocal,
          agendamentoHoraInicioLocal: horaInicioLocal,
          agendamentoHoraFimLocal: horaFimLocal,
          agendamentoTimezone: tenantTimezone,

          dataHoraAgendamentoInicio: dataInicio,
          dataHoraAgendamentoFim: dataFim,

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

    if (error.message === 'DATA_HORA_INICIO_INVALIDA') {
      throw new Error('Falha na persistência: data/hora de início inválida.');
    }

    if (error.message === 'DATA_HORA_FIM_INVALIDA') {
      throw new Error('Falha na persistência: data/hora de término inválida.');
    }

    if (error.message === 'FIM_ANTES_DO_INICIO') {
      throw new Error(
        'Falha na persistência: a hora final deve ser maior que a hora inicial.'
      );
    }

    console.error('[DB_MANAGER_TRANSACTION_ERROR]:', error);
    throw new Error('Erro ao processar gravação no banco de dados.');
  }
}