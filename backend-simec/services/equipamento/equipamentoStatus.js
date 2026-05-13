// Status de equipamento que pausam todo monitoramento e processamento
// automatico (alertas, GE, IA, knowledge layer, insights, etc).
//
//   Vendido    -> equipamento saiu do tenant (registra comprador no historico)
//   Desativado -> equipamento ainda do tenant, mas desinstalado/parado
//
// Use STATUS_MONITORADOS_FILTER em toda query Prisma de equipamento que
// alimente cron/worker — garante exclusao consistente em todo lugar.

export const STATUS_INATIVOS = ['Vendido', 'Desativado'];

// Filtro Prisma WHERE: { status: { notIn: ['Vendido', 'Desativado'] } }
// Usar em prisma.equipamento.findMany({ where: { ..., ...STATUS_MONITORADOS_FILTER } })
// ou em campos aninhados: { equipamento: { ...STATUS_MONITORADOS_FILTER } }
export const STATUS_MONITORADOS_FILTER = Object.freeze({
  status: { notIn: STATUS_INATIVOS },
});

// Variante para uso em groups/relacao (mantem a estrutura que o Prisma espera)
export function whereEquipamentoMonitorado(extra = {}) {
  return { ...extra, status: { notIn: STATUS_INATIVOS } };
}

export function isStatusInativo(status) {
  return STATUS_INATIVOS.includes(status);
}
