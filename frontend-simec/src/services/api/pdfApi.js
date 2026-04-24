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
