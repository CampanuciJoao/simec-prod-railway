import prisma from '../prismaService.js';

const RETENCAO_ALERTAS_DIAS   = 90;
const RETENCAO_SESSOES_DIAS   = 30;
const RETENCAO_MENSAGENS_DIAS = 60;
const RETENCAO_SEGUROS_ANOS   = 5;

// Solar — retencao diferenciada por volume e utilidade:
// - snapshots: minuto-a-minuto, altissimo volume. Usado so pelo grafico
//   de 7 dias e pelo calculo ao vivo do mes. Mantem 90 dias.
// - agregados diarios (planta e por inverter): 1 linha/dia/planta.
//   Usado pelo widget de historico anual e relatorios. Mantem 730 dias (2 anos).
// - agregados mensais: 1 linha/mes/planta. Base pra relatorios anuais.
//   Mantem 1095 dias (3 anos).
// - solar_outages (quedas) e solar_falhas resolvidas: 730 dias.
const RETENCAO_SOLAR_SNAPSHOTS_DIAS         = 90;
const RETENCAO_SOLAR_AGREGADOS_DIARIOS_DIAS = 730;
const RETENCAO_SOLAR_AGREGADOS_MENSAIS_DIAS = 1095;
const RETENCAO_SOLAR_OUTAGES_DIAS           = 730;
const RETENCAO_SOLAR_FALHAS_RESOLVIDAS_DIAS = 730;

const BATCH_ARQUIVO = 500;

function diasAtras(dias) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

/**
 * Arquiva alertas antigos em `alertas_historico` antes de removê-los.
 * IBM Maximo / compliance: todo alerta deve ser rastreável mesmo após expirar.
 */
export async function limparAlertasAntigos() {
  const corte = diasAtras(RETENCAO_ALERTAS_DIAS);

  const alertasParaArquivar = await prisma.alerta.findMany({
    where: { data: { lt: corte } },
    select: {
      id: true,
      tenantId: true,
      titulo: true,
      subtitulo: true,
      tipo: true,
      tipoCategoria: true,
      tipoEvento: true,
      prioridade: true,
      link: true,
      numeroOS: true,
      data: true,
    },
  });

  if (alertasParaArquivar.length === 0) {
    console.log('[CLEANUP] Alertas: nenhum a arquivar.');
    return 0;
  }

  // Inserção em lotes para não estourar memória com volumes grandes
  for (let i = 0; i < alertasParaArquivar.length; i += BATCH_ARQUIVO) {
    const lote = alertasParaArquivar.slice(i, i + BATCH_ARQUIVO);

    await prisma.alertaHistorico.createMany({
      data: lote.map((a) => ({
        tenantId:      a.tenantId,
        alertaId:      a.id,
        titulo:        a.titulo,
        subtitulo:     a.subtitulo,
        tipo:          a.tipo,
        tipoCategoria: a.tipoCategoria,
        tipoEvento:    a.tipoEvento,
        prioridade:    a.prioridade.toString(),
        link:          a.link,
        numeroOS:      a.numeroOS,
        dataAlerta:    a.data,
        motivoArquivo: 'retencao_automatica',
      })),
      skipDuplicates: true,
    });
  }

  // Deleta após arquivar — AlertaLidoPorUsuario cascateia automaticamente
  const result = await prisma.alerta.deleteMany({
    where: { data: { lt: corte } },
  });

  console.log(
    `[CLEANUP] Alertas arquivados=${alertasParaArquivar.length} | removidos=${result.count} (anteriores a ${corte.toISOString().slice(0, 10)})`
  );
  return result.count;
}

/**
 * Remove sessões do agente concluídas/canceladas/expiradas.
 * CORREÇÃO: enum usa PascalCase (Finalizada, Cancelada, Expirada) — não UPPERCASE.
 */
export async function limparSessoesAgente() {
  const corte = diasAtras(RETENCAO_SESSOES_DIAS);

  // AgentMessage cascateia via onDelete: Cascade no schema
  const result = await prisma.agentSession.deleteMany({
    where: {
      status: { in: ['Finalizada', 'Cancelada', 'Expirada'] },
      updatedAt: { lt: corte },
    },
  });

  console.log(`[CLEANUP] Sessões do agente removidas: ${result.count}`);
  return result.count;
}

/**
 * Remove mensagens órfãs de sessões concluídas com mais de 60 dias.
 */
export async function limparMensagensOrfas() {
  const corte = diasAtras(RETENCAO_MENSAGENS_DIAS);

  const result = await prisma.agentMessage.deleteMany({
    where: {
      createdAt: { lt: corte },
      session: {
        status: { in: ['Finalizada', 'Cancelada', 'Expirada'] },
      },
    },
  });

  console.log(`[CLEANUP] Mensagens do agente removidas: ${result.count}`);
  return result.count;
}

export async function limparSegurosAntigos() {
  const corte = new Date();
  corte.setFullYear(corte.getFullYear() - RETENCAO_SEGUROS_ANOS);

  const result = await prisma.seguro.deleteMany({
    where: {
      status: { in: ['Expirado', 'Cancelado', 'Substituido'] },
      dataFim: { lt: corte },
    },
  });

  console.log(
    `[CLEANUP] Seguros antigos removidos: ${result.count} (dataFim anterior a ${corte.toISOString().slice(0, 10)})`
  );
  return result.count;
}

// Importado dinamicamente para evitar dependencia circular caso o
// gehcDownloadLogger venha a importar algo desse cleanup.
async function purgarLogsDownloaderGehc() {
  const { purgarLogsAntigos } = await import('../gehc/gehcDownloadLogger.js');
  const r = await purgarLogsAntigos();
  return r.purgados || 0;
}

