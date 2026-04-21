import prisma from '../../prismaService.js';

function normalizarTexto(texto = '') {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenizar(texto = '') {
  return normalizarTexto(texto)
    .split(/[\s/-]+/)
    .filter(Boolean);
}

function levenshtein(a = '', b = '') {
  const s = normalizarTexto(a);
  const t = normalizarTexto(b);

  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const matrix = Array.from({ length: t.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= s.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= t.length; i += 1) {
    for (let j = 1; j <= s.length; j += 1) {
      if (t.charAt(i - 1) === s.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[t.length][s.length];
}

function similarity(a = '', b = '') {
  const normalA = normalizarTexto(a);
  const normalB = normalizarTexto(b);

  if (!normalA || !normalB) return 0;
  if (normalA === normalB) return 1;

  const maxLen = Math.max(normalA.length, normalB.length);
  return 1 - levenshtein(normalA, normalB) / maxLen;
}

function expandirSinonimosEquipamento(texto = '') {
  const t = normalizarTexto(texto);
  const sinonimos = new Set();

  if (t) {
    sinonimos.add(t);
  }

  if (/\b(rm|rnm|ressonancia magnetica|ressonancia)\b/.test(t)) {
    ['ressonancia', 'ressonancia magnetica', 'rm', 'rnm'].forEach((item) =>
      sinonimos.add(item)
    );
  }

  if (/\b(tc|ct|tomografia|tomografo|tomografia computadorizada)\b/.test(t)) {
    ['tomografia', 'tomografo', 'tc', 'ct', 'tomografia computadorizada'].forEach(
      (item) => sinonimos.add(item)
    );
  }

  if (/\b(rx|raio x|raio-x|radiografia)\b/.test(t)) {
    ['raio x', 'raio-x', 'radiografia', 'rx'].forEach((item) =>
      sinonimos.add(item)
    );
  }

  if (/\b(us|uss|ultrassom|ultrasonografia|ultra)\b/.test(t)) {
    ['ultrassom', 'ultrasonografia', 'us', 'uss', 'ultra'].forEach((item) =>
      sinonimos.add(item)
    );
  }

  if (/\b(dr|radiografia digital)\b/.test(t)) {
    ['dr', 'radiografia digital'].forEach((item) => sinonimos.add(item));
  }

  if (/\b(mamografia|mamografo|mammo)\b/.test(t)) {
    ['mamografia', 'mamografo', 'mammo'].forEach((item) =>
      sinonimos.add(item)
    );
  }

  if (/\b(act revolution)\b/.test(t)) {
    ['act revolution', 'tomografia', 'tomografia computadorizada'].forEach(
      (item) => sinonimos.add(item)
    );
  }

  if (/\b(aquilion ct)\b/.test(t)) {
    ['aquilion ct', 'ct', 'tomografia', 'tomografia computadorizada'].forEach(
      (item) => sinonimos.add(item)
    );
  }

  return Array.from(sinonimos);
}

function avaliarCandidato(query, fields = []) {
  const normalizedQuery = normalizarTexto(query);
  if (!normalizedQuery) return 0;

  const tokens = tokenizar(normalizedQuery);
  let melhorScore = 0;

  for (const field of fields) {
    const normalizedField = normalizarTexto(field);
    if (!normalizedField) continue;

    if (normalizedField === normalizedQuery) {
      return 1;
    }

    if (
      normalizedField.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedField)
    ) {
      melhorScore = Math.max(melhorScore, 0.92);
    }

    if (tokens.length > 0 && tokens.every((token) => normalizedField.includes(token))) {
      melhorScore = Math.max(melhorScore, 0.84);
    }

    melhorScore = Math.max(melhorScore, similarity(normalizedQuery, normalizedField));
  }

  return melhorScore;
}

function buildResolutionBase(query) {
  return {
    query: query || null,
    status: 'empty',
    confidence: 0,
    matches: [],
    suggestions: [],
    reason: null,
  };
}

function resolveFromCandidates({
  query,
  candidates,
  toFields,
  toSuggestion,
}) {
  const resolution = buildResolutionBase(query);
  const normalizedQuery = normalizarTexto(query);

  if (!normalizedQuery) {
    return resolution;
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: avaliarCandidato(query, toFields(candidate)),
    }))
    .filter((item) => item.score > 0.42)
    .sort((a, b) => b.score - a.score);

  const suggestions = ranked.slice(0, 4).map(({ candidate, score }) => ({
    ...toSuggestion(candidate),
    confidence: Number(score.toFixed(2)),
  }));

  resolution.suggestions = suggestions;

  if (ranked.length === 0) {
    resolution.status = 'not_found';
    resolution.reason = 'ENTITY_NOT_FOUND';
    return resolution;
  }

  const top = ranked[0];
  const segundo = ranked[1];
  const gap = top.score - (segundo?.score || 0);

  if (top.score >= 0.9 && gap >= 0.05) {
    resolution.status = 'resolved';
    resolution.confidence = Number(top.score.toFixed(2));
    resolution.matches = [toSuggestion(top.candidate)];
    return resolution;
  }

  if (top.score >= 0.75 && gap >= 0.14) {
    resolution.status = 'low_confidence';
    resolution.confidence = Number(top.score.toFixed(2));
    resolution.matches = [toSuggestion(top.candidate)];
    resolution.reason = 'LOW_CONFIDENCE_MATCH';
    return resolution;
  }

  resolution.status = 'ambiguous';
  resolution.confidence = Number(top.score.toFixed(2));
  resolution.matches = ranked.slice(0, 5).map(({ candidate, score }) => ({
    ...toSuggestion(candidate),
    confidence: Number(score.toFixed(2)),
  }));
  resolution.reason = 'ENTITY_AMBIGUOUS';
  return resolution;
}

function normalizeUnidadeSuggestion(unidade) {
  return {
    id: unidade.id,
    label: unidade.nomeSistema,
    secondary: unidade.nomeFantasia || unidade.cidade || null,
    nomeSistema: unidade.nomeSistema,
  };
}

function normalizeEquipamentoSuggestion(equipamento) {
  return {
    id: equipamento.id,
    label: equipamento.modelo,
    secondary: [
      equipamento.tag ? `TAG ${equipamento.tag}` : null,
      equipamento.unidade?.nomeSistema || null,
    ]
      .filter(Boolean)
      .join(' • '),
    modelo: equipamento.modelo,
    tag: equipamento.tag || null,
    unidade: equipamento.unidade?.nomeSistema || null,
    tipoEquipamento: equipamento.tipo || null,
  };
}

export async function resolverEntidades(estado, tenantId) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO_PARA_RESOLVER_ENTIDADES');
  }

  const novo = {
    ...estado,
    entityResolution: {
      unidade: buildResolutionBase(estado?.unidadeTexto),
      equipamento: buildResolutionBase(estado?.equipamentoTexto),
    },
  };

  delete novo.ambiguidadeEquipamento;

  if (novo.unidadeTexto && !novo.unidadeId) {
    const unidades = await prisma.unidade.findMany({
      where: { tenantId },
      select: {
        id: true,
        nomeSistema: true,
        nomeFantasia: true,
        cidade: true,
      },
      take: 50,
    });

    const unidadeResolution = resolveFromCandidates({
      query: novo.unidadeTexto,
      candidates: unidades,
      toFields: (unidade) => [
        unidade.nomeSistema,
        unidade.nomeFantasia,
        unidade.cidade,
      ],
      toSuggestion: normalizeUnidadeSuggestion,
    });

    novo.entityResolution.unidade = unidadeResolution;

    if (unidadeResolution.status === 'resolved') {
      const unidade = unidades.find((item) => item.id === unidadeResolution.matches[0]?.id);
      if (unidade) {
        novo.unidadeId = unidade.id;
        novo.unidadeNome = unidade.nomeSistema;
      }
    }
  } else if (novo.unidadeId) {
    novo.entityResolution.unidade = {
      ...novo.entityResolution.unidade,
      status: 'resolved',
      confidence: 1,
      matches: [
        {
          id: novo.unidadeId,
          label: novo.unidadeNome || novo.unidadeTexto || 'Unidade',
        },
      ],
    };
  }

  if (novo.equipamentoTexto && !novo.equipamentoId) {
    const sinonimos = expandirSinonimosEquipamento(novo.equipamentoTexto);
    const normalizedQueries = sinonimos.length > 0 ? sinonimos : [novo.equipamentoTexto];

    const equipamentos = await prisma.equipamento.findMany({
      where: {
        tenantId,
        ...(novo.unidadeId ? { unidadeId: novo.unidadeId } : {}),
      },
      select: {
        id: true,
        modelo: true,
        tag: true,
        tipo: true,
        fabricante: true,
        unidade: {
          select: {
            nomeSistema: true,
          },
        },
      },
      take: 100,
    });

    const ranking = equipamentos
      .map((equipamento) => {
        const score = Math.max(
          ...normalizedQueries.map((query) =>
            avaliarCandidato(query, [
              equipamento.tag,
              equipamento.modelo,
              equipamento.tipo,
              equipamento.fabricante,
            ])
          )
        );

        return { equipamento, score };
      })
      .filter((item) => item.score > 0.42)
      .sort((a, b) => b.score - a.score);

    const suggestions = ranking.slice(0, 5).map(({ equipamento, score }) => ({
      ...normalizeEquipamentoSuggestion(equipamento),
      confidence: Number(score.toFixed(2)),
    }));

    if (ranking.length === 0) {
      novo.entityResolution.equipamento = {
        query: novo.equipamentoTexto,
        status: 'not_found',
        confidence: 0,
        matches: [],
        suggestions,
        reason: 'ENTITY_NOT_FOUND',
      };
    } else {
      const top = ranking[0];
      const segundo = ranking[1];
      const gap = top.score - (segundo?.score || 0);

      if (top.score >= 0.9 && gap >= 0.05) {
        novo.equipamentoId = top.equipamento.id;
        novo.equipamentoNome = top.equipamento.modelo;
        novo.modelo = top.equipamento.modelo;
        novo.tag = top.equipamento.tag || null;
        novo.tipoEquipamento = top.equipamento.tipo || null;

        if (!novo.unidadeNome && top.equipamento.unidade?.nomeSistema) {
          novo.unidadeNome = top.equipamento.unidade.nomeSistema;
        }

        novo.entityResolution.equipamento = {
          query: novo.equipamentoTexto,
          status: 'resolved',
          confidence: Number(top.score.toFixed(2)),
          matches: [normalizeEquipamentoSuggestion(top.equipamento)],
          suggestions,
          reason: null,
        };
      } else if (top.score >= 0.75 && gap >= 0.14) {
        novo.entityResolution.equipamento = {
          query: novo.equipamentoTexto,
          status: 'low_confidence',
          confidence: Number(top.score.toFixed(2)),
          matches: [normalizeEquipamentoSuggestion(top.equipamento)],
          suggestions,
          reason: 'LOW_CONFIDENCE_MATCH',
        };
      } else {
        const ambiguos = ranking.slice(0, 5).map(({ equipamento, score }) => ({
          ...normalizeEquipamentoSuggestion(equipamento),
          modelo: equipamento.modelo,
          tag: equipamento.tag,
          tipoEquipamento: equipamento.tipo || null,
          unidade: equipamento.unidade?.nomeSistema || novo.unidadeNome || null,
          confidence: Number(score.toFixed(2)),
        }));

        novo.ambiguidadeEquipamento = ambiguos;
        novo.entityResolution.equipamento = {
          query: novo.equipamentoTexto,
          status: 'ambiguous',
          confidence: Number(top.score.toFixed(2)),
          matches: ambiguos,
          suggestions,
          reason: 'ENTITY_AMBIGUOUS',
        };
      }
    }
  } else if (novo.equipamentoId) {
    novo.entityResolution.equipamento = {
      ...novo.entityResolution.equipamento,
      status: 'resolved',
      confidence: 1,
      matches: [
        {
          id: novo.equipamentoId,
          label: novo.equipamentoNome || novo.modelo || novo.equipamentoTexto || 'Equipamento',
          secondary: novo.tag ? `TAG ${novo.tag}` : null,
        },
      ],
    };
  }

  return novo;
}
