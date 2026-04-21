import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { UserAgentMemoryRepository } from '../session/userAgentMemoryRepository.js';
import { extrairCamposComIA } from './extractor/index.js';
import { mergeEstadoAgente } from './state/mergeEstadoAgente.js';
import { getFaltantes } from './state/faltantes.js';
import { proximaPergunta } from './ui/perguntas.js';
import { buildResumoConfirmacao } from './ui/resumoBuilder.js';
import { validarHorarioFuturo } from './validators/horarioValidator.js';
import { resolverEntidades } from '../shared/entityResolver.js';
import {
  criarManutencaoNoBanco,
  validarPayloadAgendamentoDoAgente,
} from '../workflow/dbManager.js';
import { validarConflitoAgenda } from '../workflow/agendaValidator.js';
import {
  STEPS,
  inicializarStep,
  determinarProximoStep,
  resetarConfirmacaoSeHouverMudanca,
} from '../workflow/stateMachine.js';
import { getSessionKey } from '../core/sessionKeys.js';

function respostaPadrao(mensagem, extras = {}) {
  return {
    mensagem,
    acao: extras.acao || null,
    contexto: extras.contexto || null,
    meta: extras.meta || null,
  };
}

function mensagemEhConfirmacaoPositiva(msg) {
  return ['sim', 'confirmar', 'ok', 'pode', 'pode sim'].includes(msg);
}

function mensagemEhConfirmacaoNegativa(msg) {
  return ['não', 'nao', 'cancelar', 'cancela', 'parar', 'negativo'].includes(
    msg
  );
}

function detectarSeHouveCorrecao(extraido) {
  return (
    !!extraido.tipoManutencao ||
    !!extraido.unidadeTexto ||
    !!extraido.equipamentoTexto ||
    !!extraido.data ||
    !!extraido.horaInicio ||
    !!extraido.horaFim ||
    !!extraido.numeroChamado ||
    !!extraido.descricao
  );
}

function aplicarConfirmacaoDeResolucaoPendente(estado, confirmacao) {
  if (confirmacao !== true) return estado;

  const proximo = { ...estado };
  const unidade = proximo.entityResolution?.unidade;
  const equipamento = proximo.entityResolution?.equipamento;

  if (unidade?.status === 'low_confidence' && unidade.matches?.[0]) {
    proximo.unidadeId = unidade.matches[0].id;
    proximo.unidadeNome = unidade.matches[0].nomeSistema || unidade.matches[0].label;
    proximo.unidadeTexto = unidade.matches[0].label;
    proximo.entityResolution.unidade = {
      ...unidade,
      status: 'resolved',
      reason: null,
    };
  }

  if (equipamento?.status === 'low_confidence' && equipamento.matches?.[0]) {
    proximo.equipamentoId = equipamento.matches[0].id;
    proximo.equipamentoNome = equipamento.matches[0].modelo || equipamento.matches[0].label;
    proximo.modelo = equipamento.matches[0].modelo || equipamento.matches[0].label;
    proximo.tag = equipamento.matches[0].tag || null;
    proximo.tipoEquipamento = equipamento.matches[0].tipoEquipamento || null;
    proximo.equipamentoTexto = equipamento.matches[0].label;

    if (!proximo.unidadeNome && equipamento.matches[0].unidade) {
      proximo.unidadeNome = equipamento.matches[0].unidade;
    }

    proximo.entityResolution.equipamento = {
      ...equipamento,
      status: 'resolved',
      reason: null,
    };
  }

  return proximo;
}

function buildBaseMeta(estado, extra = {}) {
  return {
    step: estado.step,
    intent: 'AGENDAR_MANUTENCAO',
    entityStatus: estado.entityResolution || null,
    ...extra,
  };
}

async function salvarERegistrarMensagemAgente(
  sessaoId,
  step,
  state,
  mensagem,
  meta = {},
  resumo = null
) {
  await AgentSessionRepository.salvarSessao(sessaoId, {
    step,
    state,
    resumo,
  });

  await AgentSessionRepository.registrarMensagem(sessaoId, 'agent', mensagem, {
    step,
    ...meta,
  });
}

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

