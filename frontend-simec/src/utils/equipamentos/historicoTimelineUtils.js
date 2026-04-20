import { formatarDataHora } from '@/utils/timeUtils';

function parseJsonIfNeeded(metadata) {
  if (!metadata) return null;
  if (typeof metadata === 'object') return metadata;

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function getCategoriaLabel(categoria, subcategoria) {
  if (categoria === 'manutencao' && subcategoria) return subcategoria;
  if (categoria === 'ocorrencia') return 'Ocorrencia';
  if (categoria === 'instalacao') return 'Instalacao';
  if (categoria === 'transferencia_unidade') return 'Transferencia';
  if (categoria === 'alteracao_cadastral') return 'Alteracao';
  if (categoria === 'status_operacional') return 'Status';
  return categoria || 'Evento';
}

function getResponsavelLabel(item) {
  const metadata = parseJsonIfNeeded(item.metadata);

  return (
    metadata?.tecnico ||
    metadata?.tecnicoResolucao ||
    item?.origem ||
    'sistema'
  );
}

function mapHistoricoEvento(item) {
  const metadata = parseJsonIfNeeded(item.metadata);

  return {
    uniqueId: `hist-${item.id}`,
    idOriginal: item.referenciaId || item.id,
    data: item.dataEvento,
    tipo: item.tipoEvento,
    categoria: getCategoriaLabel(item.categoria, item.subcategoria),
    categoriaBase: item.categoria,
    subcategoria: item.subcategoria || null,
    titulo: item.titulo,
    chamado: metadata?.numeroChamado || null,
    descricao: item.descricao,
    responsavel: getResponsavelLabel(item),
    status: item.status || 'Registrado',
    isOS: item.referenciaTipo === 'manutencao',
    referenciaTipo: item.referenciaTipo || null,
    referenciaId: item.referenciaId || null,
    metadata,
    impactaAnalise: Boolean(item.impactaAnalise),
  };
}

function filtrarPorTipo(item, filtroTipo) {
  if (filtroTipo === 'Todos') return true;
  if (filtroTipo === 'Corretiva') return item.subcategoria === 'Corretiva';
  if (filtroTipo === 'Preventiva') return item.subcategoria === 'Preventiva';
  if (filtroTipo === 'Ocorrencia') return item.categoriaBase === 'ocorrencia';
  if (filtroTipo === 'Transferencia') {
    return item.categoriaBase === 'transferencia_unidade';
  }
  if (filtroTipo === 'Alteracao') {
    return item.categoriaBase === 'alteracao_cadastral';
  }
  if (filtroTipo === 'Instalacao') return item.categoriaBase === 'instalacao';

  return true;
}

export function buildHistoricoTimeline({
  eventos = [],
}) {
  let unificado = (eventos || []).map(mapHistoricoEvento);
  const totalSemFiltro = unificado.length;

  unificado.sort((a, b) => new Date(b.data) - new Date(a.data));

  return {
    linhaDoTempo: unificado,
    totalFiltrado: unificado.length,
    totalSemFiltro,
    temFiltroAtivo: false,
  };
}

export function mapFiltroHistoricoParaQuery(filtroTipo) {
  if (filtroTipo === 'Ocorrencia') {
    return {
      categoria: 'ocorrencia',
    };
  }

  if (filtroTipo === 'Transferencia') {
    return {
      categoria: 'transferencia_unidade',
    };
  }

  if (filtroTipo === 'Alteracao') {
    return {
      categoria: 'alteracao_cadastral',
    };
  }

  if (filtroTipo === 'Instalacao') {
    return {
      categoria: 'instalacao',
    };
  }

  if (filtroTipo === 'Preventiva' || filtroTipo === 'Corretiva') {
    return {
      categoria: 'manutencao',
      subcategoria: filtroTipo,
    };
  }

  return {};
}

export function getCategoriaBadgeClass(item) {
  if (item.subcategoria === 'Corretiva') return 'badge badge-red';
  if (item.subcategoria === 'Preventiva') return 'badge badge-green';
  if (item.subcategoria === 'Calibracao') return 'badge badge-blue';
  if (item.subcategoria === 'Inspecao') return 'badge badge-yellow';
  if (item.categoriaBase === 'ocorrencia') return 'badge badge-orange';
  if (item.categoriaBase === 'transferencia_unidade') return 'badge badge-indigo';
  if (item.categoriaBase === 'instalacao') return 'badge badge-cyan';
  if (item.categoriaBase === 'alteracao_cadastral') return 'badge badge-slate';
  if (item.categoriaBase === 'status_operacional') return 'badge badge-purple';
  return 'badge badge-slate';
}

export function getTimelineBorderClass(item) {
  if (item.subcategoria === 'Corretiva') return 'border-l-red-500';
  if (item.subcategoria === 'Preventiva') return 'border-l-emerald-500';
  if (item.subcategoria === 'Calibracao') return 'border-l-blue-500';
  if (item.subcategoria === 'Inspecao') return 'border-l-amber-500';
  if (item.categoriaBase === 'ocorrencia') return 'border-l-orange-500';
  if (item.categoriaBase === 'transferencia_unidade') return 'border-l-indigo-500';
  if (item.categoriaBase === 'instalacao') return 'border-l-cyan-500';
  if (item.categoriaBase === 'status_operacional') return 'border-l-violet-500';
  return 'border-l-slate-400';
}

export function getTimelineIconClass(item) {
  if (item.subcategoria === 'Corretiva') return 'bg-red-50 text-red-500';
  if (item.subcategoria === 'Preventiva') {
    return 'bg-emerald-50 text-emerald-500';
  }
  if (item.subcategoria === 'Calibracao') return 'bg-blue-50 text-blue-500';
  if (item.subcategoria === 'Inspecao') return 'bg-amber-50 text-amber-500';
  if (item.categoriaBase === 'ocorrencia') return 'bg-orange-50 text-orange-500';
  if (item.categoriaBase === 'transferencia_unidade') {
    return 'bg-indigo-50 text-indigo-500';
  }
  if (item.categoriaBase === 'instalacao') return 'bg-cyan-50 text-cyan-500';
  if (item.categoriaBase === 'status_operacional') {
    return 'bg-violet-50 text-violet-500';
  }
  return 'bg-slate-50 text-slate-500';
}

export function formatarResumoHistorico({
  linhaDoTempo,
  totalFiltrado,
}) {
  return `Exibindo ${linhaDoTempo.length} de ${totalFiltrado} registro(s) filtrado(s).`;
}

export { formatarDataHora };
