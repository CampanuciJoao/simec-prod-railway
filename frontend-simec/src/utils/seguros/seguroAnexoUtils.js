export function getAnexoNome(anexo) {
  return (
    anexo?.nome ||
    anexo?.nomeArquivo ||
    anexo?.filename ||
    anexo?.fileName ||
    `Anexo #${anexo?.id ?? ''}`
  );
}

export function getAnexoUrl(anexo) {
  return (
    anexo?.url ||
    anexo?.arquivoUrl ||
    anexo?.downloadUrl ||
    null
  );
}