import { ACTIONS } from '../../shared/actionResolver.js';
import {
  montarMensagemCoberturas,
  formatarDataBR,
} from '../presenter/index.js';

function respostaPadrao(mensagem, extras = {}) {
  return {
    mensagem,
    acao: extras.acao || null,
    contexto: extras.contexto || null,
    meta: extras.meta || null,
  };
}

export function obterEstadoAnteriorSeguro(sessaoExistente) {
  if (!sessaoExistente?.stateJson) return {};

  try {
    return JSON.parse(sessaoExistente.stateJson);
  } catch {
    return {};
  }
}

export function construirRespostaAcaoContextualSeguro(
  acaoContextual,
  estadoAnterior
) {
  if (acaoContextual.action === ACTIONS.CANCELAR_ACAO) {
    return respostaPadrao(
      'Tudo bem. Não vou abrir PDF nem buscar mais detalhes desse seguro. Posso ajudar com outra coisa.',
      {
        meta: {
          tipoResposta: 'SEGURO_ACAO',
          ultimaAcaoExecutada: ACTIONS.CANCELAR_ACAO,
        },
      }
    );
  }

  if (acaoContextual.action === ACTIONS.GERAR_PDF) {
    if (estadoAnterior?.contextoPDF?.anexoId) {
      return respostaPadrao(
        `Perfeito. Vou preparar o PDF da apólice ${estadoAnterior.numeroApolice || ''}.`,
        {
          acao: 'ABRIR_PDF_SEGURO',
          contexto: {
            seguroId: estadoAnterior.seguroId || null,
            anexoId: estadoAnterior.contextoPDF.anexoId,
          },
          meta: {
            tipoResposta: 'SEGURO_ACAO',
            ultimaAcaoExecutada: ACTIONS.GERAR_PDF,
          },
        }
      );
    }

    return respostaPadrao(
      `Encontrei a apólice ${estadoAnterior.numeroApolice || ''}, mas ela não possui PDF anexado no sistema.`,
      {
        meta: {
          tipoResposta: 'SEGURO_ACAO',
          ultimaAcaoExecutada: ACTIONS.GERAR_PDF,
        },
      }
    );
  }

  if (acaoContextual.action === ACTIONS.ABRIR_DOCUMENTO) {
    if (estadoAnterior?.contextoPDF?.anexoId) {
      return respostaPadrao(
        `Perfeito. Vou abrir o documento da apólice ${estadoAnterior.numeroApolice || ''}.`,
        {
          acao: 'ABRIR_PDF_SEGURO',
          contexto: {
            seguroId: estadoAnterior.seguroId || null,
            anexoId: estadoAnterior.contextoPDF.anexoId,
          },
          meta: {
            tipoResposta: 'SEGURO_ACAO',
            ultimaAcaoExecutada: ACTIONS.ABRIR_DOCUMENTO,
          },
        }
      );
    }

    return respostaPadrao(
      `Encontrei a apólice ${estadoAnterior.numeroApolice || ''}, mas ela não possui documento anexado no sistema.`,
      {
        meta: {
          tipoResposta: 'SEGURO_ACAO',
          ultimaAcaoExecutada: ACTIONS.ABRIR_DOCUMENTO,
        },
      }
    );
  }

  if (acaoContextual.action === ACTIONS.MOSTRAR_COBERTURA) {
    return respostaPadrao(montarMensagemCoberturas(estadoAnterior), {
      meta: {
        tipoResposta: 'SEGURO_ACAO',
        ultimaAcaoExecutada: ACTIONS.MOSTRAR_COBERTURA,
        coberturasDetalhadas: estadoAnterior.coberturasDetalhadas || [],
      },
    });
  }

  if (acaoContextual.action === ACTIONS.MOSTRAR_VENCIMENTO) {
    const vencimentoFormatado = formatarDataBR(estadoAnterior.vencimento);

    return respostaPadrao(
      vencimentoFormatado
        ? `O vencimento da apólice ${estadoAnterior.numeroApolice || ''} é em ${vencimentoFormatado}.`
        : 'Não encontrei a data de vencimento desta apólice.',
      {
        meta: {
          tipoResposta: 'SEGURO_ACAO',
          ultimaAcaoExecutada: ACTIONS.MOSTRAR_VENCIMENTO,
        },
      }
    );
  }

  if (acaoContextual.action === ACTIONS.MOSTRAR_DADOS_APOLICE) {
    const vencimentoFormatado = formatarDataBR(estadoAnterior.vencimento);

    return respostaPadrao(
      `Apólice ${estadoAnterior.numeroApolice || 'N/A'}, seguradora ${estadoAnterior.seguradora || 'N/A'}${vencimentoFormatado ? `, vencimento em ${vencimentoFormatado}` : ''}.`,
      {
        meta: {
          tipoResposta: 'SEGURO_ACAO',
          ultimaAcaoExecutada: ACTIONS.MOSTRAR_DADOS_APOLICE,
        },
      }
    );
  }

  return respostaPadrao(
    'Entendi a ação sobre o seguro anterior, mas ainda não tenho um tratador específico para ela.',
    {
      meta: {
        tipoResposta: 'SEGURO_ACAO',
        ultimaAcaoExecutada: acaoContextual.action || null,
      },
    }
  );
}