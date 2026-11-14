import prisma from '../prismaService.js';
import { enviarMensagem, formatarAlerta, telegramConfigurado } from './telegramService.js';

const CATEGORIA_FLAG = {
  MANUTENCAO:         'recebeAlertasManutencao',
  CONTRATO:           'recebeAlertasContrato',
  SEGURO:             'recebeAlertasSeguro',
  GEHC_SAUDE:         'recebeAlertasGehc',
  OS_CORRETIVA:       'recebeAlertasOsCorretiva',
  RECOMENDACAO:       'recebeAlertasRecomendacao',
  CONTROLE_QUALIDADE: 'recebeAlertasControleQualidade',
  FOXESS_ENERGIA:     'recebeAlertasFoxessEnergia',
};

// Categorias que podem acordar o usuario fora do horario comercial.
// Sao problemas ativos e urgentes onde esperar 8h pode causar dano
// (helio evaporando, compressor desligado, OS bloqueando exame).
//
// As demais categorias (SEGURO, CONTROLE_QUALIDADE, CONTRATO, MANUTENCAO,
// RECOMENDACAO) sao "prestes a vencer" — informativas, com janela de dias/
// semanas antes do prazo. Segurar ate as 9h evita spam de 00:00 quando
// vencimentos cruzam a janela na virada do dia.
// Categorias que notificam Telegram 24/7, mesmo fora do horario comercial
// do tenant. Queda de energia na unidade pode derrubar servidor/CPD em
// qualquer hora — precisa alerta imediato independente do horario.
const CATEGORIAS_URGENTES_24_7 = new Set(['GEHC_SAUDE', 'OS_CORRETIVA', 'FOXESS_ENERGIA']);

// Alertas de evento EM ANDAMENTO (problema ativo agora) merecem
// re-notificacao a cada 24h enquanto nao sao resolvidos. Alertas de
// RESTABELECIMENTO, resolucao e DIAGNOSTICO retrospectivo (temperatura,
// pico abaixo, geracao baixa, etc) notificam no maximo 1 vez — nao fica
// bom receber "Energia restabelecida 715min" todo dia de madrugada por
// 5 dias enquanto o alerta nao e apagado manualmente.
//
// Lista EXPLICITA: se um evento novo deve re-notificar enquanto persiste,
// precisa ser adicionado aqui. O default e NAO re-notificar.
const EVENTOS_REALERTA_24H = new Set([
  // GEHC — equipamento com problema fisico em andamento
  'GEHC_HELIO_BAIXO', 'GEHC_HELIO_CRITICO', 'GEHC_COMPRESSOR_OFF',
  'GEHC_TEMPERATURA_ALTA', 'GEHC_FLUXO_BAIXO', 'GEHC_PRESSAO_ANORMAL',
  'GEHC_MAGNETO_OFFLINE', 'GEHC_EQUIPAMENTO_OFFLINE', 'GEHC_MONITORAMENTO_PARADO',
  // OS corretiva — visita vencida ou em andamento
  'OS_CORRETIVA_VISITA_VENCIDA', 'OS_CORRETIVA_VISITA_CONFIRMACAO',
  // Solar — eventos EM ANDAMENTO (queda ativa, bateria baixa agora,
  // inversor offline agora, falha critica/alarme ativos, monitoramento
  // parado). Restabelecimentos, falhas resolvidas, e os insights diarios
  // (temperatura alta, pico abaixo, geracao baixa, derated, SoC medio)
  // NAO entram — eles sao retrospectivos e viram spam se re-notificarem.
  'FOXESS_QUEDA_ENERGIA', 'FOXESS_SOC_BAIXO', 'FOXESS_SOC_CRITICO',
  'FOXESS_MONITORAMENTO_PARADO',
  'SOLAR_INVERSOR_OFFLINE', 'SOLAR_OFFLINE_CURTO',
  'SOLAR_FALHA_CRITICA', 'SOLAR_FALHA_ALARME',
]);

const HORA_INICIO_COMERCIAL = 9;   // 09:00 no timezone do tenant
const HORA_FIM_COMERCIAL    = 20;  // 20:00 (inclusivo — dispara ate 19:59)

