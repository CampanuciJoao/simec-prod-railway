export function formatarDataTenant(data, timezone = 'UTC') {
  if (!data) return 'N/A';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(data));
  } catch {
    return 'N/A';
  }
}

export function formatarDataHoraTenant(data, timezone = 'UTC') {
  if (!data) return 'N/A';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(data));
  } catch {
    return 'N/A';
  }
}
