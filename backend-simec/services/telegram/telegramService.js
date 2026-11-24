// Cliente da Telegram Bot API com suporte a MULTIPLOS bots.
//
// Hoje o SIMEC opera 2 bots independentes:
//   - ALERTAS   → bot historico (@Alertas-SIMEC). Env var TELEGRAM_BOT_TOKEN.
//                 Recebe alertas do sistema nos chats de grupo/departamentais.
//   - LEMBRETES → bot novo (@Lembretes-SIMEC). Env var TELEGRAM_LEMBRETES_BOT_TOKEN.
//                 Recebe lembretes pessoais no PRIVADO de cada usuario.
//
// Toda funcao exportada aceita `botTipo` opcional (default: 'ALERTAS') pra
// escolher qual bot usar. Nao mexer no default — o codigo antigo que chama
// enviarMensagem/callApi sem passar botTipo continua caindo no bot de
// alertas, que e o comportamento esperado.

const PRIORIDADE_EMOJI = { Alta: '🔴', Media: '🟡', Baixa: '🔵' };

const CATEGORIA_EMOJI = {
  MANUTENCAO:        '🔧',
  CONTRATO:          '📋',
  SEGURO:            '🛡️',
  GEHC_SAUDE:        '🏥',
  OS_CORRETIVA:      '🔩',
  RECOMENDACAO:      '💡',
  CONTROLE_QUALIDADE:'🧪',
  // Enum do backend mantido como FOXESS_ENERGIA por compatibilidade com
  // dados antigos, mas o rotulo visivel ao usuario e "Energia Solar"
  // (cobre Sungrow, Growatt e FoxESS).
  FOXESS_ENERGIA:    '☀️',
  LEMBRETE:          '🔔',
};

const CATEGORIA_LABEL = {
  MANUTENCAO:        'Manutenção',
  CONTRATO:          'Contrato',
  SEGURO:            'Seguro',
  GEHC_SAUDE:        'Saúde GEHC',
  OS_CORRETIVA:      'OS Corretiva',
  RECOMENDACAO:      'Recomendação',
  CONTROLE_QUALIDADE:'Controle de Qualidade',
  FOXESS_ENERGIA:    'Energia Solar',
  LEMBRETE:          'Lembrete',
};

// ─── Multi-bot: resolve qual token/env usar ────────────────────────────────
// Cada bot aceita MULTIPLOS nomes de env como fallback — tolera typos
// historicos e permite rename gradual. O primeiro nome encontrado ganha.
const BOT_ENV = {
  ALERTAS: {
    tokenEnv:    ['TELEGRAM_BOT_TOKEN'],
    usernameEnv: ['TELEGRAM_BOT_USERNAME'],
  },
  LEMBRETES: {
    // Aceita 'TELEGRAM_LEMBRETES_BOT_TOKEN' (nome correto) e tambem
    // 'TELEGRAM_LEMBERETES_BOT_TOKEN' (grafia alternativa ja em producao).
    tokenEnv:    ['TELEGRAM_LEMBRETES_BOT_TOKEN',    'TELEGRAM_LEMBERETES_BOT_TOKEN'],
    usernameEnv: ['TELEGRAM_LEMBRETES_BOT_USERNAME', 'TELEGRAM_LEMBERETES_BOT_USERNAME'],
  },
};

function resolveEnv(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) {
    if (process.env[k]) return process.env[k];
  }
  return null;
}

function getTokenPorTipo(botTipo = 'ALERTAS') {
  const spec = BOT_ENV[botTipo] || BOT_ENV.ALERTAS;
  return resolveEnv(spec.tokenEnv);
}

export function telegramConfigurado(botTipo = 'ALERTAS') {
  return !!getTokenPorTipo(botTipo);
}

async function callApi(method, body, botTipo = 'ALERTAS') {
  const token = getTokenPorTipo(botTipo);
  if (!token) throw new Error(`Token do bot ${botTipo} não configurado.`);

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram [${botTipo}/${method}]: ${json.description}`);
  return json.result;
}

export async function enviarMensagem(chatId, texto, botTipo = 'ALERTAS') {
  return callApi('sendMessage', {
    chat_id: chatId,
    text: texto,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }, botTipo);
}

export async function registrarWebhook(webhookUrl, botTipo = 'ALERTAS') {
  return callApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message'],
  }, botTipo);
}

export async function obterInfoBot(botTipo = 'ALERTAS') {
  return callApi('getMe', {}, botTipo);
}

// Cache in-memory de username por botTipo. getMe nunca retorna null em
// producao e username so muda se renomear o bot no BotFather. Env var tem
// prioridade pra overrides em dev.
const _botUsernameCache = {};
const _botUsernamePromises = {};

export async function getBotUsername(botTipo = 'ALERTAS') {
  const spec = BOT_ENV[botTipo] || BOT_ENV.ALERTAS;
  const envValue = resolveEnv(spec.usernameEnv);
  if (envValue) {
    return String(envValue).replace(/^@/, '');
  }
  if (_botUsernameCache[botTipo]) return _botUsernameCache[botTipo];
  if (!telegramConfigurado(botTipo)) return null;

  if (!_botUsernamePromises[botTipo]) {
    _botUsernamePromises[botTipo] = (async () => {
      try {
        const info = await obterInfoBot(botTipo);
        _botUsernameCache[botTipo] = info?.username || null;
        return _botUsernameCache[botTipo];
      } catch (err) {
        console.warn(`[TELEGRAM] getBotUsername(${botTipo}) falhou:`, err.message);
        _botUsernamePromises[botTipo] = null; // permite retry
        return null;
      }
    })();
  }
  return _botUsernamePromises[botTipo];
}

export function formatarAlerta(alerta) {
  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const prioEmoji  = PRIORIDADE_EMOJI[alerta.prioridade] || '⚪';
  const catEmoji   = CATEGORIA_EMOJI[alerta.tipoCategoria] || '📢';
  const catLabel   = CATEGORIA_LABEL[alerta.tipoCategoria] || alerta.tipoCategoria;

  let texto = `${prioEmoji} <b>${alerta.titulo}</b>\n`;
  texto += `<i>${catEmoji} ${catLabel} · ${alerta.prioridade}</i>`;

  if (alerta.subtitulo) texto += `\n\n${alerta.subtitulo}`;
  if (alerta.link && frontendUrl) texto += `\n\n🔗 ${frontendUrl}${alerta.link}`;

  return texto;
}