function estaEmHorarioComercial(timezone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hour12: false,
    });
    const hora = Number(fmt.format(new Date()));
    return hora >= HORA_INICIO_COMERCIAL && hora < HORA_FIM_COMERCIAL;
  } catch {
    // Timezone invalido — dispara pra evitar reter alertas eternamente
    return true;
  }
}

// Despacho dirigido aos tenants que tiveram mudanca na ultima rodada de
// alertas. Usado pelo orchestrator como atalho para entregar rapido. Nao
// deve ser o unico caminho — caso contrario alertas pendentes em tenants
// "sem mudanca" ficam acumulando.
export async function dispararNotificacoesTelegram(tenantIds = []) {
  if (!telegramConfigurado() || !tenantIds.length) return;
  await Promise.allSettled(tenantIds.map(processarTenant));
}

// Aviso "uma vez por boot" sobre token ausente. Sem essa flag, o cron de
// 1min faria spam de console.warn — com ela, o operador vê o problema no
// primeiro boot e fica em silêncio depois (até o próximo restart).
let avisouTokenAusente = false;

// Drenagem global: varre TODOS tenants com alertas pendentes e tenta enviar.
// Roda em cron dedicado (a cada 1min) para garantir que pendencias nunca
// fiquem represadas, mesmo quando a regra de alertas nao gerou novidade.
export async function dispararPendenciasTelegramTodos() {
  if (!telegramConfigurado()) {
    if (!avisouTokenAusente) {
      console.warn(
        '[TELEGRAM_CONFIG] TELEGRAM_BOT_TOKEN ausente nas env vars. ' +
        'Alertas com telegramEnviado=false vão se acumular indefinidamente. ' +
        'Configure a variável no Railway > Variables e redeploy.'
      );
      avisouTokenAusente = true;
    }
    return { tenantsProcessados: 0, motivo: 'telegram_nao_configurado' };
  }

  const tenantsPendentes = await prisma.alerta.findMany({
    where: { telegramEnviado: false },
    distinct: ['tenantId'],
    select: { tenantId: true },
  });

  if (tenantsPendentes.length === 0) return { tenantsProcessados: 0 };

  await Promise.allSettled(tenantsPendentes.map((t) => processarTenant(t.tenantId)));
  return { tenantsProcessados: tenantsPendentes.length };
}

// Alertas GEHC_SAUDE persistentes (nao resolvidos) sao re-notificados
// a cada N horas pra manter o operador ciente. Sem isso, um alerta
// disparado uma vez ficaria silenciado enquanto o problema persistisse
// (comportamento anterior — usuario relatou "so alertou uma vez").
const REALERTA_INTERVALO_MS = 24 * 60 * 60 * 1000; // 24h

