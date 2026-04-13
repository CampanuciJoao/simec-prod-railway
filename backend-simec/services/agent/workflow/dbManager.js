// simec/backend-simec/services/agent/dbManager.js
import prisma from '../../prismaService.js';
import { criarDateUTC, isDataValida } from '../../timeService.js';

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

  const dataInicio = criarDateUTC(estado.data, estado.horaInicio);
  const dataFim = estado.horaFim
    ? criarDateUTC(estado.data, estado.horaFim)
    : null;

  if (!isDataValida(dataInicio)) {
    throw new Error('Falha na persistência: data/hora de início inválida.');
  }

  if (dataFim && !isDataValida(dataFim)) {
    throw new Error('Falha na persistência: data/hora de término inválida.');
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
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
          tenantId,
          numeroOS,
          tipo: tipoManutencao,
          descricaoProblemaServico: descricaoFinal,
          tecnicoResponsavel:
            estado.tecnicoResponsavel || 'Agente Guardião',
          dataHoraAgendamentoInicio: dataInicio,
          dataHoraAgendamentoFim: dataFim,
          numeroChamado:
            tipoManutencao === 'Corretiva'
              ? estado.numeroChamado || null
              : null,
          equipamentoId: estado.equipamentoId,
          status: 'Agendada',
        },
      });

      await tx.equipamento.update({
        where: {
          id: estado.equipamentoId,
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

    console.error('[DB_MANAGER_TRANSACTION_ERROR]:', error);
    throw new Error('Erro ao processar gravação no banco de dados.');
  }
}