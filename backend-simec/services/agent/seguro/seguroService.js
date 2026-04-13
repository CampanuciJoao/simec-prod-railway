import { resolverEntidades } from '../shared/entityResolver.js';
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
    const { tenantId } = contextoUsuario;

    if (acaoContextual?.matched) {
      const estadoAnterior = acaoContextual.state || {};

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

    let contexto = {
      unidadeTexto: filtros.unidadeTexto,
      equipamentoTexto: filtros.equipamentoTexto,
    };

    contexto = await resolverEntidades(contexto, tenantId);

    if (!contexto.unidadeId && !contexto.equipamentoId) {
      if (estadoAnterior?.seguroId) {
        const resposta = respostaPadrao(
          'Entendi que você está continuando a consulta do seguro anterior, mas não consegui identificar o novo alvo. Pode informar, por exemplo: "da unidade de Coxim", "da sede" ou "da tomografia de Coxim"?',
          {
            meta: estadoAnterior,
          }
        );

        await registrarSessaoSeguro(
          contextoUsuario,
          mensagem,
          resposta.mensagem,
          estadoAnterior,
          sessaoExistente
        );

        return resposta;
      }

      return respostaPadrao(
        "Não consegui identificar a unidade ou o equipamento do seguro. Pode informar novamente, por exemplo: 'me traga o seguro da unidade de Coxim'?"
      );
    }

    let seguro = null;

    if (filtros.somenteVigente) {
      seguro = await buscarSeguroVigenteAdapter({
        tenantId,
        unidadeId: contexto.unidadeId || null,
        equipamentoId: contexto.equipamentoId || null,
      });
    } else {
      seguro = await buscarSeguroMaisRecenteAdapter({
        tenantId,
        unidadeId: contexto.unidadeId || null,
        equipamentoId: contexto.equipamentoId || null,
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

    return respostaPadrao(respostaTexto, {
      meta: payload,
    });
  },
};