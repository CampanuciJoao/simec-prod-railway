export function adaptarAlertaStatus(alerta) {
  if (!alerta) return null;

  const visto = Boolean(
    alerta.lidoPorUsuarios?.length > 0 && alerta.lidoPorUsuarios[0]?.visto
  );

  return {
    ...alerta,
    status: visto ? 'Visto' : 'NaoVisto',
  };
}

export function adaptarListaAlertas(alertas = []) {
  return alertas.map(adaptarAlertaStatus);
}
