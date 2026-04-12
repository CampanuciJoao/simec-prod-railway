export function formatarDowntime(totalHoras) {
  const horasNumero = Number(totalHoras);

  if (!Number.isFinite(horasNumero) || horasNumero <= 0) {
    return '0min';
  }

  const totalMinutos = Math.round(horasNumero * 60);

  const dias = Math.floor(totalMinutos / (24 * 60));
  const restoAposDias = totalMinutos % (24 * 60);

  const horas = Math.floor(restoAposDias / 60);
  const minutos = restoAposDias % 60;

  const partes = [];

  if (dias > 0) {
    partes.push(`${dias}d`);
  }

  if (horas > 0) {
    partes.push(`${horas}h`);
  }

  if (minutos > 0) {
    partes.push(`${minutos}min`);
  }

  return partes.length > 0 ? partes.join(' ') : '0min';
}

export function somarDowntimeHoras(lista = [], campo = 'horasParado') {
  return (Array.isArray(lista) ? lista : []).reduce((acc, item) => {
    return acc + Number(item?.[campo] || 0);
  }, 0);
}