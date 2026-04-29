import { normalizarParaExibicao as normalizarTexto } from '../../shared/textUtils.js';

export function buildAlertMetaManutencao(manut, extra = {}) {
  const modelo = manut.equipamento?.modelo || 'Equipamento';
  const tag = manut.equipamento?.tag || 'Sem TAG';

  const subtituloBaseDefault = `${modelo} (${tag})`;

  return {
    subtituloBase: extra.subtituloBase || subtituloBaseDefault,
    numeroOS: normalizarTexto(manut.numeroOS),
    dataHoraAgendamentoInicio: manut.dataHoraAgendamentoInicio ?? null,
    dataHoraAgendamentoFim: manut.dataHoraAgendamentoFim ?? null,
    ...extra,
  };
}
