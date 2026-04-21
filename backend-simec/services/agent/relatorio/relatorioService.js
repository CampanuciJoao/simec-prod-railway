import { resolverEntidades } from '../shared/entityResolver.js';
import { construirFeedbackResolucaoEntidades } from '../shared/entityFeedback.js';
import { extrairFiltrosRelatorio } from './parser/index.js';
import { montarResumoUltima, montarResumoLista } from './presenter/index.js';
import {
  construirPayloadConsultaUnica,
  construirPayloadLista,
} from './payload/index.js';
import { registrarSessaoRelatorio } from './session/index.js';
import {
  buscarUltimaManutencao,
  buscarListaManutencoesRelatorio,
} from './queries/index.js';
import { construirRespostaAcaoContextual } from './actions/index.js';
import {
  logAgentError,
  logAgentStage,
} from '../core/agentLogger.js';

export const RelatorioService = {
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
      intent: 'RELATORIO',
    };

    try {
      logAgentStage('RELATORIO_REQUEST', logContext, {
        mensagem,
        contextualAction: acaoContextual || null,
      });

      if (acaoContextual?.matched) {
        const estadoAnterior = acaoContextual.state || {};

        logAgentStage('RELATORIO_ACTION', logContext, {
          action: acaoContextual.action,
          state: estadoAnterior,
        });

        const respostaPayload = construirRespostaAcaoContextual(
          acaoContextual,
          estadoAnterior
        );

        await registrarSessaoRelatorio(
          contextoUsuario,
          mensagem,
          respostaPayload.mensagem,
          {
            ...estadoAnterior,
            ultimaAcaoExecutada: acaoContextual.action,
          },
          sessaoExistente
        );

        logAgentStage('RELATORIO_RESPONSE', logContext, {
          source: 'contextualAction',
          mensagem: respostaPayload.mensagem,
          meta: respostaPayload.meta || null,
        });

        return respostaPayload;
      }

      const filtros = extrairFiltrosRelatorio(mensagem);

      if (!filtros.tipoManutencao) {
        filtros.tipoManutencao = 'Preventiva';
      }

      logAgentStage('RELATORIO_FILTERS', logContext, {
        filtros,
      });

      let contexto = {
        unidadeTexto: filtros.unidadeTexto,
        equipamentoTexto: filtros.equipamentoTexto,
      };

      contexto = await resolverEntidades(contexto, tenantId);

      logAgentStage('RELATORIO_ENTITY_RESOLUTION', logContext, {
        contexto,
        entityResolution: contexto.entityResolution || null,
      });

      const feedbackEntidades = construirFeedbackResolucaoEntidades({
        entityResolution: contexto.entityResolution,
        intent: 'RELATORIO',
      });

      if (feedbackEntidades) {
        logAgentStage('RELATORIO_RESPONSE', logContext, {
          source: 'entityFeedback',
          mensagem: feedbackEntidades.mensagem,
          meta: feedbackEntidades.meta,
        });

        return {
          mensagem: feedbackEntidades.mensagem,
          meta: feedbackEntidades.meta,
        };
      }

      if (!contexto.unidadeId && !contexto.equipamentoId) {
        const resposta = {
          mensagem:
            'NÃ£o consegui identificar a unidade ou o equipamento. Pode informar novamente?',
          meta: {
            intent: 'RELATORIO',
            entityStatus: contexto.entityResolution,
            reason: 'ENTITY_NOT_FOUND',
          },
        };

        logAgentStage('RELATORIO_RESPONSE', logContext, {
          source: 'entityMissing',
          mensagem: resposta.mensagem,
          meta: resposta.meta,
        });

        return resposta;
      }

      if (filtros.somenteUltima) {
        const manutencao = await buscarUltimaManutencao({
          tenantId,
          tipoManutencao: filtros.tipoManutencao,
          unidadeId: contexto.unidadeId || null,
          equipamentoId: contexto.equipamentoId || null,
        });

        logAgentStage('RELATORIO_QUERY', logContext, {
          mode: 'ULTIMA_MANUTENCAO',
          filtros,
          encontrouResultado: !!manutencao,
        });

        const respostaTexto = montarResumoUltima(manutencao, filtros, {
          unidadeNome: contexto.unidadeNome,
          equipamentoNome:
            contexto.equipamentoNome ||
            contexto.modelo ||
            contexto.tipoEquipamento,
        });

        const payload = construirPayloadConsultaUnica(manutencao, respostaTexto);

        await registrarSessaoRelatorio(
          contextoUsuario,
          mensagem,
          respostaTexto,
          payload,
          sessaoExistente
        );

        logAgentStage('RELATORIO_RESPONSE', logContext, {
          source: 'ultimaManutencao',
          mensagem: `${respostaTexto}${manutencao ? ' Deseja gerar PDF?' : ''}`,
          meta: payload,
        });

        return {
          mensagem: `${respostaTexto}${manutencao ? ' Deseja gerar PDF?' : ''}`,
          meta: payload,
        };
      }

      const manutencoes = await buscarListaManutencoesRelatorio({
        tenantId,
        dataInicio: filtros.periodoInicio || null,
        dataFim: filtros.periodoFim || null,
        unidadeId: contexto.unidadeId || null,
        equipamentoId: contexto.equipamentoId || null,
        tipoManutencao: filtros.tipoManutencao,
      });

      logAgentStage('RELATORIO_QUERY', logContext, {
        mode: 'LISTA_MANUTENCOES',
        filtros,
        totalResultados: manutencoes.length,
      });

      const respostaTexto = montarResumoLista(manutencoes, filtros, {
        unidadeNome: contexto.unidadeNome,
        equipamentoNome:
          contexto.equipamentoNome ||
          contexto.modelo ||
          contexto.tipoEquipamento,
      });

      const payload = construirPayloadLista(manutencoes, filtros, respostaTexto);

      await registrarSessaoRelatorio(
        contextoUsuario,
        mensagem,
        respostaTexto,
        payload,
        sessaoExistente
      );

      logAgentStage('RELATORIO_RESPONSE', logContext, {
        source: 'listaManutencoes',
        mensagem: `${respostaTexto}${manutencoes.length > 0 ? ' Deseja gerar PDF?' : ''}`,
        meta: payload,
      });

      return {
        mensagem: `${respostaTexto}${manutencoes.length > 0 ? ' Deseja gerar PDF?' : ''}`,
        meta: payload,
      };
    } catch (error) {
      logAgentError('RELATORIO_ERROR', error, logContext, {
        mensagem,
      });

      throw error;
    }
  },
};