async function processarTenant(tenantId) {
  // Timezone do tenant define o horario comercial local. Alertas nao-
  // urgentes ficam retidos ate as 09:00 do fuso do cliente pra evitar
  // notificacao no meio da madrugada quando vencimentos cruzam a janela.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const noHorarioComercial = estaEmHorarioComercial(tenant?.timezone);

  // Condicao 1: alertas nunca notificados (telegramEnviado=false).
  // Condicao 2: alertas de evento EM ANDAMENTO (vide EVENTOS_REALERTA_24H)
  //             com prioridade ALTA/MEDIA que foram notificados ha mais de
  //             24h — re-notifica. Isso cobre queda de energia ativa,
  //             inversor offline, helio baixo etc. NAO cobre insights
  //             retrospectivos (temperatura alta, pico abaixo, geracao
  //             baixa) nem restabelecimentos, que viram spam quando
  //             re-notificam por dias seguidos.
  const limiteReenvio = new Date(Date.now() - REALERTA_INTERVALO_MS);
  const whereAlertas = {
    tenantId,
    OR: [
      { telegramEnviado: false },
      {
        telegramEnviado: true,
        tipoEvento: { in: [...EVENTOS_REALERTA_24H] },
        prioridade: { in: ['Alta', 'Media'] },
        telegramEnviadoEm: { lt: limiteReenvio },
      },
    ],
  };
  if (!noHorarioComercial) {
    // Fora do horario comercial: so puxa alertas urgentes. Os nao-
    // urgentes ficam retidos e serao processados na proxima rodada
    // dentro do horario comercial.
    whereAlertas.tipoCategoria = { in: [...CATEGORIAS_URGENTES_24_7] };
  }

  const [alertas, destinatarios] = await Promise.all([
    prisma.alerta.findMany({
      where: whereAlertas,
      orderBy: { createdAt: 'asc' },
      take: 50,
    }),
    prisma.telegramNotificacao.findMany({
      where: { tenantId, ativo: true },
    }),
  ]);

  if (alertas.length === 0) return;

  // Sem destinatários cadastrados: marca como enviado para não acumular
  // indefinidamente (nao ha quem receber). Permanece se algum dia for
  // configurado.
  if (destinatarios.length === 0) {
    await prisma.alerta.updateMany({
      where: { tenantId, telegramEnviado: false },
      data: { telegramEnviado: true },
    });
    return;
  }

  for (const alerta of alertas) {
    const flag = CATEGORIA_FLAG[alerta.tipoCategoria];
    const interessados = flag ? destinatarios.filter((d) => d[flag]) : [];

    // Sem destinatario interessado nesta categoria — marca como enviado
    // (nao ha o que entregar; nao deve ficar pendente eternamente).
    if (interessados.length === 0) {
      await prisma.alerta.update({
        where: { id: alerta.id },
        data: { telegramEnviado: true },
      });
      continue;
    }

    // ATOMIC CLAIM: marca como enviado ANTES de mandar. Sem isso, dois
    // workers concorrentes enviam a mesma mensagem duplicada. Condicoes
    // que permitem o claim:
    //   (a) alerta nunca notificado (telegramEnviado=false), OU
    //   (b) alerta persistente GEHC_SAUDE ALTA/MEDIA cuja ultima
    //       notificacao foi ha mais de REALERTA_INTERVALO_MS (24h)
    // Setar telegramEnviadoEm=now serve como "marca d'agua" — o proximo
    // worker que consultar vai ver o valor atualizado e nao vai
    // reclaim.
    const claim = await prisma.alerta.updateMany({
      where: {
        id: alerta.id,
        OR: [
          { telegramEnviado: false },
          {
            telegramEnviado: true,
            tipoEvento: { in: [...EVENTOS_REALERTA_24H] },
            prioridade: { in: ['Alta', 'Media'] },
            telegramEnviadoEm: { lt: limiteReenvio },
          },
        ],
      },
      data: { telegramEnviado: true, telegramEnviadoEm: new Date() },
    });
    if (claim.count === 0) {
      // Outro worker ja claim-ou este alerta. Pula sem enviar.
      continue;
    }

    // Tenta enviar para cada destinatario; conta sucessos.
    const resultados = await Promise.allSettled(
      interessados.map(async (dest) => {
        await enviarMensagem(dest.chatId, formatarAlerta(alerta));
        return dest.chatId;
      })
    );

    const sucessos = resultados.filter((r) => r.status === 'fulfilled').length;
    const falhas   = resultados.length - sucessos;

    if (falhas > 0) {
      const mensagensErro = resultados
        .filter((r) => r.status === 'rejected')
        .map((r) => r.reason?.message || String(r.reason))
        .join(' | ');
      console.error(
        `[TELEGRAM] alerta=${alerta.id} tenant=${tenantId}: ${sucessos}/${interessados.length} sucesso(s). Erros: ${mensagensErro}`
      );
    }

    // Falha total (0 sucessos): reverte o claim pra alerta ser retentado
    // no proximo ciclo (recupera de falhas transitorias tipo rate limit).
    // Reseta telegramEnviadoEm tambem — foi setado no claim mas o envio
    // nao completou, entao a "marca d'agua" nao vale.
    if (sucessos === 0) {
      await prisma.alerta.update({
        where: { id: alerta.id },
        data:  { telegramEnviado: false, telegramEnviadoEm: null },
      }).catch(() => {});
    }
  }
}
