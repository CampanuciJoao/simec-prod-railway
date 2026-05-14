import prisma from '../prismaService.js';
import { enviarMensagem, formatarAlerta, telegramConfigurado } from './telegramService.js';

const CATEGORIA_FLAG = {
  MANUTENCAO:   'recebeAlertasManutencao',
  CONTRATO:     'recebeAlertasContrato',
  SEGURO:       'recebeAlertasSeguro',
  GEHC_SAUDE:   'recebeAlertasGehc',
  OS_CORRETIVA: 'recebeAlertasOsCorretiva',
  RECOMENDACAO: 'recebeAlertasRecomendacao',
};

// Despacho dirigido aos tenants que tiveram mudanca na ultima rodada de
// alertas. Usado pelo orchestrator como atalho para entregar rapido. Nao
// deve ser o unico caminho — caso contrario alertas pendentes em tenants
// "sem mudanca" ficam acumulando.
export async function dispararNotificacoesTelegram(tenantIds = []) {
  if (!telegramConfigurado() || !tenantIds.length) return;
  await Promise.allSettled(tenantIds.map(processarTenant));
}

// Drenagem global: varre TODOS tenants com alertas pendentes e tenta enviar.
// Roda em cron dedicado (a cada 1min) para garantir que pendencias nunca
// fiquem represadas, mesmo quando a regra de alertas nao gerou novidade.
export async function dispararPendenciasTelegramTodos() {
  if (!telegramConfigurado()) return { tenantsProcessados: 0, motivo: 'telegram_nao_configurado' };

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
  const [alertas, destinatarios] = await Promise.all([
    prisma.alerta.findMany({
      where: { tenantId, telegramEnviado: false },
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