// Retencao Solar — apaga snapshots > 90 dias, agregados diarios > 730 dias
// (2 anos), agregados mensais > 1095 dias (3 anos), outages e falhas
// resolvidas > 730 dias. Ordem importa: dependencias do mais leve pro
// mais pesado. Em caso de falha parcial, retorna o que foi apagado.
export async function limparSolarAntigos() {
  const resultados = {};

  // Snapshots (minuto-a-minuto, volume alto)
  const corteSnap = diasAtras(RETENCAO_SOLAR_SNAPSHOTS_DIAS);
  const snaps = await prisma.solarSnapshot.deleteMany({
    where: { capturedAt: { lt: corteSnap } },
  });
  resultados.snapshots = snaps.count;

  // Agregados diarios (planta + por inverter)
  const corteDiarios = diasAtras(RETENCAO_SOLAR_AGREGADOS_DIARIOS_DIAS);
  const [diariosPlanta, diariosInverter] = await Promise.all([
    prisma.solarAgregadoDiario.deleteMany({ where: { dia: { lt: corteDiarios } } }),
    prisma.solarAgregadoDiarioInverter.deleteMany({ where: { dia: { lt: corteDiarios } } }),
  ]);
  resultados.agregadosDiariosPlanta = diariosPlanta.count;
  resultados.agregadosDiariosInverter = diariosInverter.count;

  // Agregados mensais (3 anos)
  const corteMensais = diasAtras(RETENCAO_SOLAR_AGREGADOS_MENSAIS_DIAS);
  // SolarAgregadoMensal usa ano/mes — monta cut pela combinacao
  const anoCorte = corteMensais.getUTCFullYear();
  const mesCorte = corteMensais.getUTCMonth() + 1;
  const mensais = await prisma.solarAgregadoMensal.deleteMany({
    where: {
      OR: [
        { ano: { lt: anoCorte } },
        { AND: [{ ano: anoCorte }, { mes: { lt: mesCorte } }] },
      ],
    },
  });
  resultados.agregadosMensais = mensais.count;

  // Outages
  const corteOut = diasAtras(RETENCAO_SOLAR_OUTAGES_DIAS);
  const outages = await prisma.solarOutage.deleteMany({
    where: { inicioEm: { lt: corteOut } },
  });
  resultados.outages = outages.count;

  // Falhas resolvidas (abertas ficam ate resolver — nao apaga por tempo)
  const corteFalhas = diasAtras(RETENCAO_SOLAR_FALHAS_RESOLVIDAS_DIAS);
  const falhas = await prisma.solarFalha.deleteMany({
    where: {
      resolvidaEm: { not: null, lt: corteFalhas },
    },
  });
  resultados.falhasResolvidas = falhas.count;

  console.log(
    `[CLEANUP_SOLAR] snapshots=${resultados.snapshots} | diariosPlanta=${resultados.agregadosDiariosPlanta} | ` +
    `diariosInverter=${resultados.agregadosDiariosInverter} | mensais=${resultados.agregadosMensais} | ` +
    `outages=${resultados.outages} | falhasResolvidas=${resultados.falhasResolvidas}`
  );
  return resultados;
}

export async function executarCleanupCompleto() {
  console.log('[CLEANUP] Iniciando rotina de retenção de dados...');

  const [alertas, sessoes, mensagens, seguros, logsDownloader, solar] = await Promise.allSettled([
    limparAlertasAntigos(),
    limparSessoesAgente(),
    limparMensagensOrfas(),
    limparSegurosAntigos(),
    purgarLogsDownloaderGehc(),
    limparSolarAntigos(),
  ]);

  const totalAlerts  = alertas.status  === 'fulfilled' ? alertas.value  : 0;
  const totalSessoes = sessoes.status  === 'fulfilled' ? sessoes.value  : 0;
  const totalMsgs    = mensagens.status === 'fulfilled' ? mensagens.value : 0;
  const totalSeguros = seguros.status  === 'fulfilled' ? seguros.value  : 0;
  const totalLogsDl  = logsDownloader.status === 'fulfilled' ? logsDownloader.value : 0;
  const solarResumo  = solar.status === 'fulfilled' ? solar.value : null;

  if (alertas.status  === 'rejected') console.error('[CLEANUP] Erro em alertas:',  alertas.reason?.message);
  if (sessoes.status  === 'rejected') console.error('[CLEANUP] Erro em sessões:',  sessoes.reason?.message);
  if (mensagens.status === 'rejected') console.error('[CLEANUP] Erro em mensagens:', mensagens.reason?.message);
  if (seguros.status  === 'rejected') console.error('[CLEANUP] Erro em seguros:',  seguros.reason?.message);
  if (logsDownloader.status === 'rejected') console.error('[CLEANUP] Erro em logs downloader:', logsDownloader.reason?.message);
  if (solar.status === 'rejected') console.error('[CLEANUP] Erro em solar:', solar.reason?.message);

  console.log(
    `[CLEANUP] Concluído | alertas=${totalAlerts} | sessões=${totalSessoes} | mensagens=${totalMsgs} | ` +
    `seguros=${totalSeguros} | logsDownloader=${totalLogsDl} | solar=${JSON.stringify(solarResumo)}`
  );

  return {
    alertas: totalAlerts, sessoes: totalSessoes, mensagens: totalMsgs,
    seguros: totalSeguros, logsDownloader: totalLogsDl,
    solar: solarResumo,
  };
}
