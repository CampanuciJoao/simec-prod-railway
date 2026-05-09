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

export async function dispararNotificacoesTelegram(tenantIds = []) {
  if (!telegramConfigurado() || !tenantIds.length) return;

  await Promise.allSettled(tenantIds.map(processarTenant));
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

  // Sem destinatários: apenas marca como enviado para não acumular
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

    await Promise.allSettled(
      interessados.map(async (dest) => {
        try {
          await enviarMensagem(dest.chatId, formatarAlerta(alerta));
        } catch (err) {
          console.error(`[TELEGRAM] chatId=${dest.chatId} alerta=${alerta.id}:`, err.message);
        }
      })
    );

    await prisma.alerta.update({
      where: { id: alerta.id },
      data: { telegramEnviado: true },
    });
  }
}
