import { resolverEntidades } from '../shared/entityResolver.js';
import { construirFeedbackResolucaoEntidades } from '../shared/entityFeedback.js';
import { extrairFiltrosSeguro } from './parser/index.js';
import { montarResumoSeguro } from './presenter/index.js';
import { construirPayloadSeguro } from './payload/index.js';
import { registrarSessaoSeguro } from './session/index.js';
import {
  buscarSeguroMaisRecenteAdapter,
  buscarSeguroVigenteAdapter,
} from './queries/index.js';
import {
  construirRespostaAcaoContextualSeguro,
  obterEstadoAnteriorSeguro,
} from './actions/index.js';
import {
  logAgentError,
  logAgentStage,
} from '../core/agentLogger.js';

function respostaPadrao(mensagem, extras = {}) {
  return {
    mensagem,
    acao: extras.acao || null,
    contexto: extras.contexto || null,
    meta: extras.meta || null,
  };
}

export const SeguroService = {
  async processar(
    mensagem,
    contextoUsuario,
    sessaoExistente = null,
    acaoContextual = null
  ) {
    const {
      tenantId,
      usuarioId = null,
      usuarioNome = null,
      requestId = null,
    } = contextoUsuario;
    const logContext = {
      requestId,
      tenantId,
      usuarioId,
      usuarioNome,
      sessionId: sessaoExistente?.id || null,
      intent: 'SEGURO',
    };

    try {
      logAgentStage('SEGURO_REQUEST', logContext, {
        mensagem,
        contextualAction: acaoContextual || null,
      });

      if (acaoContextual?.matched) {
        const estadoAnterior = acaoContextual.state || {};

        logAgentStage('SEGURO_ACTION', logContext, {
          action: acaoContextual.action,
          state: estadoAnterior,
        });

        const resposta = construirRespostaAcaoContextualSeguro(
          acaoContextual,
          estadoAnterior
        );

        await registrarSessaoSeguro(
          contextoUsuario,
          mensagem,
          resposta.mensagem,
          {
            ...estadoAnterior,
            ultimaAcaoExecutada: acaoContextual.action,
          },
          sessaoExistente
        );

        logAgentStage('SEGURO_RESPONSE', logContext, {
          source: 'contextualAction',
          mensagem: resposta.mensagem,
          meta: resposta.meta || null,
        });

        return resposta;
      }

      const filtrosExtraidos = extrairFiltrosSeguro(mensagem);
      const estadoAnterior = obterEstadoAnteriorSeguro(sessaoExistente);

      const filtros = {
        ...filtrosExtraidos,
        unidadeTexto:
          filtrosExtraidos.unidadeTexto || estadoAnterior.unidadeNome || null,
        equipamentoTexto:
          filtrosExtraidos.equipamentoTexto ||
          estadoAnterior.equipamentoNome ||
          null,
      };

      logAgentStage('SEGURO_FILTERS', logContext, {
        filtrosExtraidos,
        estadoAnterior,
        filtros,
      });

      let contexto = {
        unidadeTexto: filtros.unidadeTexto,
        equipamentoTexto: filtros.equipamentoTexto,
      };

      contexto = await resolverEntidades(contexto, tenantId);

      logAgentStage('SEGURO_ENTITY_RESOLUTION', logContext, {
        contexto,
        entityResolution: contexto.entityResolution || null,
      });

      const feedbackEntidades = construirFeedbackResolucaoEntidades({
        entityResolution: contexto.entityResolution,
        intent: 'SEGURO',
      });

      if (feedbackEntidades) {
        const resposta = respostaPadrao(feedbackEntidades.mensagem, {
          meta: feedbackEntidades.meta,
        });

        logAgentStage('SEGURO_RESPONSE', logContext, {
          source: 'entityFeedback',
          mensagem: resposta.mensagem,
          meta: resposta.meta,
        });

        return resposta;
      }

      if (!contexto.unidadeId && !contexto.equipamentoId) {
        if (estadoAnterior?.seguroId) {
          const resposta = respostaPadrao(
            'Entendi que vocÃª estÃ¡ continuando a consulta do seguro anterior, mas nÃ£o consegui identificar o novo alvo. Pode informar, por exemplo: "da unidade Matriz" ou "da tomografia da Matriz"?',
            {
              meta: {
                ...estadoAnterior,
                intent: 'SEGURO',
                entityStatus: contexto.entityResolution,
                reason: 'ENTITY_NOT_FOUND',
              },
            }
          );

          await registrarSessaoSeguro(
            contextoUsuario,
            mensagem,
            resposta.mensagem,
            estadoAnterior,
            sessaoExistente
          );

          logAgentStage('SEGURO_RESPONSE', logContext, {
            source: 'entityMissingWithPreviousState',
            mensagem: resposta.mensagem,
            meta: resposta.meta,
          });

          return resposta;
        }

        const resposta = respostaPadrao(
          'NÃ£o consegui identificar a unidade ou o equipamento do seguro. Pode informar novamente?',
          {
            meta: {
              intent: 'SEGURO',
              entityStatus: contexto.entityResolution,
              reason: 'ENTITY_NOT_FOUND',
            },
          }
        );

        logAgentStage('SEGURO_RESPONSE', logContext, {
          source: 'entityMissing',
          mensagem: resposta.mensagem,
          meta: resposta.meta,
        });

        return resposta;
      }

      let seguro = null;

      if (filtros.somenteVigente) {
        seguro = await buscarSeguroVigenteAdapter({
          tenantId,
          unidadeId: contexto.unidadeId || null,
          equipamentoId: contexto.equipamentoId || null,
        });

        logAgentStage('SEGURO_QUERY', logContext, {
          mode: 'SEGURO_VIGENTE',
          filtros,
          encontrouResultado: !!seguro,
        });
      } else {
        seguro = await buscarSeguroMaisRecenteAdapter({
          tenantId,
          unidadeId: contexto.unidadeId || null,
          equipamentoId: contexto.equipamentoId || null,
        });

        logAgentStage('SEGURO_QUERY', logContext, {
          mode: 'SEGURO_RECENTE',
          filtros,
          encontrouResultado: !!seguro,
        });
      }

      const respostaTexto = montarResumoSeguro(seguro, contexto);
      const payload = construirPayloadSeguro(seguro, respostaTexto);

      await registrarSessaoSeguro(
        contextoUsuario,
        mensagem,
        respostaTexto,
        payload,
        sessaoExistente
      );

      const resposta = respostaPadrao(respostaTexto, {
        meta: payload,
      });

      logAgentStage('SEGURO_RESPONSE', logContext, {
        source: 'seguroResumo',
        mensagem: resposta.mensagem,
        meta: resposta.meta,
      });

      return resposta;
    } catch (error) {
      logAgentError('SEGURO_ERROR', error, logContext, {
        mensagem,
      });

      throw error;
    }
  },
};