function construirMensagemResolucaoEntidade(estado) {
  const unidade = estado.entityResolution?.unidade;
  const equipamento = estado.entityResolution?.equipamento;

  if (unidade?.status === 'not_found') {
    const sugestoes = buildEntitySuggestionText(unidade.suggestions);
    return {
      mensagem: sugestoes
        ? `Não encontrei a unidade informada. Você quis dizer ${sugestoes}?`
        : 'Não encontrei a unidade informada. Pode escrever novamente como ela está cadastrada?',
      meta: buildBaseMeta(estado, {
        reason: 'ENTITY_NOT_FOUND',
        target: 'unidade',
        suggestions: unidade.suggestions,
      }),
    };
  }

  if (unidade?.status === 'low_confidence') {
    return {
      mensagem: `Encontrei uma unidade parecida: **${unidade.matches[0]?.label}**. Confirma que é essa unidade?`,
      meta: buildBaseMeta(estado, {
        reason: 'LOW_CONFIDENCE_MATCH',
        target: 'unidade',
        suggestions: unidade.suggestions,
      }),
    };
  }

  if (equipamento?.status === 'not_found') {
    const sugestoes = buildEntitySuggestionText(equipamento.suggestions);
    return {
      mensagem: sugestoes
        ? `Não encontrei esse equipamento na unidade selecionada. Você quis dizer ${sugestoes}?`
        : 'Não encontrei esse equipamento na unidade informada. Pode escrever o modelo ou a TAG como está no cadastro?',
      meta: buildBaseMeta(estado, {
        reason: 'ENTITY_NOT_FOUND',
        target: 'equipamento',
        suggestions: equipamento.suggestions,
      }),
    };
  }

  if (equipamento?.status === 'low_confidence') {
    return {
      mensagem: `Encontrei um equipamento parecido: **${equipamento.matches[0]?.label}**${equipamento.matches[0]?.secondary ? ` (${equipamento.matches[0].secondary})` : ''}. Confirma que é esse?`,
      meta: buildBaseMeta(estado, {
        reason: 'LOW_CONFIDENCE_MATCH',
        target: 'equipamento',
        suggestions: equipamento.suggestions,
      }),
    };
  }

  if (estado.ambiguidadeEquipamento?.length > 0) {
    return {
      mensagem: `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${estado.ambiguidadeEquipamento
        .map(
          (e) =>
            `**${e.modelo}** (TAG: ${e.tag})${
              e.unidade ? ` - ${e.unidade}` : ''
            }`
        )
        .join(', ')}`,
      meta: buildBaseMeta(estado, {
        reason: 'ENTITY_AMBIGUOUS',
        target: 'equipamento',
        suggestions: estado.ambiguidadeEquipamento,
      }),
    };
  }

  return null;
}

