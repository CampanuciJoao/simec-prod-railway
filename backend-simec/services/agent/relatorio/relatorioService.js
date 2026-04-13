import { resolverEntidades } from '../shared/entityResolver.js';
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

export const RelatorioService = {
  async processar(
    mensagem,
    contextoUsuario,
    sessaoExistente = null,
    acaoContextual = null
  ) {
    const { tenantId } = contextoUsuario;

    if (acaoContextual?.matched) {
      const estadoAnterior = acaoContextual.state || {};

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

      return respostaPayload;
    }

    const filtros = extrairFiltrosRelatorio(mensagem);

    if (!filtros.tipoManutencao) {
      filtros.tipoManutencao = 'Preventiva';
    }

    let contexto = {
      unidadeTexto: filtros.unidadeTexto,
      equipamentoTexto: filtros.equipamentoTexto,
    };

    contexto = await resolverEntidades(contexto, tenantId);

    if (!contexto.unidadeId && !contexto.equipamentoId) {
      return {
        mensagem:
          'Não consegui identificar a unidade ou equipamento. Pode informar novamente?',
      };
    }

    if (filtros.somenteUltima) {
      const manutencao = await buscarUltimaManutencao({
        tenantId,
        tipoManutencao: filtros.tipoManutencao,
        unidadeId: contexto.unidadeId || null,
        equipamentoId: contexto.equipamentoId || null,
      });

      const respostaTexto = montarResumoUltima(manutencao, filtros, {
        unidadeNome: contexto.unidadeNome,
        equipamentoNome:
          contexto.equipamentoNome ||
          contexto.modelo ||
          contexto.tipoEquipamento,
      });

      const payload = construirPayloadConsultaUnica(
        manutencao,
        respostaTexto
      );

      await registrarSessaoRelatorio(
        contextoUsuario,
        mensagem,
        respostaTexto,
        payload,
        sessaoExistente
      );

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

    const respostaTexto = montarResumoLista(manutencoes, filtros, {
      unidadeNome: contexto.unidadeNome,
      equipamentoNome:
        contexto.equipamentoNome ||
        contexto.modelo ||
        contexto.tipoEquipamento,
    });

    const payload = construirPayloadLista(
      manutencoes,
      filtros,
      respostaTexto
    );

    await registrarSessaoRelatorio(
      contextoUsuario,
      mensagem,
      respostaTexto,
      payload,
      sessaoExistente
    );

    return {
      mensagem: `${respostaTexto}${manutencoes.length > 0 ? ' Deseja gerar PDF?' : ''}`,
      meta: payload,
    };
  },
};