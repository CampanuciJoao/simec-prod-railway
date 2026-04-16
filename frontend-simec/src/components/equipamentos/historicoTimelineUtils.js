import { formatarDataHora } from '@/utils/timeUtils';

export function buildHistoricoTimeline({
  historicoBruto,
  dataInicio,
  dataFim,
  filtroTipo,
}) {
  const manutencoes = (historicoBruto?.manutencoes || []).map((item) => ({
    uniqueId: `os-${item.id}`,
    idOriginal: item.id,
    data: item.dataConclusao || item.dataHoraAgendamentoInicio,
    tipo: 'Manutenção',
    categoria: item.tipo,
    titulo: `OS: ${item.numeroOS}`,
    chamado: item.numeroChamado,
    descricao: item.descricaoProblemaServico,
    responsavel: item.tecnicoResponsavel || 'N/A',
    status: item.status,
    isOS: true,
    anexos: item.anexos || [],
  }));

  const ocorrencias = (historicoBruto?.ocorrencias || []).map((item) => ({
    uniqueId: `oc-${item.id}`,
    idOriginal: item.id,
    data: item.dataResolucao || item.data,
    tipo: 'Ocorrência',
    categoria: 'Evento',
    titulo: item.titulo,
    chamado: null,
    descricao: item.descricao,
    responsavel: item.tecnicoResolucao || item.tecnico || 'N/A',
    status: item.resolvido ? 'Resolvido' : 'Pendente',
    isOS: false,
    solucao: item.solucao,
  }));

  let unificado = [...manutencoes, ...ocorrencias];
  const totalSemFiltro = unificado.length;

  if (filtroTipo !== 'Todos') {
    if (filtroTipo === 'Evento') {
      unificado = unificado.filter((item) => !item.isOS);
    } else {
      unificado = unificado.filter((item) => item.categoria === filtroTipo);
    }
  }

  if (dataInicio) {
    unificado = unificado.filter(
      (item) => new Date(item.data) >= new Date(`${dataInicio}T00:00:00`)
    );
  }

  if (dataFim) {
    unificado = unificado.filter(
      (item) => new Date(item.data) <= new Date(`${dataFim}T23:59:59`)
    );
  }

  unificado.sort((a, b) => new Date(b.data) - new Date(a.data));

  const temFiltroAtivo = Boolean(
    dataInicio || dataFim || filtroTipo !== 'Todos'
  );

  const linhaDoTempo = !temFiltroAtivo ? unificado.slice(0, 20) : unificado;

  return {
    linhaDoTempo,
    totalFiltrado: unificado.length,
    totalSemFiltro,
    temFiltroAtivo,
  };
}

export function getCategoriaBadgeClass(item) {
  if (item.isOS) {
    if (item.categoria === 'Corretiva') return 'badge badge-red';
    if (item.categoria === 'Preventiva') return 'badge badge-green';
    if (item.categoria === 'Calibracao') return 'badge badge-blue';
    if (item.categoria === 'Inspecao') return 'badge badge-yellow';
    return 'badge badge-slate';
  }

  if (item.status === 'Pendente') return 'badge badge-red';
  if (item.status === 'Resolvido') return 'badge badge-green';

  return 'badge badge-slate';
}

export function getTimelineBorderClass(item) {
  if (item.isOS) {
    if (item.categoria === 'Corretiva') return 'border-l-red-500';
    if (item.categoria === 'Preventiva') return 'border-l-emerald-500';
    if (item.categoria === 'Calibracao') return 'border-l-blue-500';
    if (item.categoria === 'Inspecao') return 'border-l-amber-500';
    return 'border-l-slate-400';
  }

  return item.status === 'Pendente'
    ? 'border-l-red-500'
    : 'border-l-emerald-500';
}

export function getTimelineIconClass(item) {
  if (item.isOS) {
    if (item.categoria === 'Corretiva') return 'bg-red-50 text-red-500';
    if (item.categoria === 'Preventiva')
      return 'bg-emerald-50 text-emerald-500';
    if (item.categoria === 'Calibracao') return 'bg-blue-50 text-blue-500';
    if (item.categoria === 'Inspecao') return 'bg-amber-50 text-amber-500';
    return 'bg-slate-50 text-slate-500';
  }

  return item.status === 'Pendente'
    ? 'bg-red-50 text-red-500'
    : 'bg-emerald-50 text-emerald-500';
}

export function formatarResumoHistorico({
  linhaDoTempo,
  totalFiltrado,
}) {
  return `Exibindo ${linhaDoTempo.length} de ${totalFiltrado} registro(s) filtrado(s).`;
}

export { formatarDataHora };