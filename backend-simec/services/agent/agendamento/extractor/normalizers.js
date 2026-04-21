export const normalizarTipoManutencao = (valor) => {
  if (!valor || typeof valor !== 'string') return null;
  const v = valor.trim().toLowerCase();

  if (v.includes('corret')) return 'Corretiva';
  if (v.includes('prevent')) return 'Preventiva';
  if (v.includes('calibr')) return 'Calibracao';
  if (v.includes('inspec')) return 'Inspecao';

  return null;
};

export const normalizarHora = (texto) => {
  if (!texto || typeof texto !== 'string') return null;

  let h = texto.toLowerCase().trim();

  if (h === 'meio dia' || h === 'meiodia') return '12:00';

  h = h.replace(/hs?$/i, '').replace(/h$/i, '').trim();

  if (/^\d{1,2}$/.test(h)) {
    return `${h.padStart(2, '0')}:00`;
  }

  if (/^\d{1,2}:\d{2}$/.test(h)) {
    const [hora, min] = h.split(':');
    return `${hora.padStart(2, '0')}:${min}`;
  }

  return null;
};

export const normalizarData = (valor) => {
  if (!valor || typeof valor !== 'string') return null;

  const texto = valor.trim();
  const agora = new Date();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  if (/^\d{2}\/\d{2}$/.test(texto)) {
    const [dia, mes] = texto.split('/');
    const anoAtual = agora.getFullYear();
    const candidato = new Date(`${anoAtual}-${mes}-${dia}T00:00:00`);

    if (Number.isNaN(candidato.getTime())) {
      return null;
    }

    const ano =
      candidato.getTime() < new Date(anoAtual, agora.getMonth(), agora.getDate()).getTime()
        ? anoAtual + 1
        : anoAtual;

    return `${ano}-${mes}-${dia}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  return null;
};

export const normalizarObjetoIA = (obj) => {
  return {
    tipoManutencao: normalizarTipoManutencao(obj?.tipoManutencao ?? obj?.tipo),
    unidadeTexto:
      typeof obj?.unidadeTexto === 'string' ? obj.unidadeTexto.trim() : null,
    equipamentoTexto:
      typeof obj?.equipamentoTexto === 'string'
        ? obj.equipamentoTexto.trim()
        : null,
    data: normalizarData(obj?.data),
    horaInicio: normalizarHora(obj?.horaInicio),
    horaFim: normalizarHora(obj?.horaFim),
    numeroChamado:
      obj?.numeroChamado != null ? String(obj.numeroChamado).trim() : null,
    descricao: typeof obj?.descricao === 'string' ? obj.descricao.trim() : null,
    confirmacao:
      typeof obj?.confirmacao === 'boolean' ? obj.confirmacao : null,
  };
};

export const mesclarPreferindoIAComFallback = (normalizadoIA, fallback) => {
  return {
    tipoManutencao: normalizadoIA.tipoManutencao ?? fallback.tipoManutencao,
    unidadeTexto: normalizadoIA.unidadeTexto ?? fallback.unidadeTexto,
    equipamentoTexto:
      normalizadoIA.equipamentoTexto ?? fallback.equipamentoTexto,
    data: normalizadoIA.data ?? fallback.data,
    horaInicio: normalizadoIA.horaInicio ?? fallback.horaInicio,
    horaFim: normalizadoIA.horaFim ?? fallback.horaFim,
    numeroChamado: normalizadoIA.numeroChamado ?? fallback.numeroChamado,
    descricao: normalizadoIA.descricao ?? fallback.descricao,
    confirmacao: normalizadoIA.confirmacao ?? fallback.confirmacao,
  };
};
