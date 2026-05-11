import prisma from '../../prismaService.js';
import { getAgora } from '../../time/index.js';
import {
  buscarVisitasVencidasPorTenant,
  compactarAlertasOsCorretivaTerminais,
} from './osCorretivaAlertRepository.js';
import {
  gerarAlertasVisitaInicioProximo,
  iniciarVisitasAutomaticamente,
  gerarAlertasVisitaFimProximo,
  gerarAlertaVisitaVencida,
  moverVisitasParaConfirmacao,
} from './osCorretivaAlertRules.js';

async function processarTenant(tenant, agora) {
  // Rede de segurança: limpa alertas de OS já em estado terminal antes de gerar
  // novos. Os pontos de transição já chamam removerAlertasOsCorretivaDaOS, mas
  // se algum fluxo futuro esquecer, esta varredura corrige no próximo ciclo.
  const compactacao = await compactarAlertasOsCorretivaTerminais(tenant.id);

  const [inicioTotal, iniciadasTotal, fimTotal, confirmacaoTotal, visitas] = await Promise.all([
    gerarAlertasVisitaInicioProximo(tenant.id, agora),
    iniciarVisitasAutomaticamente(tenant.id, agora),
    gerarAlertasVisitaFimProximo(tenant.id, agora),
    moverVisitasParaConfirmacao(tenant.id, agora),
    buscarVisitasVencidasPorTenant(tenant.id, agora),
  ]);

  const vencidaResults = await Promise.all(
    visitas.map((v) => gerarAlertaVisitaVencida(tenant.id, v))
  );
  const vencidaTotal = vencidaResults.reduce((acc, v) => acc + v, 0);

  const total = inicioTotal + iniciadasTotal + fimTotal + confirmacaoTotal + vencidaTotal;

  console.log(
    `[ALERTA_OS_CORRETIVA][${tenant.id}] compactados=${compactacao.count || 0} inicio_proximo=${inicioTotal} iniciadas=${iniciadasTotal} fim_proximo=${fimTotal} confirmacao=${confirmacaoTotal} vencidas=${vencidaTotal}`
  );

  return { total, afetou: total > 0 || (compactacao.count || 0) > 0 };
}

export async function gerarAlertasOsCorretiva() {
  const agora = getAgora();

  const tenants = await prisma.tenant.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  let totalGlobal = 0;
  const tenantsAfetados = [];

  const results = await Promise.all(
    tenants.map((tenant) =>
      processarTenant(tenant, agora).then((res) => ({ tenantId: tenant.id, ...res }))
    )
  );

  for (const result of results) {
    totalGlobal += result.total;
    if (result.afetou) tenantsAfetados.push(result.tenantId);
  }

  console.log(
    `[ALERTA_OS_CORRETIVA] TOTAL GLOBAL: ${totalGlobal} | tenantsAfetados=${tenantsAfetados.length}`
  );

  return { total: totalGlobal, tenantsAfetados };
}

export default gerarAlertasOsCorretiva;