export const AgendamentoService = {
  async processar(
    mensagem,
    contextoUsuario,
    sessaoExistente = null,
    acaoContextual = null
  ) {
    const { usuarioId, tenantId } = contextoUsuario;
    const sessionKey = getSessionKey(usuarioId, tenantId);

    let sessao = sessaoExistente;

    if (!sessao) {
      sessao = await AgentSessionRepository.criarSessao({
        usuario: sessionKey,
        tenantId,
        intent: 'AGENDAR_MANUTENCAO',
        step: STEPS.START,
        state: {},
      });
    }

    let estado = JSON.parse(sessao.stateJson || '{}');
    estado = inicializarStep(estado);

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);

    const extraido = await extrairCamposComIA(mensagem, estado);
    const msgNormalizada = mensagem.toLowerCase().trim();

    if (acaoContextual?.matched) {
      if (
        acaoContextual.action === 'CONFIRMAR' ||
        acaoContextual.action === 'SIM'
      ) {
        extraido.confirmacao = true;
      }

      if (
        acaoContextual.action === 'CANCELAR_ACAO' ||
        acaoContextual.action === 'NAO' ||
        acaoContextual.action === 'CANCELAR'
      ) {
        extraido.confirmacao = false;
      }
    }

    if (mensagemEhConfirmacaoPositiva(msgNormalizada)) {
      extraido.confirmacao = true;
    }

    if (mensagemEhConfirmacaoNegativa(msgNormalizada)) {
      extraido.confirmacao = false;
    }

    estado = mergeEstadoAgente(estado, extraido);
    estado = aplicarConfirmacaoDeResolucaoPendente(estado, extraido.confirmacao);

    const houveCorrecao = detectarSeHouveCorrecao(extraido);
    estado = resetarConfirmacaoSeHouverMudanca(estado, houveCorrecao);

    if (extraido.confirmacao === false && !houveCorrecao) {
      estado.step = STEPS.CANCELADO;

      const resposta = respostaPadrao(
        'Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?',
        {
          meta: buildBaseMeta(estado, {
            reason: 'FLOW_CANCELLED',
          }),
        }
      );

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        resposta.mensagem,
        resposta.meta,
        null
      );

      await AgentSessionRepository.cancelarSessao(sessao.id);

      return resposta;
    }

    estado = await resolverEntidades(estado, tenantId);

    const problemaResolucao = construirMensagemResolucaoEntidade(estado);
    if (problemaResolucao) {
      estado.step = STEPS.COLETANDO_DADOS;

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        problemaResolucao.mensagem,
        problemaResolucao.meta
      );

      return respostaPadrao(problemaResolucao.mensagem, {
        meta: problemaResolucao.meta,
      });
    }

    const validacaoHorario = validarHorarioFuturo(estado.data, estado.horaInicio);

    if (!validacaoHorario.valido) {
      estado.horaInicio = null;
      estado.horaFim = null;
      estado.aguardandoConfirmacao = false;
      estado.confirmacao = null;
      estado.step = STEPS.COLETANDO_DADOS;

      const meta = buildBaseMeta(estado, {
        reason: 'INVALID_TIME',
      });

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        validacaoHorario.msg,
        meta
      );

      return respostaPadrao(validacaoHorario.msg, {
        meta,
      });
    }

    const faltantes = getFaltantes(estado);
    const { validacao } = validarPayloadAgendamentoDoAgente(estado);
    const faltantesValidados = [
      ...new Set([...(faltantes || []), ...(validacao.missingFields || [])]),
    ];

    let conflitoAgenda = null;
    if (faltantesValidados.length === 0) {
      conflitoAgenda = await validarConflitoAgenda(estado, tenantId);
    }

    const proximoStep = determinarProximoStep({
      estado,
      faltantes: faltantesValidados,
      conflitoAgenda,
      confirmacao: extraido.confirmacao,
      houveCorrecao,
    });

    estado.step = proximoStep;

    if (proximoStep === STEPS.COLETANDO_DADOS) {
      let mensagemResposta;
      let meta;

      if (conflitoAgenda && !conflitoAgenda.valido) {
        estado.aguardandoConfirmacao = false;
        estado.confirmacao = null;
        mensagemResposta = `${conflitoAgenda.mensagem} Por favor, informe outro horário.`;
        meta = buildBaseMeta(estado, {
          reason: 'CONFLICTING_SCHEDULE',
          missingFields: faltantesValidados,
        });
      } else if (!validacao.ok && validacao.message) {
        mensagemResposta = `${validacao.message} ${proximaPergunta(
          estado,
          faltantesValidados
        )}`;
        meta = buildBaseMeta(estado, {
          reason: 'REQUIRED_FIELD_MISSING',
          missingFields: faltantesValidados,
          fieldErrors: validacao.fieldErrors,
          validationSource: 'manutencaoSchema',
        });
      } else {
        const houveNovosDados = Object.values(extraido).some(
          (v) => v !== null && v !== undefined
        );
        const prefixo = houveNovosDados
          ? 'Perfeito, informação registrada.'
          : 'Certo.';
        mensagemResposta = `${prefixo} ${proximaPergunta(
          estado,
          faltantesValidados
        )}`;
        meta = buildBaseMeta(estado, {
          missingFields: faltantesValidados,
          validationSource: 'manutencaoSchema',
        });
      }

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        mensagemResposta,
        meta
      );

      return respostaPadrao(mensagemResposta, {
        meta,
      });
    }

    if (proximoStep === STEPS.AGUARDANDO_CONFIRMACAO) {
      let mensagemResposta;

      if (!estado.aguardandoConfirmacao) {
        estado.aguardandoConfirmacao = true;
        mensagemResposta = buildResumoConfirmacao(estado);
      } else {
        mensagemResposta =
          'Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.';
      }

      const meta = buildBaseMeta(estado, {
        aguardandoConfirmacao: true,
        validationSource: 'manutencaoSchema',
      });

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        mensagemResposta,
        meta,
        mensagemResposta
      );

      return respostaPadrao(mensagemResposta, {
        meta,
      });
    }

    if (proximoStep === STEPS.FINALIZADO) {
      try {
        const revalidacao = await validarConflitoAgenda(estado, tenantId);

        if (!revalidacao.valido) {
          estado.step = STEPS.COLETANDO_DADOS;
          estado.aguardandoConfirmacao = false;
          estado.confirmacao = null;

          const mensagemResposta = `${revalidacao.mensagem} O horário ficou indisponível antes da confirmação. Por favor, informe outro horário.`;
          const meta = buildBaseMeta(estado, {
            reason: 'REVALIDACAO_CONFLITO',
          });

          await salvarERegistrarMensagemAgente(
            sessao.id,
            estado.step,
            estado,
            mensagemResposta,
            meta
          );

          return respostaPadrao(mensagemResposta, {
            meta,
          });
        }

        const manutencao = await criarManutencaoNoBanco(
          estado,
          contextoUsuario
        );

        await UserAgentMemoryRepository.upsertMemoria(sessionKey, {
          tenantId,
          usuario: sessionKey,
          ultimaUnidadeId: estado.unidadeId || null,
          ultimaUnidadeNome: estado.unidadeNome || null,
          ultimoEquipamentoId: estado.equipamentoId || null,
          ultimoEquipamentoTag: estado.tag || null,
          ultimoEquipamentoModelo:
            estado.equipamentoNome || estado.modelo || null,
        });

        const mensagemResposta =
          '✅ **Perfeito! Agendamento realizado com sucesso.** A Ordem de Serviço foi gerada e o ativo atualizado no sistema.';

        const stateFinal = {
          ...estado,
          manutencaoId: manutencao.id,
          numeroOS: manutencao.numeroOS,
        };

        const meta = buildBaseMeta(stateFinal, {
          reason: 'SCHEDULE_CREATED',
          manutencaoId: manutencao.id,
          numeroOS: manutencao.numeroOS,
        });

        await AgentSessionRepository.salvarSessao(sessao.id, {
          step: STEPS.FINALIZADO,
          state: stateFinal,
          resumo: mensagemResposta,
        });

        await AgentSessionRepository.registrarMensagem(
          sessao.id,
          'agent',
          mensagemResposta,
          meta
        );

        await AgentSessionRepository.finalizarSessao(sessao.id);

        return respostaPadrao(mensagemResposta, {
          meta,
        });
      } catch (error) {
        console.error('[AGENDAMENTO_DB_ERROR]', error);

        const mensagemResposta =
          error?.code === 'AGENT_VALIDATION_ERROR'
            ? `${error.message} Vamos ajustar os dados antes de concluir.`
            : 'Tive um erro técnico ao salvar no banco. Por favor, tente confirmar novamente ou contate o suporte.';

        const meta = buildBaseMeta(estado, {
          reason:
            error?.code === 'AGENT_VALIDATION_ERROR'
              ? 'REQUIRED_FIELD_MISSING'
              : 'DATABASE_ERROR',
          fieldErrors: error?.details?.fieldErrors || null,
          missingFields: error?.details?.missingFields || null,
          validationSource:
            error?.code === 'AGENT_VALIDATION_ERROR'
              ? 'manutencaoSchema'
              : null,
        });

        await AgentSessionRepository.registrarMensagem(
          sessao.id,
          'agent',
          mensagemResposta,
          meta
        );

        return respostaPadrao(mensagemResposta, {
          meta,
        });
      }
    }

    const fallback =
      'Tive dificuldade para continuar o fluxo do agendamento. Pode repetir a última informação?';

    const meta = buildBaseMeta(estado, {
      reason: 'FALLBACK',
    });

    await salvarERegistrarMensagemAgente(
      sessao.id,
      estado.step,
      estado,
      fallback,
      meta,
      fallback
    );

    return respostaPadrao(fallback, {
      meta,
    });
  },
};
