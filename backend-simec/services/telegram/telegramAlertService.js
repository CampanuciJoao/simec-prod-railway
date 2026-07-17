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
};

// Categorias que podem acordar o usuario fora do horario comercial.
// Sao problemas ativos e urgentes onde esperar 8h pode causar dano
// (helio evaporando, compressor desligado, OS bloqueando exame).
//
// As demais categorias (SEGURO, CONTROLE_QUALIDADE, CONTRATO, MANUTENCAO,
// RECOMENDACAO) sao "prestes a vencer" — informativas, com janela de dias/
// semanas antes do prazo. Segurar ate as 9h evita spam de 00:00 quando
// vencimentos cruzam a janela na virada do dia.
const CATEGORIAS_URGENTES_24_7 = new Set(['GEHC_SAUDE', 'OS_CORRETIVA']);

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

async function processarTenant(tenantId) {
  // Timezone do tenant define o horario comercial local. Alertas nao-
  // urgentes ficam retidos ate as 09:00 do fuso do cliente pra evitar
  // notificacao no meio da madrugada quando vencimentos cruzam a janela.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });
  const noHorarioComercial = estaEmHorarioComercial(tenant?.timezone);

  const whereAlertas = { tenantId, telegramEnviado: false };
  if (!noHorarioComercial) {
    // Fora do horario comercial: so puxa alertas urgentes. Os nao-
    // urgentes ficam com telegramEnviado=false e serao processados
    // na proxima rodada dentro do horario comercial.
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

    // Marca como enviado APENAS se pelo menos 1 destinatario recebeu.
    // Caso contrario, fica pendente para retry no proximo ciclo
    // (resolve falhas transitorias de rede/rate limit).
    if (sucessos > 0) {
      await prisma.alerta.update({
        where: { id: alerta.id },
        data: { telegramEnviado: true },
      });
    }
  }
}
