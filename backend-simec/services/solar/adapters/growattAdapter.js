// Growatt adapter — ShineServer OpenAPI V1 (openapi.growatt.com/v1/).
// Autenticacao por token header. Suporta modelos MIN (TLX), MAC, MAX,
// MIX, SPH. Rate limit nao publicado mas e generoso (Growatt documenta
// "V1 API offers more relaxed rate limiting").
//
// Fluxo:
//   1. GET /plant/list — pega todos os plantId do usuario
//   2. GET /device/list?plant_id=X — pega devices (inversores) e o deviceSn
//   3. POST /device/inverter/last_new_data body={device_sn} — telemetria
//
// Como um token pode ver N plantas e N inversores, exigimos que o admin
// cadastre cada inversor SN separadamente. O adapter so busca o SN
// especifico cadastrado.

const USER_AGENT = 'SIMEC-SolarAdapter/1.0';

export const id = 'growatt';
export const label = 'Growatt';

export const credentialFields = [
  {
    name: 'apiToken',
    label: 'API Token',
    type: 'password',
    required: true,
    help: 'Gere em "My Center > API" no portal openapi.growatt.com apos solicitar acesso.',
  },
];

export const defaultApiBase = 'https://openapi.growatt.com';

export const apiBaseOptions = [
  { value: 'https://openapi.growatt.com',    label: 'Global (openapi.growatt.com)' },
  { value: 'https://openapi-cn.growatt.com', label: 'China (openapi-cn)' },
  { value: 'https://openapi-us.growatt.com', label: 'EUA (openapi-us)' },
];

