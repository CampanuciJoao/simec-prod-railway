// Analytics dos snapshots de saude (GehcSaudeSnapshot) — produz estatisticas
// agregadas, ranges inferidos e deteccao de eventos fora do padrao usados
// pelos PDFs Resumido e Completo de relatorio de saude.
//
// Decisoes de design (2026-05-18):
//   - Ranges ideais inferidos do PROPRIO historico (p5/p95) — funciona para
//     qualquer modelo de RM sem cadastro manual. Pode ser substituido por
//     range cadastrado por equipamento no futuro.
//   - Eventos fora do padrao = threshold (p5/p95) + outlier estatistico
//     (>= 2 desvios-padrao da media).
//   - Agregacao diaria preserva tendencia sem inflar tabela: 1 linha por
//     dia em vez de 12 leituras (cada 2h).

const METRICAS = {
  heliumLevelPct:    { label: 'Hélio',       unit: '%',   chave: 'helio' },
  heliumPressurePsi: { label: 'Pressão',     unit: 'PSI', chave: 'pressao' },
  coolantTempC:      { label: 'Temperatura', unit: '°C',  chave: 'temperatura' },
  coolantFlowGpm:    { label: 'Fluxo',       unit: 'GPM', chave: 'fluxo' },
};

function nums(arr) {
  return arr.filter((v) => typeof v === 'number' && Number.isFinite(v));
}

function media(arr) {
  const vs = nums(arr);
  if (!vs.length) return null;
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}

function desvio(arr) {
  const vs = nums(arr);
  if (vs.length < 2) return null;
  const m = vs.reduce((a, b) => a + b, 0) / vs.length;
  const variancia = vs.reduce((acc, v) => acc + (v - m) ** 2, 0) / vs.length;
  return Math.sqrt(variancia);
}

