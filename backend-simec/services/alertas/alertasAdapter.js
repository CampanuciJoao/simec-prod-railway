export function adaptarAlertaStatus(alerta) {
  if (!alerta) return null;

  const visto = Boolean(
    alerta.lidoPorUsuarios?.length > 0 && alerta.lidoPorUsuarios[0]?.visto
  );

  // Parseia metadataJson (string TEXT no banco) em objeto. Se o JSON for
  // invalido por algum motivo, deixa null em vez de quebrar a resposta.
  let metadata = null;
  if (alerta.metadataJson) {
    try {
      metadata = JSON.parse(alerta.metadataJson);
    } catch {
      metadata = null;
    }
  }

  return {
    ...alerta,
    status: visto ? 'Visto' : 'NaoVisto',
    metadata,
  };
}

export function adaptarListaAlertas(alertas = []) {
  return alertas.map(adaptarAlertaStatus);
}
