import { getMonth, getYear } from 'date-fns';

const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const TIPOS_MANUTENCAO = ['Preventiva', 'Corretiva', 'Calibracao', 'Inspecao'];

const STATUS_CORES = {
  Operante: { light: '#22C55E', dark: '#4ADE80', textLight: '#15803D', textDark: '#D1FAE5' },
  EmManutencao: { light: '#F59E0B', dark: '#FBBF24', textLight: '#B45309', textDark: '#FEF3C7' },
  Inoperante: { light: '#EF4444', dark: '#F87171', textLight: '#B91C1C', textDark: '#FEE2E2' },
  UsoLimitado: { light: '#6366F1', dark: '#818CF8', textLight: '#4338CA', textDark: '#E0E7FF' },
};

function getUltimosSeisMesesLabels() {
  const labels = [];
  const hoje = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    labels.push(`${MESES_NOMES[getMonth(data)]}/${getYear(data).toString().slice(-2)}`);
  }

  return labels;
}

function adaptarStatusEquipamentos(statusEquipamentosGroups = []) {
  return {
    labels: statusEquipamentosGroups.map((group) => group.status),
    data: statusEquipamentosGroups.map((group) => group._count.id),
    colorsLight: statusEquipamentosGroups.map(
      (group) => STATUS_CORES[group.status]?.light || '#A8A29E'
    ),
    colorsDark: statusEquipamentosGroups.map(
      (group) => STATUS_CORES[group.status]?.dark || '#A8A29E'
    ),
    textColorsLight: statusEquipamentosGroups.map(
      (group) => STATUS_CORES[group.status]?.textLight || '#A8A29E'
    ),
    textColorsDark: statusEquipamentosGroups.map(
      (group) => STATUS_CORES[group.status]?.textDark || '#A8A29E'
    ),
  };
}

function adaptarManutencoesPorMes(manutencoesDosUltimos6Meses = []) {
  const labelsMeses = getUltimosSeisMesesLabels();

  const manutencoesAgrupadas = labelsMeses.reduce((acc, label) => {
    acc[label] = {};
    TIPOS_MANUTENCAO.forEach((tipo) => {
      acc[label][tipo] = 0;
    });
    return acc;
  }, {});

  manutencoesDosUltimos6Meses.forEach((manutencao) => {
    if (!manutencao.createdAt || !manutencao.tipo) return;

    const chaveMes = `${MESES_NOMES[getMonth(manutencao.createdAt)]}/${getYear(manutencao.createdAt)
      .toString()
      .slice(-2)}`;

    if (chaveMes in manutencoesAgrupadas) {
      manutencoesAgrupadas[chaveMes][manutencao.tipo] += 1;
    }
  });

  return {
    labels: labelsMeses,
    datasets: TIPOS_MANUTENCAO.map((tipo) => ({
      label: tipo,
      data: labelsMeses.map((mes) => manutencoesAgrupadas[mes][tipo] || 0),
    })),
  };
}

export function adaptarDashboardResponse({
  totalEquipamentos,
  manutencoesPendentes,
  contratosVencendo,
  alertasNaoVistosCount,
  statusEquipamentosGroups,
  manutencoesDosUltimos6Meses,
  alertasRecentes,
}) {
  return {
    equipamentosCount: totalEquipamentos,
    manutencoesCount: manutencoesPendentes,
    contratosVencendoCount: contratosVencendo,
    alertasAtivos: alertasNaoVistosCount,
    alertasRecentes,
    statusEquipamentos: adaptarStatusEquipamentos(statusEquipamentosGroups),
    manutencoesPorTipoMes: adaptarManutencoesPorMes(manutencoesDosUltimos6Meses),
  };
}
