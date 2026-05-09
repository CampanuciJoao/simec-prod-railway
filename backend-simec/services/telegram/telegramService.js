const PRIORIDADE_EMOJI = { Alta: '🔴', Media: '🟡', Baixa: '🔵' };

const CATEGORIA_EMOJI = {
  MANUTENCAO:   '🔧',
  CONTRATO:     '📋',
  SEGURO:       '🛡️',
  GEHC_SAUDE:   '🏥',
  OS_CORRETIVA: '🔩',
  RECOMENDACAO: '💡',
};

const CATEGORIA_LABEL = {
  MANUTENCAO:   'Manutenção',
  CONTRATO:     'Contrato',
  SEGURO:       'Seguro',
  GEHC_SAUDE:   'Saúde GEHC',
  OS_CORRETIVA: 'OS Corretiva',
  RECOMENDACAO: 'Recomendação',
};

export function telegramConfigurado() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

async function callApi(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado.');

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram [${method}]: ${json.description}`);
  return json.result;
}

export async function enviarMensagem(chatId, texto) {
  return callApi('sendMessage', {
    chat_id: chatId,
    text: texto,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

export async function registrarWebhook(webhookUrl) {
  return callApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message'],
  });
}

export async function obterInfoBot() {
  return callApi('getMe', {});
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