function percentil(arr, p) {
  const vs = nums(arr).sort((a, b) => a - b);
  if (!vs.length) return null;
  const idx = (p / 100) * (vs.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return vs[lo];
  return vs[lo] + (vs[hi] - vs[lo]) * (idx - lo);
}

function round(value, casas = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  const fator = 10 ** casas;
  return Math.round(value * fator) / fator;
}

function tendencia(valores) {
  const vs = nums(valores);
  if (vs.length < 4) return 'estavel';
  const meio = Math.floor(vs.length / 2);
  const inicio = media(vs.slice(0, meio));
  const fim = media(vs.slice(meio));
  if (inicio == null || fim == null) return 'estavel';
  const delta = fim - inicio;
  const limiar = Math.max(Math.abs(inicio) * 0.02, 0.5); // 2% ou 0.5 absoluto
  if (delta > limiar) return 'alta';
  if (delta < -limiar) return 'baixa';
  return 'estavel';
}

/**
 * Calcula estatisticas agregadas (media, min, max, std, p5, p95, tendencia)
 * para cada metrica numerica, mais uptime (% de leituras com equipmentOnline=true).
 *
 * @param {Array} snapshots - snapshots ordenados por capturedAt asc
 * @returns {object} { helio, pressao, temperatura, fluxo, uptime, total }
 */
export function calcularEstatisticas(snapshots) {
  const out = { total: snapshots.length };

  for (const [campo, meta] of Object.entries(METRICAS)) {
    const valores = snapshots.map((s) => s[campo]);
    const vs = nums(valores);
    if (!vs.length) {
      out[meta.chave] = null;
      continue;
    }
    out[meta.chave] = {
      label: meta.label,
      unit: meta.unit,
      media: round(media(vs)),
      min: round(Math.min(...vs)),
      max: round(Math.max(...vs)),
      desvio: round(desvio(vs)),
      p5: round(percentil(vs, 5)),
      p95: round(percentil(vs, 95)),
      tendencia: tendencia(valores),
      amostras: vs.length,
    };
  }

  // Uptime: percentual de leituras com equipmentOnline=true
  const onlineLeituras = snapshots.filter((s) => s.equipmentOnline != null);
  if (onlineLeituras.length) {
    const onlines = onlineLeituras.filter((s) => s.equipmentOnline === true).length;
    out.uptime = {
      label: 'Uptime',
      pct: round((onlines / onlineLeituras.length) * 100, 1),
      leituras: onlineLeituras.length,
      onlines,
      offlines: onlineLeituras.length - onlines,
    };
  } else {
    out.uptime = null;
  }

  return out;
}

/**
 * Ranges ideais inferidos: p5 (limite inferior) e p95 (limite superior).
 * Em metricas onde a faixa do MEIO e' a saudavel, p5/p95 sao bons proxies.
 * Para metricas onde valor BAIXO eh ruim (helio), usamos so o limite inferior.
 * Para metricas onde valor ALTO eh ruim (pressao, temperatura), usamos so o superior.
 *
 * Direcao:
 *   - 'baixoRuim'  -> alerta se valor < p5
 *   - 'altoRuim'   -> alerta se valor > p95
 *   - 'duploRuim'  -> alerta se valor < p5 OU > p95
 */
const DIRECAO_RANGE = {
  helio:       'baixoRuim',
  pressao:     'duploRuim',
  temperatura: 'altoRuim',
  fluxo:       'duploRuim',
};

/**
 * Detecta eventos fora do range esperado.
 *
 * Criterio primario: outlier estatistico >= 2 sigma da media (cerca de 4-5%
 * das leituras em distribuicao normal — filtra o ruido da operacao tipica).
 *
 * Severidade:
 *   - 'critico' se desvio >= 3 sigma OU se direcao do desvio for "ruim"
 *     pra metrica (ex.: helio abaixo, temperatura acima)
 *   - 'atencao' caso contrario
 *
 * Tambem reporta:
 *   - Periodos offline (equipmentOnline=false) — sempre 'atencao'
 *   - Compressor/Cryocooler com status diferente de 'OK'/'Normal' — sempre 'critico'
 */
export function detectarEventos(snapshots, estatisticas) {
  const eventos = [];

  for (const [campo, meta] of Object.entries(METRICAS)) {
    const stats = estatisticas[meta.chave];
    if (!stats || stats.desvio == null || stats.desvio === 0) continue;
    const direcao = DIRECAO_RANGE[meta.chave];

    for (const s of snapshots) {
      const v = s[campo];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;

      const desviosAbsolutos = Math.abs(v - stats.media) / stats.desvio;
      if (desviosAbsolutos < 2) continue; // dentro do esperado

      // Determina se o desvio aponta pro lado "ruim" da metrica
      const acimaDaMedia = v > stats.media;
      const desvioRuim =
        (direcao === 'baixoRuim' && !acimaDaMedia) ||
        (direcao === 'altoRuim' && acimaDaMedia) ||
        direcao === 'duploRuim';

      const severidade =
        desviosAbsolutos >= 3 || (desvioRuim && desviosAbsolutos >= 2.5)
          ? 'critico'
          : 'atencao';

      // Texto do limite: faixa tipica observada (p5–p95)
      let limiteTexto;
      if (direcao === 'baixoRuim') {
        limiteTexto = `tipico >= ${stats.p5}${meta.unit}`;
      } else if (direcao === 'altoRuim') {
        limiteTexto = `tipico <= ${stats.p95}${meta.unit}`;
      } else {
        limiteTexto = `tipico ${stats.p5}-${stats.p95}${meta.unit}`;
      }

      eventos.push({
        capturedAt: s.capturedAt,
        metrica: meta.label,
        chave: meta.chave,
        valor: round(v),
        unit: meta.unit,
        limite: limiteTexto,
        desvios: round(desviosAbsolutos, 1),
        severidade,
      });
    }
  }

  // Eventos de equipamento offline
  for (const s of snapshots) {
    if (s.equipmentOnline === false) {
      eventos.push({
        capturedAt: s.capturedAt,
        metrica: 'Equipamento',
        chave: 'online',
        valor: 'Offline',
        unit: '',
        limite: 'Esperado: Online',
        severidade: 'atencao',
      });
    }
  }

  // Status anomalo de compressor/cryocooler. Comparacao case-insensitive
  // pq o GE manda 'ON' (todo caps) mas o set tinha 'On' — bug que fazia
  // toda leitura normal virar evento critico no relatorio.
  const statusNormaisLower = new Set(['ok', 'normal', 'running', 'on']);
  for (const s of snapshots) {
    if (s.compressorStatus && !statusNormaisLower.has(String(s.compressorStatus).toLowerCase())) {
      eventos.push({
        capturedAt: s.capturedAt,
        metrica: 'Compressor',
        chave: 'compressor',
        valor: s.compressorStatus,
        unit: '',
        limite: 'Esperado: OK',
        severidade: 'critico',
      });
    }
  }

  // Ordena cronologico
  eventos.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
  return eventos;
}

/**
 * Agrega snapshots em UM registro por dia, com media/min/max das principais
 * metricas e contagem de eventos no dia.
 *
 * @param {Array} snapshots
 * @param {Array} eventos - opcional, pra contar eventos por dia
 * @returns {Array} [{ data, helio: {media,min,max}, pressao, temperatura, uptimePct, eventos }]
 */
export function agregarPorDia(snapshots, eventos = []) {
  const porDia = new Map();
  for (const s of snapshots) {
    const dia = new Date(s.capturedAt).toISOString().slice(0, 10);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(s);
  }

  const eventosPorDia = new Map();
  for (const ev of eventos) {
    const dia = new Date(ev.capturedAt).toISOString().slice(0, 10);
    eventosPorDia.set(dia, (eventosPorDia.get(dia) || 0) + 1);
  }

  const linhas = [];
  for (const [dia, snaps] of porDia.entries()) {
    const linha = { data: dia, eventos: eventosPorDia.get(dia) || 0 };

    for (const [campo, meta] of Object.entries(METRICAS)) {
      const vs = nums(snaps.map((s) => s[campo]));
      if (vs.length) {
        linha[meta.chave] = {
          media: round(media(vs)),
          min: round(Math.min(...vs)),
          max: round(Math.max(...vs)),
        };
      }
    }

    const onlineLeituras = snaps.filter((s) => s.equipmentOnline != null);
    if (onlineLeituras.length) {
      const onlines = onlineLeituras.filter((s) => s.equipmentOnline === true).length;
      linha.uptimePct = round((onlines / onlineLeituras.length) * 100, 1);
    }

    linhas.push(linha);
  }

  linhas.sort((a, b) => a.data.localeCompare(b.data));
  return linhas;
}

/**
 * Pacote completo de analise pronto pra consumo dos geradores de PDF.
 */
export function analisarSaude(snapshots) {
  const estatisticas = calcularEstatisticas(snapshots);
  const eventos = detectarEventos(snapshots, estatisticas);
  const diarios = agregarPorDia(snapshots, eventos);

  // Veredito agregado pra usar no PDF resumido.
  const criticos = eventos.filter((e) => e.severidade === 'critico').length;
  const atencao = eventos.filter((e) => e.severidade === 'atencao').length;
  let veredito;
  if (criticos > 0) {
    veredito = `Atencao: ${criticos} evento(s) critico(s) identificado(s) no periodo.`;
  } else if (atencao > 5) {
    veredito = `Operacao com variacoes: ${atencao} evento(s) de atencao identificados.`;
  } else if (atencao > 0) {
    veredito = `Operacao dentro do esperado. ${atencao} evento(s) de atencao identificados.`;
  } else {
    veredito = 'Operacao dentro do esperado. Nenhum evento fora do padrao detectado.';
  }

  return { estatisticas, eventos, diarios, veredito };
}
