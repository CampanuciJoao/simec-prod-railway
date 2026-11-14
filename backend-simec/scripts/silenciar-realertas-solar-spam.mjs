// Script oneshot pra silenciar alertas FOXESS_ENERGIA que estao presos no
// loop de re-notificacao 24h (bug corrigido em 2026-11-14).
//
// Contexto: o drainer re-notificava QUALQUER alerta FOXESS_ENERGIA MEDIA
// a cada 24h enquanto existisse. Alertas de restabelecimento, falhas
// resolvidas e insights retrospectivos (temperatura alta, pico abaixo,
// geracao baixa, derated, SoC medio) ficavam re-enviando por dias.
//
// O fix no codigo (telegramAlertService.js) restringe re-envio aos
// EVENTOS_REALERTA_24H (eventos em andamento). Este script zera
// telegramEnviadoEm pros alertas antigos que ficariam presos.
//
// Rodar uma vez em producao:
//   railway run --service simec-backend node backend-simec/scripts/silenciar-realertas-solar-spam.mjs
//
// Idempotente: se rodar de novo nao faz nada (ja foram marcados).

import prisma from '../services/prismaService.js';

const EVENTOS_INFORMATIVOS = [
  'FOXESS_ENERGIA_RESTABELECIDA',
  'SOLAR_INVERSOR_ONLINE_RESTABELECIDO',
  'SOLAR_FALHA_RESOLVIDA',
  'SOLAR_FALHA_AVISO',
  'SOLAR_GERACAO_BAIXA',
  'SOLAR_PICO_ABAIXO_CAPACIDADE',
  'SOLAR_INVERSOR_DERATED',
  'SOLAR_TEMPERATURA_ALTA',
  'SOLAR_SOC_MEDIO_BAIXO',
];

async function main() {
  console.log('[SILENCIAR] Procurando alertas FOXESS_ENERGIA informativos presos...');

  // Pra parar o loop, marca telegramEnviadoEm=now. O novo drainer nao
  // considera esses tipoEvento pra re-envio, entao mesmo que o campo
  // continue antigo, nao vai disparar. Mas setar now torna a intencao
  // explicita e protege contra reverter o codigo.
  const resultado = await prisma.alerta.updateMany({
    where: {
      tipoCategoria: 'FOXESS_ENERGIA',
      tipoEvento: { in: EVENTOS_INFORMATIVOS },
      telegramEnviado: true,
    },
    data: {
      telegramEnviadoEm: new Date(),
    },
  });

  console.log(`[SILENCIAR] ${resultado.count} alerta(s) silenciado(s).`);

  // Lista os alertas pra referencia
  const amostra = await prisma.alerta.findMany({
    where: {
      tipoCategoria: 'FOXESS_ENERGIA',
      tipoEvento: { in: EVENTOS_INFORMATIVOS },
    },
    select: { id: true, titulo: true, tipoEvento: true, data: true, tenantId: true },
    orderBy: { data: 'desc' },
    take: 20,
  });
  console.log('[SILENCIAR] Amostra (ate 20 mais recentes):');
  for (const a of amostra) {
    console.log(`  ${a.data.toISOString()}  ${a.tipoEvento.padEnd(36)}  ${a.titulo}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[SILENCIAR] Erro:', err);
  process.exit(1);
});
