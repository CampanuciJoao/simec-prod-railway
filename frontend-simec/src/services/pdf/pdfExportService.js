async function loadPdfUtils() {
  return import('@/utils/pdfUtils');
}

export async function exportarHistoricoEquipamentoPDFLazy(dados, info) {
  const { exportarHistoricoEquipamentoPDF } = await loadPdfUtils();
  return exportarHistoricoEquipamentoPDF(dados, info);
}

export async function exportarRelatorioPDFLazy(resultado, nomeArquivo) {
  const { exportarRelatorioPDF } = await loadPdfUtils();
  return exportarRelatorioPDF(resultado, nomeArquivo);
}

export async function exportarBIPDFLazy(dados) {
  const { exportarBIPDF } = await loadPdfUtils();
  return exportarBIPDF(dados);
}

export async function exportarOSManutencaoPDFLazy(manutencao) {
  const { exportarOSManutencaoPDF } = await loadPdfUtils();
  return exportarOSManutencaoPDF(manutencao);
}
