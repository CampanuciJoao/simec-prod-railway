import { ACTIONS } from '../../shared/actionResolver.js';

export function construirRespostaAcaoContextual(acaoContextual, estadoAnterior) {
  const contextoPDF = estadoAnterior?.contextoPDF || {};

  if (acaoContextual.action === ACTIONS.GERAR_PDF_OS) {
    return {
      mensagem: `Perfeito. Vou preparar o PDF da OS ${contextoPDF.numeroOS}.`,
      acao: 'GERAR_PDF_OS',
      contexto: { manutencaoId: contextoPDF.idPrincipal },
    };
  }

  if (acaoContextual.action === ACTIONS.GERAR_PDF_RELATORIO) {
    return {
      mensagem: `Perfeito. Vou preparar o PDF do relatório com ${contextoPDF.total} registros.`,
      acao: 'GERAR_PDF_RELATORIO',
      contexto: { ids: contextoPDF.ids },
    };
  }

  if (acaoContextual.action === ACTIONS.ABRIR_OS) {
    return {
      mensagem: `Perfeito. Vou abrir os detalhes da OS ${contextoPDF.numeroOS}.`,
      acao: 'ABRIR_OS',
      contexto: { manutencaoId: contextoPDF.idPrincipal },
    };
  }

  return {
    mensagem: 'Entendi a ação, mas ainda não tenho um tratador específico.',
  };
}