async function callGrowatt({ apiBase, token, path, method = 'GET', body = null }) {
  const url = `${apiBase.replace(/\/$/, '')}${path}`;
  const headers = {
    'token': token,
    'User-Agent': USER_AGENT,
    ...(method === 'POST' && body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
  };
  const opts = { method, headers };
  if (body && method === 'POST') {
    // Growatt V1 espera form-encoded no body (nao JSON).
    opts.body = new URLSearchParams(body).toString();
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Growatt HTTP ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Growatt resposta nao-JSON em ${path}: ${text.slice(0, 200)}`);
  }
  // Growatt V1: code 0 = sucesso; outros valores sao erro logico (HTTP 200 mesmo).
  if (json.error_code && json.error_code !== 0) {
    throw new Error(`Growatt erro em ${path}: error_code=${json.error_code} msg=${json.error_msg || 'sem msg'}`);
  }
  return json.data || json;
}

// Growatt V1 tem dois modelos de conta:
//
//   1. Conta direta (shineserver): o token ja identifica o user; `/plant/list`
//      aceita chamada sem `C_user_id` ou com `C_user_id=0`. A doc antiga de 2016
//      marca o parametro como obrigatorio, mas na pratica o OpenAPI V1 moderno
//      aceita sem (retorna as plantas do proprio token).
//   2. Conta business/revendedor: o token enxerga N c_users. Nesses casos a
//      chamada sem `C_user_id` devolve lista vazia; e preciso primeiro listar
//      `user/c_user_list` e depois iterar `plant/list?C_user_id=<id>`.
//
// Pra funcionar nos dois casos, tentamos sem C_user_id; se a lista vier vazia
// (mas sem erro), caimos pro fluxo business. Isso tambem explica o sintoma
// "cadastrei o token e nenhum dado veio" — o portal gerou token business e o
// adapter antigo chamava direto.
async function listarTodasPlantas({ apiBase, token }) {
  const chamada = (path) => callGrowatt({ apiBase, token, path, method: 'GET' });

  let plantas = [];
  let avisoBusiness = null;

  try {
    const direto = await chamada('/v1/plant/list?page=1&perpage=100');
    plantas = direto?.plants || [];
  } catch (err) {
    avisoBusiness = err.message;
  }

  if (plantas.length > 0) return { plantas, modelo: 'direto' };

  try {
    const u = await chamada('/v1/user/c_user_list?page=1&perpage=100');
    const cUsers = u?.c_user || u?.c_users || [];
    if (cUsers.length === 0) {
      return {
        plantas: [],
        modelo: 'desconhecido',
        aviso: avisoBusiness || 'Token valido mas sem plantas nem c_users associados.',
      };
    }
    for (const cu of cUsers) {
      try {
        const cUserId = cu.c_user_id;
        const p = await chamada(`/v1/plant/list?C_user_id=${cUserId}&page=1&perpage=100`);
        plantas.push(...(p?.plants || []));
      } catch {
        // segue listando os outros c_users
      }
    }
    return { plantas, modelo: 'business' };
  } catch (err) {
    return {
      plantas: [],
      modelo: 'desconhecido',
      aviso: `Direto falhou (${avisoBusiness || 'vazio'}); c_user_list tambem falhou: ${err.message}`,
    };
  }
}

export async function validarCredencial(credential, apiBase) {
  try {
    const { plantas, modelo, aviso } = await listarTodasPlantas({
      apiBase: apiBase || defaultApiBase,
      token: credential.apiToken,
    });

    if (plantas.length === 0) {
      return {
        ok: false,
        erro:
          `Token aceito, mas nenhuma planta encontrada no portal Growatt. ` +
          (aviso ? `Detalhe: ${aviso}. ` : '') +
          'Verifique em openapi.growatt.com se o token tem permissao de leitura ' +
          'e se a conta esta associada a alguma planta ativa.',
      };
    }

    // Pra cada planta, pega devices. Limita a 10 plantas na validacao pra
    // nao estourar tempo em contas muito grandes.
    const devices = [];
    for (const p of plantas.slice(0, 10)) {
      const stationKwp = p.peak_power != null ? parseFloat(p.peak_power) : null;
      try {
        const dev = await callGrowatt({
          apiBase: apiBase || defaultApiBase,
          token: credential.apiToken,
          path: `/v1/device/list?plant_id=${p.plant_id}&page=1&perpage=50`,
          method: 'GET',
        });
        for (const d of (dev?.devices || [])) {
          const capKw = d.nominal_power != null
            ? parseFloat(d.nominal_power) / 1000  // Growatt expoe em W
            : (d.rated_power != null ? parseFloat(d.rated_power) / 1000 : null);
          devices.push({
            sn:            d.device_sn,
            dataloggerSn:  d.datalogger_sn,
            tipo:          d.type,  // ← crucial: identifica rota correta no fetchSnapshot
            modelo:        d.model || d.device_model || d.type,
            capacidadeKw:  Number.isFinite(capKw) ? capKw : null,
            estacao:       p.name,
            stationKwp:    Number.isFinite(stationKwp) ? stationKwp : null,
            online:        d.status === 1 || d.status === '1',
          });
        }
      } catch {
        // Ignora erro em planta especifica — segue listando as outras.
      }
    }

    if (devices.length === 0) {
      return {
        ok: false,
        erro:
          `Encontrei ${plantas.length} planta(s) (modelo ${modelo}) mas nenhum device/inversor dentro delas. ` +
          'Verifique em openapi.growatt.com se o token enxerga os inversores das plantas.',
      };
    }

    // Exposicao de stations pra ficar consistente com a API do diagnostico
    // (que espera { stations, devices }). Permite UI distinguir planta vs device.
    const stations = plantas.map((p) => ({
      ps_id: p.plant_id,
      nome:  p.name,
    }));
    return { ok: true, devices, stations };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
}

// Rotas Growatt V1 por tipo de device. Ordem importa: tenta as mais
// comuns primeiro. Doc oficial Growatt (secao 4.3.8) define
// /v1/device/inverter/last_new_data como GET com device_sn na query string.
// Os endpoints POST (secao 4.3.9) sao os de BATCH (invs_data).
const ROTAS_LAST_DATA = [
  { nome: 'inverter', path: '/v1/device/inverter/last_new_data', method: 'GET' },  // TLX, MAX legacy
  { nome: 'min',      path: '/v1/device/min/last_new_data',      method: 'GET' },  // MIN G2/G3
  { nome: 'max',      path: '/v1/device/max/last_new_data',      method: 'GET' },  // MAX C&I
  { nome: 'mix',      path: '/v1/device/mix/last_new_data',      method: 'GET' },  // MIX hybrid
  { nome: 'sph',      path: '/v1/device/sph/last_new_data',      method: 'GET' },  // SPH storage
  { nome: 'spa',      path: '/v1/device/spa/last_new_data',      method: 'GET' },  // SPA
  { nome: 'storage',  path: '/v1/storage/storage_last_data',     method: 'POST' }, // S/SPX (sec 4.3.13)
  { nome: 'tlx',      path: '/v1/device/tlx/last_new_data',      method: 'GET' },  // TLX novo
];

export async function fetchSnapshot(inverter) {
  const sn = String(inverter.inverterSn || '').trim();

  let data = null;
  let tipoTentado = null;
  const erros = [];

  for (const rota of ROTAS_LAST_DATA) {
    try {
      // GET: device_sn vai na query string. POST: no body (form-encoded).
      const path = rota.method === 'GET'
        ? `${rota.path}?device_sn=${encodeURIComponent(sn)}`
        : rota.path;
      data = await callGrowatt({
        apiBase: inverter.apiBase,
        token: inverter.credential.apiToken,
        path,
        method: rota.method,
        body: rota.method === 'POST' ? { device_sn: sn } : null,
      });
      // Considera sucesso util se trouxe algum campo de potencia/energia.
      const temDados = data && (data.ppv != null || data.pac != null ||
        data.eToday != null || data.eacToday != null);
      if (temDados) {
        tipoTentado = rota.nome;
        break;
      }
      erros.push(`${rota.nome}: resposta vazia`);
      data = null;
    } catch (err) {
      const msg = String(err.message || '');
      erros.push(`${rota.nome}: ${msg.slice(0, 100)}`);
      // Rate limit — parar imediatamente de iterar. Continuar so queima
      // mais quota e deixa a Growatt bloqueada por mais tempo. A rota
      // atual provavelmente e a certa (ela retornou erro de aplicacao,
      // nao 404 — significa que existe pro device).
      if (/error_frequently_access|10012|rate.?limit|too.?many/i.test(msg)) {
        throw new Error(
          `Growatt: rate limit atingido em ${rota.nome}. ` +
          'A rota existe pra este SN — provavelmente eh a correta. ' +
          'Aguarde ~1min e tente de novo. Se persistir, o poller de 60s ' +
          'esta disparando concomitante ao diagnostico manual.'
        );
      }
      // HTTP 404 explicito = rota nao existe pra esse tipo de device; tenta a proxima.
      // Qualquer outro erro: tambem segue (pode ser flaky).
    }
  }

  if (!data) {
    throw new Error(
      `Growatt: nenhuma rota reconheceu SN ${sn}. Tentou: ${erros.join(' | ')}`
    );
  }

  // Normaliza campos. Growatt tem MUITOS nomes diferentes dependendo do
  // modelo/firmware — a doc oficial as vezes nao bate com o payload real.
  //
  // UNIDADES CONFIRMADAS (MAX/MID-X/M GBDDA14008, via comparacao com portal
  // openapi.growatt.com em 12/11/2026):
  //   ppv/pac:    W (potencia DC/AC atual)
  //   powerToday/eToday/eacToday: kWh (yield today) — NAO Wh como comentario
  //                               anterior dizia. Valor confirmado: portal
  //                               mostrava 214.2 kWh e API retornava 214.1,
  //                               bate 1:1 (SIMEC estava dividindo por 1000
  //                               e mostrando 0.2 kWh — bug grave).
  //   powerTotal/eTotal:          kWh (total acumulado)
  //   temperature:                °C
  const n = (x) => (typeof x === 'number' ? x : (x != null ? parseFloat(x) : null));
  const primeiroValido = (...vals) => {
    for (const v of vals) {
      const nn = n(v);
      if (nn != null && Number.isFinite(nn)) return nn;
    }
    return null;
  };
  // Heuristica anti-Wh: se um modelo antigo retornar "gerado hoje" em Wh,
  // o valor sera absurdamente alto pra ser kWh/dia (ex: 214000 pra um dia).
  // Teto fisico: 10 kWh por kWp capacidade. Sem capacidade, usa 50000 como
  // limite de sanidade (~50 MWh/dia e impossivel pra 1 inverter residencial
  // ou comercial — se vier maior, assume Wh).
  const kwhOuWh = (valor) => {
    if (valor == null) return null;
    return valor > 50000 ? valor / 1000 : valor;
  };

  // Potencia atual: ppv (DC) ou pac (AC), ambos em W. Prefere ppv.
  const powerW = primeiroValido(data?.ppv, data?.pac);
  // Hoje: todos esses campos vem em kWh conforme doc oficial Growatt V1.
  const hojeRaw = primeiroValido(
    data?.powerToday, data?.eToday, data?.eacToday,
    data?.today_energy, data?.eacTodayKwh,
  );
  // Mes: idem — kWh por padrao.
  const mesRaw = primeiroValido(
    data?.powerMonth, data?.eMonth, data?.eacMonth, data?.month_energy,
  );
  // Total: kWh.
  const totalKwh = primeiroValido(
    data?.powerTotal, data?.eTotal, data?.total_energy, data?.eacTotal,
  );

  const normalizado = {
    powerKw:            powerW != null ? powerW / 1000 : null,
    generationKwhDay:   kwhOuWh(hojeRaw),
    generationKwhMonth: kwhOuWh(mesRaw),
    generationKwhTotal: kwhOuWh(totalKwh),
    inverterTempC:      primeiroValido(data?.temperature, data?.temperature1),
  };

  return {
    // Bateria / grid (Growatt puro geracao nao tem bateria — null)
    soc: null,
    batChargePower: null,
    batDischargePower: null,
    feedinPower: null,
    gridConsumptionPower: null,
    epsPower: null,
    runningState: null,
    currentFault: data?.warnCode ? String(data.warnCode) : null,

    // Geracao
    powerKw: normalizado.powerKw,
    generationKwhDay: normalizado.generationKwhDay,
    generationKwhMonth: normalizado.generationKwhMonth,
    generationKwhTotal: normalizado.generationKwhTotal,

    ambientTempC: null,
    inverterTempC: normalizado.inverterTempC,

    detalhes: null,
    rawPayload: data,
  };
}

/**
 * Historico diario — Growatt /v1/plant/energy (seccao 4.2.6 da doc).
 * Precisa do plant_id (nao do device_sn). Primeira chamada descobre
 * o plant_id iterando /v1/device/list ate achar o device cadastrado.
 *
 * Response Growatt: { energys: [{ date: "YYYY-MM-DD", energy: kWh }, ...] }
 */
// Cache in-memory do plant_id descoberto por SN. Reduz pressao sobre o
// rate limit da Free Plan — descobrir plant_id custa 1 list + N device/list,
// o backfill em si so precisa de 1 plant/energy. Chave: SN + token hash.
// TTL: 1h (plant_id nao muda entre runs). Se o processo reiniciar perde,
// mas e aceitavel.
const PLANT_ID_CACHE = new Map();
const PLANT_ID_CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKey(sn, token) {
  // Hash simples do token pra nao guardar em memoria. 8 bytes ja bastam
  // pra chave unica desta sessao.
  let h = 0;
  for (let i = 0; i < token.length; i++) h = ((h << 5) - h + token.charCodeAt(i)) | 0;
  return `${sn}|${h >>> 0}`;
}

export async function fetchHistoricalDaily({ inverter, inicio, fim }) {
  const token = inverter.credential.apiToken;
  const apiBase = inverter.apiBase || defaultApiBase;
  const sn = inverter.inverterSn;

  // 1. Descobre plant_id. Primeiro checa cache in-memory — se bate, pula
  //    completamente a fase de descoberta e vai direto pro backfill.
  let plantId = null;
  const chaveCache = cacheKey(sn, token);
  const cached = PLANT_ID_CACHE.get(chaveCache);
  if (cached && (Date.now() - cached.at) < PLANT_ID_CACHE_TTL_MS) {
    plantId = cached.plantId;
  }

  const resumoBusca = [];
  let totalPlantasListadas = 0;
  // Colecao de TODAS plant_ids que contem o SN. O portal Growatt as vezes
  // tem multiplas plantas com o mesmo device (ex: planta antiga + nova, ou
  // conta business + end-user). Tenta cada uma ate achar dados.
  const plantIdsCandidatos = plantId ? [plantId] : [];
  if (!plantId) {
    const { plantas } = await listarTodasPlantas({ apiBase, token });
    totalPlantasListadas = plantas.length;
    for (const p of plantas) {
      try {
        const dev = await callGrowatt({
          apiBase, token,
          path: `/v1/device/list?plant_id=${p.plant_id}&page=1&perpage=100`,
          method: 'GET',
        });
        const lista = dev?.devices || [];
        const snsVistos = lista.map((d) => d.device_sn).filter(Boolean);
        resumoBusca.push(`plant_id ${p.plant_id} (${p.name}): ${lista.length} devices [${snsVistos.slice(0, 5).join(', ')}]`);
        if (lista.some((d) => d.device_sn === sn)) {
          plantIdsCandidatos.push(p.plant_id);
        }
      } catch (err) {
        resumoBusca.push(`plant_id ${p.plant_id}: erro ${(err.message || '').slice(0, 80)}`);
      }
    }
    if (plantIdsCandidatos.length > 0) {
      plantId = plantIdsCandidatos[0];
      PLANT_ID_CACHE.set(chaveCache, { plantId, at: Date.now() });
    }
  }
  if (!plantId) {
    // Detecta caso tipico de rate limit do portal Growatt: Free Plan tem
    // quota diaria bem baixa e, quando esgota, todos endpoints devolvem
    // error_code=10012 (error_frequently_access). Da pra reconhecer no
    // resumo de busca pra dar mensagem acionavel.
    const bateuRateLimit = resumoBusca.some((s) => s.includes('10012') || s.includes('frequently_access'))
      || totalPlantasListadas === 0;
    const dica = bateuRateLimit
      ? ' Portal Growatt bloqueou por rate limit (codigo 10012 = error_frequently_access). ' +
        'A Free Plan tem quota diaria baixa. Espere 1-2h e tente de novo, ' +
        'ou entre em contato com a Growatt pra upgrade de quota.'
      : '';
    throw new Error(
      `Growatt: nao achei plant_id contendo SN ${inverter.inverterSn}. ` +
      `Busca em ${totalPlantasListadas} planta(s): ${resumoBusca.join(' | ') || 'nenhuma listada'}.${dica}`
    );
  }

  // 2. Chama /v1/plant/energy em janelas de 60 dias. A API da Growatt
  //    aceita tecnicamente ranges grandes com time_unit=day, mas retorna
  //    array vazio silenciosamente se o range for > ~180 dias. A unica
  //    forma segura e dividir sempre em janelas pequenas.
  //    Tambem: alguns devices aparecem em multiplas plantas no portal
  //    (ex: planta antiga + nova, ou duplicata). Se a planta primaria
  //    nao retorna dados, tenta as outras.
  const fmt = (d) => d.toISOString().slice(0, 10);
  const JANELA_DIAS = 60;
  const SLEEP_MS = 300; // espacamento entre chamadas pra nao bater rate limit
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const puxarDePlanta = async (pid) => {
    const dados = [];
    const cursor = new Date(inicio);
    while (cursor < fim) {
      const proximo = new Date(cursor);
      proximo.setUTCDate(proximo.getUTCDate() + JANELA_DIAS);
      const end = proximo < fim ? proximo : fim;
      try {
        const r = await callGrowatt({
          apiBase, token,
          path: `/v1/plant/energy?plant_id=${pid}&start_date=${fmt(cursor)}&end_date=${fmt(end)}&time_unit=day&page=1&perpage=200`,
          method: 'GET',
        });
        for (const e of (r?.energys || [])) {
          const kwh = typeof e.energy === 'number' ? e.energy : parseFloat(e.energy);
          if (Number.isFinite(kwh)) {
            dados.push({ data: new Date(e.date + 'T00:00:00Z'), kwhGerado: kwh });
          }
        }
      } catch { /* pula janela com erro (rate limit em 1 janela nao mata tudo) */ }
      cursor.setUTCDate(cursor.getUTCDate() + JANELA_DIAS);
      await sleep(SLEEP_MS);
    }
    return dados;
  };

  // Tenta primeiro a planta primaria (cacheada / primeiro match). Se
  // retornar vazio, tenta as outras candidatas que tambem contem o SN.
  let todas = await puxarDePlanta(plantId);
  if (todas.length === 0 && plantIdsCandidatos.length > 1) {
    for (const pid of plantIdsCandidatos) {
      if (pid === plantId) continue;
      const tentativa = await puxarDePlanta(pid);
      if (tentativa.length > 0) {
        // Essa planta tem dados — atualiza cache pra usar daqui em diante
        PLANT_ID_CACHE.set(chaveCache, { plantId: pid, at: Date.now() });
        todas = tentativa;
        break;
      }
    }
  }
  return todas;
}
