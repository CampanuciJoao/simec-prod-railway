import prisma from '../services/prismaService.js';
import { registrarEventoHistoricoAtivo } from '../services/historicoAtivoService.js';

function getArgValue(flag) {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.slice(flag.length + 1) : null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function carregarResumoTenant(tenantId) {
  const [
    tenant,
    equipamentos,
    manutencoes,
    ocorrencias,
    historicoAtivoEventos,
    alertas,
    alertasLidos,
    notasAndamento,
    manutencaoEventos,
    anexosEquipamentos,
    anexosManutencoes,
  ] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: {
        id: true,
        nome: true,
        slug: true,
        ativo: true,
      },
    }),
    prisma.equipamento.count({ where: { tenantId } }),
    prisma.manutencao.count({ where: { tenantId } }),
    prisma.ocorrencia.count({ where: { tenantId } }),
    prisma.historicoAtivoEvento.count({ where: { tenantId } }),
    prisma.alerta.count({ where: { tenantId } }),
    prisma.alertaLidoPorUsuario.count({ where: { tenantId } }),
    prisma.notaAndamento.count({ where: { tenantId } }),
    prisma.manutencaoEvento.count({ where: { tenantId } }),
    prisma.anexo.count({
      where: {
        tenantId,
        equipamentoId: {
          not: null,
        },
      },
    }),
    prisma.anexo.count({
      where: {
        tenantId,
        manutencaoId: {
          not: null,
        },
      },
    }),
  ]);

  return {
    tenant,
    counts: {
      equipamentos,
      manutencoes,
      ocorrencias,
      historicoAtivoEventos,
      alertas,
      alertasLidos,
      notasAndamento,
      manutencaoEventos,
      anexosEquipamentos,
      anexosManutencoes,
    },
  };
}

async function auditarHistorico(tenantId) {
  const [
    equipamentos,
    manutencoes,
    ocorrencias,
    referenciasManutencao,
    referenciasOcorrencia,
  ] =
    await Promise.all([
      prisma.equipamento.findMany({
        where: { tenantId },
        select: {
          id: true,
          modelo: true,
          tag: true,
          _count: {
            select: {
              historicoEventos: true,
            },
          },
        },
      }),
      prisma.manutencao.findMany({
        where: { tenantId },
        select: {
          id: true,
          numeroOS: true,
          equipamentoId: true,
          tipo: true,
          status: true,
          descricaoProblemaServico: true,
          numeroChamado: true,
          dataHoraAgendamentoInicio: true,
          dataConclusao: true,
          createdAt: true,
        },
      }),
      prisma.ocorrencia.findMany({
        where: { tenantId },
        select: {
          id: true,
          equipamentoId: true,
          titulo: true,
          descricao: true,
          tipo: true,
          origem: true,
          gravidade: true,
          tecnico: true,
          metadata: true,
          resolvido: true,
          solucao: true,
          tecnicoResolucao: true,
          data: true,
          dataResolucao: true,
        },
      }),
      prisma.historicoAtivoEvento.findMany({
        where: {
          tenantId,
          referenciaTipo: 'manutencao',
          referenciaId: {
            not: null,
          },
        },
        select: {
          referenciaId: true,
        },
        distinct: ['referenciaId'],
      }),
      prisma.historicoAtivoEvento.findMany({
        where: {
          tenantId,
          referenciaTipo: 'ocorrencia',
          referenciaId: {
            not: null,
          },
        },
        select: {
          referenciaId: true,
        },
        distinct: ['referenciaId'],
      }),
    ]);

  const manutencoesComHistorico = new Set(
    referenciasManutencao.map((item) => item.referenciaId)
  );
  const ocorrenciasComHistorico = new Set(
    referenciasOcorrencia.map((item) => item.referenciaId)
  );

  return {
    equipamentosSemHistorico: equipamentos.filter(
      (item) => (item._count?.historicoEventos || 0) === 0
    ),
    manutencoesSemHistorico: manutencoes.filter(
      (item) => !manutencoesComHistorico.has(item.id)
    ),
    ocorrenciasSemHistorico: ocorrencias.filter(
      (item) => !ocorrenciasComHistorico.has(item.id)
    ),
  };
}

