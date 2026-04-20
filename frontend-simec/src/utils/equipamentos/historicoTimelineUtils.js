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

  return metadata?.tecnico || metadata?.tecnicoResolucao || item?.origem || 'sistema';
}

function getDetalhesComplementares(item, metadata) {
  const detalhes = [];

  if (metadata?.numeroOS) {
    detalhes.push({ label: 'OS', value: metadata.numeroOS });
  }

  if (metadata?.numeroChamado) {
    detalhes.push({ label: 'Chamado', value: metadata.numeroChamado });
  }

  if (item.subcategoria) {
    detalhes.push({ label: 'Categoria', value: item.subcategoria });
  }

  if (item.status) {
    detalhes.push({ label: 'Status', value: item.status });
  }

  if (item.origem) {
    detalhes.push({ label: 'Origem', value: item.origem });
  }

  return detalhes;
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
    origem: item.origem || metadata?.origem || null,
    status: item.status || 'Registrado',
    isOS: item.referenciaTipo === 'manutencao',
    referenciaTipo: item.referenciaTipo || null,
    referenciaId: item.referenciaId || null,
    metadata,
    impactaAnalise: Boolean(item.impactaAnalise),
    detalhesComplementares: getDetalhesComplementares(item, metadata),
  };
}

export function buildHistoricoTimeline({ eventos = [] }) {
  const unificado = (eventos || []).map(mapHistoricoEvento);
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
  if (item.subcategoria === 'Preventiva') return 'bg-emerald-50 text-emerald-500';
  if (item.subcategoria === 'Calibracao') return 'bg-blue-50 text-blue-500';
  if (item.subcategoria === 'Inspecao') return 'bg-amber-50 text-amber-500';
  if (item.categoriaBase === 'ocorrencia') return 'bg-orange-50 text-orange-500';
  if (item.categoriaBase === 'transferencia_unidade') return 'bg-indigo-50 text-indigo-500';
  if (item.categoriaBase === 'instalacao') return 'bg-cyan-50 text-cyan-500';
  if (item.categoriaBase === 'status_operacional') return 'bg-violet-50 text-violet-500';
  return 'bg-slate-50 text-slate-500';
}

export function formatarResumoHistorico({ linhaDoTempo, totalFiltrado }) {
  return `Exibindo ${linhaDoTempo.length} de ${totalFiltrado} registro(s) filtrado(s).`;
}

export { formatarDataHora };
