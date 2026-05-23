const STATUS_OS_LABELS = {
  Aberta: 'Aberta',
  EmAndamento: 'Em andamento',
  AguardandoTerceiro: 'Aguardando terceiro',
  Concluida: 'Concluída',
  Cancelada: 'Cancelada',
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

function montarAbertoPor(os) {
  // OsCorretiva ainda não tem o campo origemAbertura (vs. Manutencao);
  // por enquanto, sempre humano via autor. Quando precisarmos distinguir
  // IA em OS corretiva, adicionamos origemAbertura via migration.
  if (os?.autor?.nome) {
    return { tipo: 'humano', label: os.autor.nome };
  }
  return null;
}

export function adaptarOsCorretivaResponse(os) {
  if (!os) return null;

  return {
    ...os,
    statusLabel: STATUS_OS_LABELS[os.status] || os.status,
    tipoLabel: TIPO_OS_LABELS[os.tipo] || os.tipo,
    statusEquipamentoAberturaLabel: STATUS_EQUIPAMENTO_LABELS[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura,
    statusAtualEquipamentoLabel: STATUS_EQUIPAMENTO_LABELS[os.equipamento?.status] || os.equipamento?.status || null,
    abertoPor: montarAbertoPor(os),
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
    abertoPor: montarAbertoPor(os),
    ultimaVisita: os.visitas?.[0] ? adaptarVisita(os.visitas[0]) : null,
    totalNotas: os._count?.notas ?? 0,
    totalVisitas: os._count?.visitas ?? 0,
  }));
}

function buildTimeline(os) {
  const eventos = [];

  // Se a OS foi registrada retroativamente, a timeline usa a hora real do
  // evento; caso contrario, a hora de abertura no sistema.
  const dataHoraEvento = os.dataHoraInicioEvento || os.dataHoraAbertura;
  const isRetroativo = Boolean(os.dataHoraInicioEvento);
  eventos.push({
    tipo: 'abertura',
    dataHora: dataHoraEvento,
    titulo: `OS aberta — Status do equipamento: ${STATUS_EQUIPAMENTO_LABELS[os.statusEquipamentoAbertura] || os.statusEquipamentoAbertura}`,
    descricao: `Solicitante: ${os.solicitante}. Problema: ${os.descricaoProblema}`,
    meta: {
      solicitante: os.solicitante,
      registradoPor: os.autor?.nome || null,
      ...(isRetroativo ? {
        registroRetroativo: true,
        dataHoraRegistro: os.dataHoraAbertura,
      } : {}),
    },
  });

  for (const nota of os.notas || []) {
    const foiEditada = Boolean(nota.editadoEm);
    eventos.push({
      tipo: 'nota',
      id: nota.id,
      dataHora: nota.data,
      titulo: `Nota de andamento — ${nota.tecnicoNome || nota.autor?.nome || 'Técnico'}`,
      descricao: nota.nota,
      meta: {
        tecnicoNome: nota.tecnicoNome || nota.autor?.nome,
        registradoPor: nota.autor?.nome || null,
        ...(foiEditada ? {
          editado: true,
          editadoEm: nota.editadoEm,
          editadoPorNome: nota.editadoPor?.nome || null,
        } : {}),
      },
      editavel: true,
    });
  }

  const visitas = os.visitas || [];

  // Identifica a visita que encerrou a OS (última com resultado, quando OS está Concluída)
  const visitasConcluidas = visitas.filter(v => v.resultado);
  const visitaConclusiva =
    os.status === 'Concluida' && visitasConcluidas.length > 0
      ? visitasConcluidas.reduce((latest, v) =>
          new Date(v.updatedAt) > new Date(latest.updatedAt) ? v : latest
        )
      : null;

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
      descricao: null,
      meta: {
        visitaId: visita.id,
        prestadorNome: visita.prestadorNome,
        status: visita.status,
        dataHoraInicioPrevista: visita.dataHoraInicioPrevista,
        dataHoraFimPrevista: visita.dataHoraFimPrevista,
      },
    });

    if (visita.resultado) {
      const isConclusiva = visitaConclusiva?.id === visita.id;
      eventos.push({
        tipo: 'resultado_visita',
        dataHora: visita.updatedAt,
        titulo: `Resultado da visita — ${STATUS_VISITA_LABELS[visita.status] || visita.status}`,
        descricao: visita.observacoes || `Resultado: ${visita.resultado}`,
        meta: {
          visitaId: visita.id,
          resultado: visita.resultado,
          ...(isConclusiva && {
            isConclusive: true,
            dataHoraAberturaOs: os.dataHoraAbertura,
            dataHoraConclusaoOs: os.dataHoraConclusao,
          }),
        },
      });
    }
  }

  // Conclusão e cancelamento são empurrados ao FIM da timeline depois do
  // sort cronológico — semanticamente representam o encerramento da OS e
  // devem aparecer por último mesmo quando registrados retroativamente
  // com data anterior a outros eventos.
  eventos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  if (os.status === 'Concluida' && os.dataHoraConclusao && !visitaConclusiva) {
    // Conclusão pode ser retroativa: dataHoraFimEvento = hora real, e
    // dataHoraConclusao = momento em que o admin marcou no sistema.
    const dataHoraEventoConclusao = os.dataHoraFimEvento || os.dataHoraConclusao;
    const isConclusaoRetroativa = Boolean(os.dataHoraFimEvento);
    eventos.push({
      tipo: 'conclusao',
      dataHora: dataHoraEventoConclusao,
      titulo: 'OS concluída — Equipamento Operante',
      descricao: os.observacoesFinais || 'Manutenção corretiva encerrada.',
      meta: {
        statusFinal: 'Operante',
        registradoPor: os.concluidoPor?.nome || null,
        ...(isConclusaoRetroativa ? {
          registroRetroativo: true,
          dataHoraRegistro: os.dataHoraConclusao,
        } : {}),
      },
    });
  }

  if (os.status === 'Cancelada' && os.dataHoraCancelamento) {
    eventos.push({
      tipo: 'cancelamento',
      dataHora: os.dataHoraCancelamento,
      titulo: 'OS cancelada',
      descricao: os.motivoCancelamento || 'OS cancelada sem motivo registrado.',
      meta: {
        motivoCancelamento: os.motivoCancelamento,
        registradoPor: os.canceladoPor?.nome || null,
      },
    });
  }

  return eventos;
}