async function backfillHistorico(tenantId) {
  const auditoria = await auditarHistorico(tenantId);

  for (const equipamento of auditoria.equipamentosSemHistorico) {
    const equipamentoCompleto = await prisma.equipamento.findFirst({
      where: {
        tenantId,
        id: equipamento.id,
      },
      include: {
        unidade: {
          select: {
            nomeSistema: true,
          },
        },
      },
    });

    if (!equipamentoCompleto) continue;

    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: equipamentoCompleto.id,
      tipoEvento: equipamentoCompleto.dataInstalacao
        ? 'equipamento_criado'
        : 'cadastro_ativo',
      categoria: equipamentoCompleto.dataInstalacao
        ? 'instalacao'
        : 'alteracao_cadastral',
      subcategoria: equipamentoCompleto.dataInstalacao
        ? 'instalacao_inicial'
        : 'criacao_ativo',
      titulo: equipamentoCompleto.dataInstalacao
        ? 'Instalacao inicial registrada'
        : 'Ativo cadastrado no sistema',
      descricao: `Ativo ${equipamentoCompleto.modelo || 'Sem modelo'} (${equipamentoCompleto.tag || 'Sem TAG'}) vinculado a unidade ${equipamentoCompleto.unidade?.nomeSistema || 'N/A'}.`,
      origem: 'sistema',
      status: equipamentoCompleto.status,
      impactaAnalise: false,
      referenciaId: equipamentoCompleto.id,
      referenciaTipo: 'equipamento',
      metadata: {
        origemBackfill: true,
      },
      dataEvento:
        equipamentoCompleto.dataInstalacao || equipamentoCompleto.createdAt,
    });
  }

  for (const manutencao of auditoria.manutencoesSemHistorico) {
    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: manutencao.equipamentoId,
      tipoEvento: 'manutencao_registrada',
      categoria: 'manutencao',
      subcategoria: manutencao.tipo,
      titulo: `OS ${manutencao.numeroOS || 'Sem numero'} registrada`,
      descricao: manutencao.descricaoProblemaServico,
      origem: 'sistema',
      status: manutencao.status,
      impactaAnalise: manutencao.tipo === 'Corretiva',
      referenciaId: manutencao.id,
      referenciaTipo: 'manutencao',
      metadata: {
        numeroOS: manutencao.numeroOS,
        numeroChamado: manutencao.numeroChamado,
        origemBackfill: true,
      },
      dataEvento:
        manutencao.dataConclusao ||
        manutencao.dataHoraAgendamentoInicio ||
        manutencao.createdAt,
    });
  }

  for (const ocorrencia of auditoria.ocorrenciasSemHistorico) {
    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: ocorrencia.equipamentoId,
      tipoEvento: 'ocorrencia_registrada',
      categoria: 'ocorrencia',
      subcategoria: ocorrencia.tipo,
      titulo: ocorrencia.titulo,
      descricao: ocorrencia.descricao,
      origem: ocorrencia.origem || 'usuario',
      status: ocorrencia.resolvido ? 'Resolvido' : 'Pendente',
      impactaAnalise: ['Operacional', 'Falha'].includes(ocorrencia.tipo),
      referenciaId: ocorrencia.id,
      referenciaTipo: 'ocorrencia',
      metadata: {
        gravidade: ocorrencia.gravidade,
        tecnico: ocorrencia.tecnico,
        metadata: ocorrencia.metadata,
        origemBackfill: true,
      },
      dataEvento: ocorrencia.data,
    });

    if (ocorrencia.resolvido && ocorrencia.dataResolucao) {
      await registrarEventoHistoricoAtivo({
        tenantId,
        equipamentoId: ocorrencia.equipamentoId,
        tipoEvento: 'ocorrencia_resolvida',
        categoria: 'ocorrencia',
        subcategoria: 'resolucao',
        titulo: `Resolucao da ocorrencia: ${ocorrencia.titulo}`,
        descricao: ocorrencia.solucao,
        origem: 'usuario',
        status: 'Resolvido',
        impactaAnalise: false,
        referenciaId: ocorrencia.id,
        referenciaTipo: 'ocorrencia',
        metadata: {
          tecnicoResolucao: ocorrencia.tecnicoResolucao,
          dataResolucao: ocorrencia.dataResolucao,
          origemBackfill: true,
        },
        dataEvento: ocorrencia.dataResolucao,
      });
    }
  }

  return auditarHistorico(tenantId);
}

async function cleanupAlertas(tenantId) {
  return prisma.$transaction(async (tx) => {
    const leituras = await tx.alertaLidoPorUsuario.deleteMany({
      where: { tenantId },
    });
    const alertas = await tx.alerta.deleteMany({
      where: { tenantId },
    });

    return {
      leituras: leituras.count,
      alertas: alertas.count,
    };
  });
}

