const STATUS_OS_LABELS = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  AguardandoTerceiro: 'Aguardando terceiro',
  Concluida: 'Concluída',
};

const TIPO_OS_LABELS = {
  Ocorrencia: 'Ocorrência',
  Corretiva: 'Corretiva',
};

const STATUS_EQUIPAMENTO_LABELS = {
  Operante: 'Operante',
  Inoperante: 'Inoperante',
  UsoLimitado: 'Uso limitado',
  EmManutencao: 'Em manutenção',
  Desativado: 'Desativado',
};

const STATUS_VISITA_LABELS = {
  Agendada: 'Agendada',
  EmExecucao: 'Em execução',
  Concluida: 'Concluída',
  PrazoEstendido: 'Prazo estendido',
};

function adaptarVisita(visita) {
  return {
    ...visita,
    statusLabel: STATUS_VISITA_LABELS[visita.status] || visita.status,
  };
}

function adaptarNota(nota) {
  return {
    id: nota.id,
    nota: nota.nota,
    data: nota.data,
    tecnicoNome: nota.tecnicoNome || nota.autor?.nome || 'Técnico',
    origem: nota.origem,
  };
}

export function adaptarOsCorretivaResponse(os) {
  if (!os) return null;

  return {
    ...os,
    statusLabel: STATUS_OS_LABELS[os.status] || os.status,
    tipoLabel: TIPO_OS_LABELS[os.tipo] || os.tipo,
    statusEquipamentoAberturaLabel: STATUS_EQUIPAMENTO_LABELS[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura,
    statusAtualEquipamentoLabel: STATUS_EQUIPAMENTO_LABELS[os.equipamento?.status] || os.equipamento?.status || null,
    notas: (os.notas || []).map(adaptarNota),
    visitas: (os.visitas || []).map(adaptarVisita),
    timeline: buildTimeline(os),
  };
}

export function adaptarListaOsCorretivasResponse(items) {
  return items.map((os) => ({
    ...os,
    statusLabel: STATUS_OS_LABELS[os.status] || os.status,
    tipoLabel: TIPO_OS_LABELS[os.tipo] || os.tipo,
    ultimaVisita: os.visitas?.[0] ? adaptarVisita(os.visitas[0]) : null,
    totalNotas: os._count?.notas ?? 0,
    totalVisitas: os._count?.visitas ?? 0,
  }));
}

function buildTimeline(os) {
  const eventos = [];

  eventos.push({
    tipo: 'abertura',
    dataHora: os.dataHoraAbertura,
    titulo: `OS aberta — Status do equipamento: ${STATUS_EQUIPAMENTO_LABELS[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura}`,
    descricao: `Solicitante: ${os.solicitante}. Problema: ${os.descricaoProblema}`,
    meta: { solicitante: os.solicitante },
  });

  for (const nota of os.notas || []) {
    eventos.push({
      tipo: 'nota',
      dataHora: nota.data,
      titulo: `Nota de andamento — ${nota.tecnicoNome || nota.autor?.nome || 'Técnico'}`,
      descricao: nota.nota,
      meta: { tecnicoNome: nota.tecnicoNome || nota.autor?.nome },
    });
  }

  const visitas = os.visitas || [];

  // If promoted to Corretiva, mark the moment (first visit creation)
  if (os.tipo === 'Corretiva' && visitas.length > 0) {
    const primeiraVisita = visitas.reduce((a, b) =>
      new Date(a.createdAt) < new Date(b.createdAt) ? a : b
    );
    eventos.push({
      tipo: 'promovida_corretiva',
      dataHora: primeiraVisita.createdAt,
      titulo: 'Ocorrência promovida a OS Corretiva',
      descricao: `Visita de terceiro agendada com ${primeiraVisita.prestadorNome}. A ocorrência passou a ser tratada como OS Corretiva.`,
      meta: { prestadorNome: primeiraVisita.prestadorNome },
    });
  }

  for (const visita of visitas) {
    eventos.push({
      tipo: 'visita_agendada',
      dataHora: visita.createdAt,
      titulo: `Visita agendada — ${visita.prestadorNome}`,
      descricao: `Previsão: ${new Date(visita.dataHoraInicioPrevista).toLocaleString('pt-BR')} até ${new Date(visita.dataHoraFimPrevista).toLocaleString('pt-BR')}`,
      meta: { visitaId: visita.id, prestadorNome: visita.prestadorNome, status: visita.status },
    });

    if (visita.resultado) {
      eventos.push({
        tipo: 'resultado_visita',
        dataHora: visita.updatedAt,
        titulo: `Resultado da visita — ${STATUS_VISITA_LABELS[visita.status] || visita.status}`,
        descricao: visita.observacoes || `Resultado: ${visita.resultado}`,
        meta: { visitaId: visita.id, resultado: visita.resultado },
      });
    }
  }

  if (os.status === 'Concluida' && os.dataHoraConclusao) {
    eventos.push({
      tipo: 'conclusao',
      dataHora: os.dataHoraConclusao,
      titulo: 'OS concluída — Equipamento Operante',
      descricao: os.observacoesFinais || 'Manutenção corretiva encerrada.',
      meta: { statusFinal: 'Operante' },
    });
  }

  eventos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));
  return eventos;
}
