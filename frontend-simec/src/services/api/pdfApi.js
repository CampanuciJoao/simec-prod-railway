import api from '../http/apiClient';

function getFilenameFromDisposition(contentDisposition) {
  if (!contentDisposition) return null;

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] || null;
}

function triggerBlobDownload(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

async function baixarPdf(config, fallbackFileName) {
  const response = await api.request({
    responseType: 'blob',
    ...config,
  });

  const fileName =
    getFilenameFromDisposition(response.headers?.['content-disposition']) ||
    fallbackFileName;

  triggerBlobDownload(response.data, fileName);
  return fileName;
}

export const exportarBIPDF = () =>
  baixarPdf(
    {
      url: '/pdfs/bi',
      method: 'get',
    },
    'BI_ESTRATEGICO_SIMEC.pdf'
  );

export const exportarConformidadeCqPDF = ({ unidadeId, responsavelTecnico = null }) =>
  baixarPdf(
    {
      url: '/pdfs/conformidade-cq',
      method: 'post',
      data: { unidadeId, responsavelTecnico },
    },
    'conformidade_cq.pdf'
  );

// Inventario Controle de Qualidade — lista equipamentos das modalidades
// reguladas (RDC 611) com modalidade, modelo, fabricante, TAG (nº serie),
// unidade e CNPJ. Usado como base pra solicitar orcamento de CQ junto
// a prestadores credenciados. Filtros opcionais por unidade/modalidade.
export const exportarOrcamentoCqPDF = ({ unidadeIds = null, modalidades = null } = {}) =>
  baixarPdf(
    {
      url: '/pdfs/orcamento-cq',
      method: 'post',
      data: { unidadeIds, modalidades },
    },
    `inventario_cq_${new Date().toISOString().slice(0, 10)}.pdf`
  );

export const exportarUtilizacaoGehcPDF = (meses = 12) =>
  baixarPdf(
    { url: '/pdfs/gehc-utilizacao', method: 'get', params: { meses } },
    `utilizacao_ge_${new Date().getFullYear()}.pdf`
  );

export const exportarOcorrenciaPDF = (ocorrenciaId) =>
  baixarPdf(
    { url: `/pdfs/ocorrencia/${ocorrenciaId}`, method: 'get' },
    'ocorrencia_SIMEC.pdf'
  );

export const exportarOSManutencaoPDF = (manutencaoId) =>
  baixarPdf(
    {
      url: `/pdfs/manutencao/${manutencaoId}`,
      method: 'get',
    },
    'OS_SIMEC.pdf'
  );

export const exportarRelatorioPDF = (filtros = {}, fallbackFileName = 'relatorio.pdf') =>
  baixarPdf(
    {
      url: '/pdfs/relatorio',
      method: 'post',
      data: filtros,
    },
    fallbackFileName
  );

export const exportarRelatorioPorIdsPDF = (
  ids = [],
  fallbackFileName = 'relatorio_chat_agente.pdf'
) =>
  baixarPdf(
    {
      url: '/pdfs/relatorio/manutencoes-ids',
      method: 'post',
      data: { ids },
    },
    fallbackFileName
  );

export const exportarHistoricoEquipamentoPDF = (
  equipamentoId,
  params = {},
  fallbackFileName = 'auditoria_equipamento.pdf'
) =>
  baixarPdf(
    {
      url: `/pdfs/equipamentos/${equipamentoId}/historico`,
      method: 'get',
      params,
    },
    fallbackFileName
  );

export const exportarOrcamentoPDF = (orcamentoId) =>
  baixarPdf(
    { url: `/pdfs/orcamento/${orcamentoId}`, method: 'get' },
    `orcamento_${orcamentoId.slice(-6).toUpperCase()}.pdf`
  );

// Versao "preview": retorna um Object URL temporario (blob: URL) que
// pode ser plugado num <iframe> pra renderizar o PDF inline na pagina,
// sem trigger de download. Quem chama eh responsavel por revogar o URL
// quando fechar o preview (window.URL.revokeObjectURL).
export async function carregarOrcamentoPdfBlobUrl(orcamentoId) {
  const response = await api.request({
    responseType: 'blob',
    url: `/pdfs/orcamento/${orcamentoId}`,
    method: 'get',
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  return window.URL.createObjectURL(blob);
}

export const exportarContratoPDF = (contratoId) =>
  baixarPdf(
    { url: `/pdfs/contrato/${contratoId}`, method: 'get' },
    `contrato_${contratoId}.pdf`
  );

export const exportarSaudeEquipamentoPDF = (
  equipamentoId,
  { inicio, fim, modo } = {},
  fallbackFileName,
) =>
  baixarPdf(
    {
      url: `/gehc/equipamento/${equipamentoId}/historico/export-pdf`,
      method: 'get',
      params: {
        ...(inicio && { inicio }),
        ...(fim && { fim }),
        ...(modo && { modo }),
      },
    },
    fallbackFileName || `saude_ativo_${equipamentoId}_${modo || 'completo'}.pdf`,
  );
