import { normalizarTexto } from '../../shared/textUtils.js';

export function tokenizar(texto = '') {
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

export function similarity(a = '', b = '') {
  const normalA = normalizarTexto(a);
  const normalB = normalizarTexto(b);

  if (!normalA || !normalB) return 0;
  if (normalA === normalB) return 1;

  const maxLen = Math.max(normalA.length, normalB.length);
  return 1 - levenshtein(normalA, normalB) / maxLen;
}

export function expandirSinonimosEquipamento(texto = '') {
  const t = normalizarTexto(texto);
  const sinonimos = new Set();

  if (t) sinonimos.add(t);

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

export function avaliarCandidato(query, fields = []) {
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

    const fieldTokens = tokenizar(normalizedField);

    if (fieldTokens.some((token) => token === normalizedQuery)) {
      melhorScore = Math.max(melhorScore, 0.8);
    }

    if (
      normalizedField.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedField)
    ) {
      melhorScore = Math.max(melhorScore, 0.76);
    }

    if (tokens.length > 0 && tokens.every((token) => normalizedField.includes(token))) {
      melhorScore = Math.max(melhorScore, 0.84);
    }

    melhorScore = Math.max(melhorScore, similarity(normalizedQuery, normalizedField));
  }

  return melhorScore;
}

export function buildResolutionBase(query) {
  return {
    query: query || null,
    status: 'empty',
    confidence: 0,
    matches: [],
    suggestions: [],
    reason: null,
  };
}

export function resolveFromCandidates({
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

  if (top.score >= 0.94 && gap >= 0.08) {
    resolution.status = 'resolved';
    resolution.confidence = Number(top.score.toFixed(2));
    resolution.matches = [toSuggestion(top.candidate)];
    return resolution;
  }

  if (top.score >= 0.76 && gap >= 0.12) {
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