async function cleanupOperacional(tenantId) {
  return prisma.$transaction(async (tx) => {
    const leituras = await tx.alertaLidoPorUsuario.deleteMany({
      where: { tenantId },
    });
    const alertas = await tx.alerta.deleteMany({
      where: { tenantId },
    });
    const notas = await tx.notaAndamento.deleteMany({
      where: { tenantId },
    });
    const eventosManutencao = await tx.manutencaoEvento.deleteMany({
      where: { tenantId },
    });
    const historico = await tx.historicoAtivoEvento.deleteMany({
      where: { tenantId },
    });
    const ocorrencias = await tx.ocorrencia.deleteMany({
      where: { tenantId },
    });
    const anexosManutencao = await tx.anexo.deleteMany({
      where: {
        tenantId,
        manutencaoId: {
          not: null,
        },
      },
    });
    const manutencoes = await tx.manutencao.deleteMany({
      where: { tenantId },
    });

    return {
      leituras: leituras.count,
      alertas: alertas.count,
      notas: notas.count,
      eventosManutencao: eventosManutencao.count,
      historico: historico.count,
      ocorrencias: ocorrencias.count,
      anexosManutencao: anexosManutencao.count,
      manutencoes: manutencoes.count,
    };
  });
}

async function resetTenantData(tenantId) {
  return prisma.$transaction(async (tx) => {
    const operacional = await cleanupOperacional(tenantId);
    const anexosEquipamentos = await tx.anexo.deleteMany({
      where: {
        tenantId,
        equipamentoId: {
          not: null,
        },
      },
    });
    const acessorios = await tx.acessorio.deleteMany({
      where: { tenantId },
    });
    const equipamentos = await tx.equipamento.deleteMany({
      where: { tenantId },
    });

    return {
      ...operacional,
      anexosEquipamentos: anexosEquipamentos.count,
      acessorios: acessorios.count,
      equipamentos: equipamentos.count,
    };
  });
}

async function main() {
  const tenantId = getArgValue('--tenant');
  const mode = getArgValue('--mode') || 'preview';
  const execute = hasFlag('--execute');

  if (!tenantId) {
    throw new Error('Informe o tenant com --tenant=<tenantId>.');
  }

  console.log(`[TENANT_MAINTENANCE] tenant=${tenantId} mode=${mode}`);

  const resumoAntes = await carregarResumoTenant(tenantId);
  console.log(
    '[TENANT_MAINTENANCE] resumoAntes=',
    JSON.stringify(resumoAntes, null, 2)
  );

  if (mode === 'preview') {
    const auditoria = await auditarHistorico(tenantId);
    console.log(
      '[TENANT_MAINTENANCE] auditoriaHistorico=',
      JSON.stringify(
        {
          equipamentosSemHistorico: auditoria.equipamentosSemHistorico.length,
          manutencoesSemHistorico: auditoria.manutencoesSemHistorico.length,
          ocorrenciasSemHistorico: auditoria.ocorrenciasSemHistorico.length,
        },
        null,
        2
      )
    );
    return;
  }

  if (!execute) {
    console.log(
      '[TENANT_MAINTENANCE] modo destrutivo bloqueado. Use --execute para confirmar.'
    );
    return;
  }

  let resultado = null;

  if (mode === 'cleanup-alertas') {
    resultado = await cleanupAlertas(tenantId);
  } else if (mode === 'cleanup-operacional') {
    resultado = await cleanupOperacional(tenantId);
  } else if (mode === 'reset-tenant-data') {
    resultado = await resetTenantData(tenantId);
  } else if (mode === 'backfill-history') {
    resultado = await backfillHistorico(tenantId);
  } else if (mode === 'audit-history') {
    resultado = await auditarHistorico(tenantId);
  } else {
    throw new Error(`Modo não suportado: ${mode}`);
  }

  console.log(
    '[TENANT_MAINTENANCE] resultado=',
    JSON.stringify(resultado, null, 2)
  );

  const resumoDepois = await carregarResumoTenant(tenantId);
  console.log(
    '[TENANT_MAINTENANCE] resumoDepois=',
    JSON.stringify(resumoDepois, null, 2)
  );
}

main()
  .catch((error) => {
    console.error('[TENANT_MAINTENANCE_ERROR]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
