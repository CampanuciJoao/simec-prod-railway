function toNumber(value) {
  return Number(value || 0);
}

export function formatarDowntime(totalHoras, options = {}) {
  const { mostrarZero = true } = options;

  const totalMinutos = Math.round(toNumber(totalHoras) * 60);

  const dias = Math.floor(totalMinutos / 1440);
  const horas = Math.floor((totalMinutos % 1440) / 60);
  const minutos = totalMinutos % 60;

  const partes = [];

  if (dias > 0) partes.push(`${dias}d`);
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0) partes.push(`${minutos}min`);

  return partes.length > 0 ? partes.join(' ') : mostrarZero ? '0min' : '';
}

export function somarDowntimeHoras(items = [], campo = 'horasParado') {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    return total + toNumber(item?.[campo]);
  }, 0);
}