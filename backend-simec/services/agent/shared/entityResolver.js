import prisma from '../../prismaService.js';
import {
  buildResolutionBase,
  expandirSinonimosEquipamento,
  avaliarCandidato,
  resolveFromCandidates,
} from './entityScoring.js';

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
      const unidade = unidades.find(
        (item) => item.id === unidadeResolution.matches[0]?.id
      );

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
    const normalizedQueries =
      sinonimos.length > 0 ? sinonimos : [novo.equipamentoTexto];

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

      if (top.score >= 0.94 && gap >= 0.08) {
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
      } else if (top.score >= 0.76 && gap >= 0.12) {
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
          label:
            novo.equipamentoNome ||
            novo.modelo ||
            novo.equipamentoTexto ||
            'Equipamento',
          secondary: novo.tag ? `TAG ${novo.tag}` : null,
        },
      ],
    };
  }

  return novo;
}
