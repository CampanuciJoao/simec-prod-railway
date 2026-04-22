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

function getDescricaoPrincipal(item, metadata, referenciaDetalhes) {
  return (
    item.descricao ||
    referenciaDetalhes?.descricaoProblemaServico ||
    referenciaDetalhes?.descricao ||
    referenciaDetalhes?.solucao ||
    metadata?.observacao ||
    'Sem detalhes informados.'
  );
}

function getResumoOperacional(item, metadata, referenciaDetalhes) {
  const resumo = [];

  if (referenciaDetalhes?.tecnicoResponsavel) {
    resumo.push({ label: 'Tecnico', value: referenciaDetalhes.tecnicoResponsavel });
  }

  if (referenciaDetalhes?.agendamentoLocal?.dataInicio) {
    resumo.push({
      label: 'Inicio previsto',
      value: `${referenciaDetalhes.agendamentoLocal.dataInicio} ${referenciaDetalhes.agendamentoLocal.horaInicio || ''}`.trim(),
    });
  }

  if (referenciaDetalhes?.agendamentoLocal?.dataFim) {
    resumo.push({
      label: 'Fim previsto',
      value: `${referenciaDetalhes.agendamentoLocal.dataFim} ${referenciaDetalhes.agendamentoLocal.horaFim || ''}`.trim(),
    });
  }

  if (referenciaDetalhes?.dataConclusao) {
    resumo.push({
      label: 'Conclusao',
      value: formatarDataHora(referenciaDetalhes.dataConclusao),
    });
  }

  if (referenciaDetalhes?.gravidade) {
    resumo.push({ label: 'Gravidade', value: referenciaDetalhes.gravidade });
  }

  if (referenciaDetalhes?.tecnicoResolucao) {
    resumo.push({
      label: 'Resolvido por',
      value: referenciaDetalhes.tecnicoResolucao,
    });
  }

  if (metadata?.equipamentoOperante === true) {
    resumo.push({ label: 'Resultado', value: 'Equipamento operante' });
  }

  if (metadata?.equipamentoOperante === false) {
    resumo.push({ label: 'Resultado', value: 'Equipamento inoperante' });
  }

  return resumo;
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
  const referenciaDetalhes = item.referenciaDetalhes || null;
  const anexos = Array.isArray(referenciaDetalhes?.anexos)
    ? referenciaDetalhes.anexos
    : [];
  const notasAndamento = Array.isArray(referenciaDetalhes?.notasAndamento)
    ? referenciaDetalhes.notasAndamento
    : [];

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
    descricao: getDescricaoPrincipal(item, metadata, referenciaDetalhes),
    responsavel: getResponsavelLabel(item),
    origem: item.origem || metadata?.origem || null,
    status: item.status || 'Registrado',
    isOS: item.referenciaTipo === 'manutencao',
    referenciaTipo: item.referenciaTipo || null,
    referenciaId: item.referenciaId || null,
    referenciaDetalhes,
    metadata,
    impactaAnalise: Boolean(item.impactaAnalise),
    detalhesComplementares: getDetalhesComplementares(item, metadata),
    resumoOperacional: getResumoOperacional(item, metadata, referenciaDetalhes),
    anexos,
    notasAndamento,
    contagemAnexos: anexos.length,
    contagemNotas: notasAndamento.length,
  };
}

function getTituloGrupo(eventosSorted) {
  const primeiro = eventosSorted[0];
  if (primeiro.categoriaBase === 'manutencao' && primeiro.metadata?.numeroOS) {
    return `OS ${primeiro.metadata.numeroOS}`;
  }
  if (primeiro.categoriaBase === 'ocorrencia') {
    return (
      primeiro.referenciaDetalhes?.titulo ||
      primeiro.referenciaDetalhes?.descricao ||
      primeiro.titulo
    );
  }
  return primeiro.titulo;
}

function mergeEventosGrupo(eventos) {
  const sorted = [...eventos].sort((a, b) => new Date(a.data) - new Date(b.data));
  const latest = sorted[sorted.length - 1];

  return {
    ...latest,
    uniqueId: `grupo-${latest.referenciaTipo}-${latest.referenciaId}`,
    data: latest.data,
    titulo: getTituloGrupo(sorted),
    status: latest.status,
    impactaAnalise: eventos.some((e) => e.impactaAnalise),
    eventos: sorted.map((e) => ({
      uniqueId: e.uniqueId,
      data: e.data,
      status: e.status,
      titulo: e.titulo,
      descricao: e.descricao,
      responsavel: e.responsavel,
    })),
  };
}

export function buildHistoricoTimeline({ eventos = [] }) {
  const mapeados = (eventos || []).map(mapHistoricoEvento);
  const totalSemFiltro = mapeados.length;

  const grupos = new Map();
  const soltos = [];

  for (const evento of mapeados) {
    if (evento.referenciaId && evento.referenciaTipo) {
      const chave = `${evento.referenciaTipo}-${evento.referenciaId}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(evento);
    } else {
      soltos.push(evento);
    }
  }

  const agrupados = [...grupos.values()].map((grupo) =>
    grupo.length > 1 ? mergeEventosGrupo(grupo) : grupo[0]
  );

  const unificado = [...agrupados, ...soltos];
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
