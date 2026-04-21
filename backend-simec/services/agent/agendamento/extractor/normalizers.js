// normalizers.js
// Normalização de entradas naturais em pt-BR.
// Aceita linguagem natural → converte para formato interno estruturado.
// NUNCA rejeita entradas compreensíveis — normaliza primeiro, valida depois.

export const normalizarTipoManutencao = (valor) => {
  if (!valor || typeof valor !== 'string') return null;
  const v = valor.trim().toLowerCase();
  if (v.includes('corret')) return 'Corretiva';
  if (v.includes('prevent')) return 'Preventiva';
  return null;
};

/**
 * normalizarHora — aceita qualquer variação natural de horário em pt-BR.
 *
 * Entradas aceitas:
 *   "10:00"      → "10:00"
 *   "10:00h"     → "10:00"
 *   "8h"         → "08:00"
 *   "8:30h"      → "08:30"
 *   "8"          → "08:00"
 *   "às 10:00"   → "10:00"
 *   "as 10:00"   → "10:00"
 *   "meio dia"   → "12:00"
 *   "10am"       → "10:00"
 *   "2pm"        → "14:00"
 */
export const normalizarHora = (texto) => {
  if (!texto || typeof texto !== 'string') return null;

  let h = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (ás → as, às → as)
    .trim();

  // Aliases textuais
  if (h === 'meio dia' || h === 'meiodia') return '12:00';
  if (h === 'meia noite' || h === 'meianoite') return '00:00';

  // Remove prefixos naturais: "às", "as", "a partir das", "por volta das"
  h = h.replace(/^(as|a partir das?|por volta das?)\s+/i, '').trim();

  // Trata PM (ex: "2pm", "2:30pm")
  const pmMatch = h.match(/^(\d{1,2})(?::(\d{2}))?\s*pm$/i);
  if (pmMatch) {
    let hora = Number(pmMatch[1]);
    const min = pmMatch[2] ? Number(pmMatch[2]) : 0;
    if (hora !== 12) hora += 12;
    if (hora > 23 || min > 59) return null;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Trata AM (ex: "10am", "8:30am")
  const amMatch = h.match(/^(\d{1,2})(?::(\d{2}))?\s*am$/i);
  if (amMatch) {
    let hora = Number(amMatch[1]);
    const min = amMatch[2] ? Number(amMatch[2]) : 0;
    if (hora === 12) hora = 0;
    if (hora > 23 || min > 59) return null;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Remove sufixos: "h", "hs", "hr", "hrs"
  h = h.replace(/\s*h(?:r?s?)?\s*$/i, '').trim();

  // Formato "11h30"
  const matchHoraComH = h.match(/^(\d{1,2})h(\d{2})$/i);
  if (matchHoraComH) {
    const hora = Number(matchHoraComH[1]);
    const min = Number(matchHoraComH[2]);
    if (hora > 23 || min > 59) return null;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Formato "HH:MM"
  if (/^\d{1,2}:\d{2}$/.test(h)) {
    const [hora, min] = h.split(':').map(Number);
    if (hora > 23 || min > 59) return null;
    return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Formato só hora "8", "10"
  if (/^\d{1,2}$/.test(h)) {
    const hora = Number(h);
    if (hora > 23) return null;
    return `${String(hora).padStart(2, '0')}:00`;
  }

  return null;
};

/**
 * normalizarData — aceita variações explícitas de data em pt-BR.
 *
 * Entradas aceitas:
 *   "21/04/2026"  → "2026-04-21"
 *   "21-04-2026"  → "2026-04-21"
 *   "21/04"       → "AAAA-04-21"  (ano corrente)
 *   "2026-04-21"  → "2026-04-21"  (já normalizado)
 */
export const normalizarData = (valor) => {
  if (!valor || typeof valor !== 'string') return null;

  const texto = valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^dia\s+/, '')
    .trim();
  const anoAtual = new Date().getFullYear();

  const normalizarAno = (ano) => {
    if (ano.length === 4) return ano;
    const anoCurto = Number(ano);
    if (Number.isNaN(anoCurto)) return null;
    return String(Math.floor(anoAtual / 100) * 100 + anoCurto);
  };

  // DD/MM/YYYY ou DD-MM-YYYY
  const matchCompleto = texto.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/
  );
  if (matchCompleto) {
    const [, diaBruto, mesBruto, anoBruto] = matchCompleto;
    const dia = diaBruto.padStart(2, '0');
    const mes = mesBruto.padStart(2, '0');
    const ano = normalizarAno(anoBruto);
    if (!ano) return null;
    return `${ano}-${mes}-${dia}`;
  }

  // ISO YYYY-MM-DD (já normalizado)
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  // DD/MM sem ano → usa ano corrente
  const matchSemAno = texto.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (matchSemAno) {
    const dia = matchSemAno[1].padStart(2, '0');
    const mes = matchSemAno[2].padStart(2, '0');
    const ano = anoAtual;
    return `${ano}-${mes}-${dia}`;
  }

  return null;
};

/**
 * normalizarDataRelativa — resolve expressões relativas de data em pt-BR.
 *
 * Entradas aceitas:
 *   "hoje"              → data de hoje
 *   "amanhã" / "amanha" → data de amanhã
 *   "depois de amanhã"  → +2 dias
 *   "dia 21"            → dia 21 do mês corrente (ou próximo se já passou)
 *   "próxima segunda"   → próxima segunda-feira
 *   "próxima terça"     → próxima terça-feira
 *   (e demais dias da semana)
 *
 * @param {string} texto - entrada já em lower-case sem acentos
 * @param {Date}   agora - referência de data (injetável para testes)
 * @returns {string|null} no formato "YYYY-MM-DD" ou null se não reconhecido
 */
export const normalizarDataRelativa = (texto, agora = new Date()) => {
  if (!texto || typeof texto !== 'string') return null;

  const lower = texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const toISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);

  if (lower === 'hoje') {
    return toISO(hoje);
  }

  if (lower === 'amanha' || lower.startsWith('amanha ')) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 1);
    return toISO(d);
  }

  if (lower === 'depois de amanha' || lower === 'depois amanha') {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 2);
    return toISO(d);
  }

  const matchDiaComData = lower.match(
    /\bdia\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/
  );
  if (matchDiaComData?.[1]) {
    return normalizarData(matchDiaComData[1]);
  }

  // "dia 21", "dia 5"
  const matchDia = lower.match(/\bdia\s+(\d{1,2})\b/);
  if (matchDia) {
    const dia = Number(matchDia[1]);
    if (dia >= 1 && dia <= 31) {
      const tentativa = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
      // se o dia já passou neste mês, avança para o próximo
      if (tentativa <= hoje) {
        tentativa.setMonth(tentativa.getMonth() + 1);
      }
      return toISO(tentativa);
    }
  }

  // Próxima <dia-da-semana>
  const diasSemana = {
    domingo: 0,
    segunda: 1,
    'segunda-feira': 1,
    terca: 2,
    'terca-feira': 2,
    quarta: 3,
    'quarta-feira': 3,
    quinta: 4,
    'quinta-feira': 4,
    sexta: 5,
    'sexta-feira': 5,
    sabado: 6,
  };

  for (const [nome, idx] of Object.entries(diasSemana)) {
    if (lower.includes(nome)) {
      const alvo = new Date(hoje);
      let diff = idx - alvo.getDay();
      if (diff <= 0) diff += 7; // sempre próximo, nunca hoje
      alvo.setDate(alvo.getDate() + diff);
      return toISO(alvo);
    }
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
