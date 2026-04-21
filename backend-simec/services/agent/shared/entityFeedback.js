function buildEntitySuggestionText(suggestions = []) {
  return suggestions
    .slice(0, 4)
    .map((item) =>
      item.secondary
        ? `**${item.label}** (${item.secondary})`
        : `**${item.label}**`
    )
    .join(', ');
}

export function construirFeedbackResolucaoEntidades({
  entityResolution,
  intent,
}) {
  const unidade = entityResolution?.unidade;
  const equipamento = entityResolution?.equipamento;

  if (unidade?.status === 'not_found') {
    const sugestoes = buildEntitySuggestionText(unidade.suggestions);
    return {
      mensagem: sugestoes
        ? `Não encontrei a unidade informada. Você quis dizer ${sugestoes}?`
        : 'Não encontrei a unidade informada. Pode escrever novamente como ela está cadastrada?',
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'ENTITY_NOT_FOUND',
        target: 'unidade',
        suggestions: unidade.suggestions,
      },
    };
  }

  if (unidade?.status === 'low_confidence') {
    return {
      mensagem: `Encontrei uma unidade parecida: **${unidade.matches[0]?.label}**. Confirma que é essa unidade?`,
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'LOW_CONFIDENCE_MATCH',
        target: 'unidade',
        suggestions: unidade.suggestions,
      },
    };
  }

  if (unidade?.status === 'ambiguous') {
    return {
      mensagem: `Encontrei mais de uma unidade compatível. Qual delas você deseja? ${unidade.matches
        .map((item) =>
          item.secondary
            ? `**${item.label}** (${item.secondary})`
            : `**${item.label}**`
        )
        .join(', ')}`,
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'ENTITY_AMBIGUOUS',
        target: 'unidade',
        suggestions: unidade.matches,
      },
    };
  }

  if (equipamento?.status === 'not_found') {
    const sugestoes = buildEntitySuggestionText(equipamento.suggestions);
    return {
      mensagem: sugestoes
        ? `Não encontrei esse equipamento. Você quis dizer ${sugestoes}?`
        : 'Não encontrei esse equipamento. Pode informar o modelo ou a TAG como está no cadastro?',
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'ENTITY_NOT_FOUND',
        target: 'equipamento',
        suggestions: equipamento.suggestions,
      },
    };
  }

  if (equipamento?.status === 'low_confidence') {
    return {
      mensagem: `Encontrei um equipamento parecido: **${equipamento.matches[0]?.label}**${equipamento.matches[0]?.secondary ? ` (${equipamento.matches[0].secondary})` : ''}. Confirma que é esse?`,
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'LOW_CONFIDENCE_MATCH',
        target: 'equipamento',
        suggestions: equipamento.suggestions,
      },
    };
  }

  if (equipamento?.status === 'ambiguous') {
    return {
      mensagem: `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${equipamento.matches
        .map(
          (item) =>
            item.secondary
              ? `**${item.label}** (${item.secondary})`
              : `**${item.label}**`
        )
        .join(', ')}`,
      meta: {
        intent,
        entityStatus: entityResolution,
        reason: 'ENTITY_AMBIGUOUS',
        target: 'equipamento',
        suggestions: equipamento.matches,
      },
    };
  }

  return null;
}
