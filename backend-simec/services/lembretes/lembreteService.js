// Lembretes pessoais atribuiveis dentro do tenant.
// CRUD + logica de disparo multi-canal (painel in-app + Telegram + email) +
// recorrencia (UNICA | DIARIA | SEMANAL | MENSAL).

import prisma from '../prismaService.js';
import { enviarEmail } from '../emailService.js';
import { enviarMensagem, telegramConfigurado, formatarAlerta } from '../telegram/telegramService.js';

// PAINEL   — sempre entregue (sino do SIMEC).
// TELEGRAM — envia no privado do destinatario (TelegramNotificacao com usuarioId).
// TELEGRAM_GRUPO — adiciona tambem os chats de grupo do tenant (usuarioId null).
// EMAIL    — envia pro email do destinatario.
const CANAIS_VALIDOS = new Set(['PAINEL', 'TELEGRAM', 'TELEGRAM_GRUPO', 'EMAIL']);

// Opcoes validas pra alertasAntes (em minutos). Mantem a lista fechada
// pra evitar que o front mande valores bizarros. Max 7 dias (10080 min).
const ALERTAS_ANTES_VALIDOS = new Set([5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080]);
const RECORRENCIAS_VALIDAS = new Set(['UNICA', 'DIARIA', 'SEMANAL', 'MENSAL']);
const ENTIDADE_TIPOS = new Set(['OS_CORRETIVA', 'EQUIPAMENTO', 'UNIDADE', 'SEGURO', 'CONTRATO']);

const INCLUDE_RELACOES = {
  criadoPor:    { select: { id: true, nome: true, email: true } },
  destinatario: { select: { id: true, nome: true, email: true } },
};

// ─── Validacao de payload ────────────────────────────────────────────────────
function validarPayload(payload, { parcial = false } = {}) {
  const erros = [];

  if (!parcial || payload.titulo !== undefined) {
    if (!payload.titulo || typeof payload.titulo !== 'string' || payload.titulo.trim().length === 0) {
      erros.push('Titulo e obrigatorio.');
    } else if (payload.titulo.length > 200) {
      erros.push('Titulo deve ter ate 200 caracteres.');
    }
  }

  if (!parcial || payload.lembrarEm !== undefined) {
    const d = new Date(payload.lembrarEm);
    if (!payload.lembrarEm || Number.isNaN(d.getTime())) {
      erros.push('Data/hora do lembrete invalida.');
    }
  }

  if (payload.recorrencia !== undefined && payload.recorrencia !== null && !RECORRENCIAS_VALIDAS.has(payload.recorrencia)) {
    erros.push('Recorrencia invalida.');
  }

  if (payload.canais !== undefined) {
    if (!Array.isArray(payload.canais)) {
      erros.push('Canais deve ser uma lista.');
    } else {
      const invalidos = payload.canais.filter((c) => !CANAIS_VALIDOS.has(c));
      if (invalidos.length) erros.push(`Canais invalidos: ${invalidos.join(', ')}.`);
    }
  }

  if (payload.entidadeTipo !== undefined && payload.entidadeTipo !== null && !ENTIDADE_TIPOS.has(payload.entidadeTipo)) {
    erros.push('Tipo de entidade invalido.');
  }

  if (payload.entidadeTipo && !payload.entidadeId) {
    erros.push('Entidade vinculada exige entidadeId.');
  }

  if (payload.alertasAntes !== undefined) {
    if (!Array.isArray(payload.alertasAntes)) {
      erros.push('alertasAntes deve ser uma lista de minutos.');
    } else {
      const invalidos = payload.alertasAntes.filter((n) => !Number.isInteger(n) || !ALERTAS_ANTES_VALIDOS.has(n));
      if (invalidos.length) erros.push(`alertasAntes invalidos: ${invalidos.join(', ')}.`);
    }
  }

  return erros;
}

// ─── Criacao ─────────────────────────────────────────────────────────────────
export async function criarLembrete({
  tenantId,
  criadoPorId,
  destinatarioId,
  titulo,
  descricao,
  lembrarEm,
  recorrencia = 'UNICA',
  canais = ['PAINEL'],
  alertasAntes = [],
  entidadeTipo,
  entidadeId,
  entidadeLabel,
}) {
  const payload = {
    titulo,
    lembrarEm,
    recorrencia,
    canais,
    alertasAntes,
    entidadeTipo,
    entidadeId,
  };
  const erros = validarPayload(payload);
  if (erros.length) throw Object.assign(new Error(erros.join(' ')), { status: 400 });

  const destinatarioFinal = destinatarioId || criadoPorId;

  // Guarda de tenant: destinatario tem que ser do mesmo tenant do criador.
  if (destinatarioFinal !== criadoPorId) {
    const destExiste = await prisma.usuario.findFirst({
      where: { id: destinatarioFinal, tenantId },
      select: { id: true },
    });
    if (!destExiste) throw Object.assign(new Error('Destinatario nao encontrado neste tenant.'), { status: 400 });
  }

  // PAINEL e sempre entregue; garante que esta no array mesmo que o front omita.
  const canaisFinais = Array.from(new Set(['PAINEL', ...(canais || [])]));

  // Dedup + ordena desc (pro worker processar do maior pro menor coerentemente).
  const alertasAntesFinais = Array.from(new Set((alertasAntes || []).filter((n) => ALERTAS_ANTES_VALIDOS.has(n))))
    .sort((a, b) => b - a);

  const lembrete = await prisma.lembrete.create({
    data: {
      tenantId,
      criadoPorId,
      destinatarioId: destinatarioFinal,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      lembrarEm: new Date(lembrarEm),
      recorrencia,
      canais: canaisFinais,
      alertasAntes: alertasAntesFinais,
      entidadeTipo: entidadeTipo || null,
      entidadeId: entidadeId || null,
      entidadeLabel: entidadeLabel?.trim() || null,
    },
    include: INCLUDE_RELACOES,
  });

  return lembrete;
}

// ─── Listagem (do usuario autenticado) ───────────────────────────────────────
// filtros:
//   escopo:  'meus' (recebidos) | 'criados' (criados por mim) | 'todos'
//   status:  'PENDENTE' | 'ENVIADO' | 'CONCLUIDO' | 'DESCARTADO' | 'ABERTOS' (PENDENTE+ENVIADO)
//   limite:  default 100
export async function listarLembretes({ tenantId, usuarioId, escopo = 'meus', status = 'ABERTOS', limite = 100 }) {
  const where = { tenantId };

  if (escopo === 'meus') {
    where.destinatarioId = usuarioId;
  } else if (escopo === 'criados') {
    where.criadoPorId = usuarioId;
  } else if (escopo === 'todos') {
    where.OR = [{ destinatarioId: usuarioId }, { criadoPorId: usuarioId }];
  }

  if (status === 'ABERTOS') {
    where.status = { in: ['PENDENTE', 'ENVIADO'] };
  } else if (status !== 'TODOS') {
    where.status = status;
  }

  return prisma.lembrete.findMany({
    where,
    include: INCLUDE_RELACOES,
    orderBy: [{ status: 'asc' }, { lembrarEm: 'asc' }],
    take: Math.min(Number(limite) || 100, 500),
  });
}

// ─── Contagem pro badge do sino ──────────────────────────────────────────────
// Conta lembretes ENVIADOS (ja dispararam) e PENDENTES vencidos (hora ja passou
// mas o worker ainda nao processou) que ainda nao foram lidos pelo usuario.
export async function contarBadge({ tenantId, usuarioId }) {
  const agora = new Date();
  const [naoLidos, atrasados] = await Promise.all([
    prisma.lembrete.count({
      where: {
        tenantId,
        destinatarioId: usuarioId,
        status: 'ENVIADO',
        lidoEm: null,
      },
    }),
    prisma.lembrete.count({
      where: {
        tenantId,
        destinatarioId: usuarioId,
        status: 'PENDENTE',
        lembrarEm: { lte: agora },
      },
    }),
  ]);

  return { naoLidos, atrasados, total: naoLidos + atrasados };
}

// ─── Atualizacao ─────────────────────────────────────────────────────────────
export async function atualizarLembrete({ id, tenantId, usuarioId, patch }) {
  const existente = await prisma.lembrete.findFirst({
    where: { id, tenantId },
    select: { id: true, criadoPorId: true, destinatarioId: true },
  });
  if (!existente) throw Object.assign(new Error('Lembrete nao encontrado.'), { status: 404 });

  // Permissao: so criador ou destinatario pode editar.
  if (existente.criadoPorId !== usuarioId && existente.destinatarioId !== usuarioId) {
    throw Object.assign(new Error('Sem permissao pra editar este lembrete.'), { status: 403 });
  }

  const erros = validarPayload(patch, { parcial: true });
  if (erros.length) throw Object.assign(new Error(erros.join(' ')), { status: 400 });

  const data = {};
  if (patch.titulo !== undefined)      data.titulo = patch.titulo.trim();
  if (patch.descricao !== undefined)   data.descricao = patch.descricao?.trim() || null;
  if (patch.lembrarEm !== undefined)   data.lembrarEm = new Date(patch.lembrarEm);
  if (patch.recorrencia !== undefined) data.recorrencia = patch.recorrencia;
  if (patch.canais !== undefined)      data.canais = Array.from(new Set(['PAINEL', ...patch.canais]));
  if (patch.alertasAntes !== undefined) {
    data.alertasAntes = Array.from(new Set((patch.alertasAntes || []).filter((n) => ALERTAS_ANTES_VALIDOS.has(n))))
      .sort((a, b) => b - a);
    // Reset dos avisos ja disparados — permite reenviar se o usuario mudou
    // a lista ou a data.
    data.avisosDisparados = [];
  }
  if (patch.entidadeTipo !== undefined) {
    data.entidadeTipo = patch.entidadeTipo || null;
    data.entidadeId = patch.entidadeId || null;
    data.entidadeLabel = patch.entidadeLabel?.trim() || null;
  }

  // Se editou a data E ja tinha disparado, volta pra PENDENTE pra disparar de novo.
  if (data.lembrarEm) {
    data.status = 'PENDENTE';
    data.enviadoEm = null;
    data.lidoEm = null;
  }

  return prisma.lembrete.update({
    where: { id },
    data,
    include: INCLUDE_RELACOES,
  });
}

// ─── Acoes rapidas ───────────────────────────────────────────────────────────
export async function concluirLembrete({ id, tenantId, usuarioId }) {
  const existente = await prisma.lembrete.findFirst({
    where: { id, tenantId },
    select: { id: true, criadoPorId: true, destinatarioId: true },
  });
  if (!existente) throw Object.assign(new Error('Lembrete nao encontrado.'), { status: 404 });
  if (existente.criadoPorId !== usuarioId && existente.destinatarioId !== usuarioId) {
    throw Object.assign(new Error('Sem permissao.'), { status: 403 });
  }

  return prisma.lembrete.update({
    where: { id },
    data: { status: 'CONCLUIDO', concluidoEm: new Date() },
    include: INCLUDE_RELACOES,
  });
}

export async function descartarLembrete({ id, tenantId, usuarioId }) {
  const existente = await prisma.lembrete.findFirst({
    where: { id, tenantId },
    select: { id: true, criadoPorId: true, destinatarioId: true },
  });
  if (!existente) throw Object.assign(new Error('Lembrete nao encontrado.'), { status: 404 });
  if (existente.criadoPorId !== usuarioId && existente.destinatarioId !== usuarioId) {
    throw Object.assign(new Error('Sem permissao.'), { status: 403 });
  }

  return prisma.lembrete.update({
    where: { id },
    data: { status: 'DESCARTADO' },
    include: INCLUDE_RELACOES,
  });
}

export async function excluirLembrete({ id, tenantId, usuarioId }) {
  const existente = await prisma.lembrete.findFirst({
    where: { id, tenantId },
    select: { id: true, criadoPorId: true },
  });
  if (!existente) throw Object.assign(new Error('Lembrete nao encontrado.'), { status: 404 });
  // So o criador pode excluir de vez. Destinatario pode descartar.
  if (existente.criadoPorId !== usuarioId) {
    throw Object.assign(new Error('Apenas o criador pode excluir.'), { status: 403 });
  }

  await prisma.lembrete.delete({ where: { id } });
  return { ok: true };
}

export async function marcarComoLido({ id, tenantId, usuarioId }) {
  const existente = await prisma.lembrete.findFirst({
    where: { id, tenantId, destinatarioId: usuarioId },
    select: { id: true, lidoEm: true },
  });
  if (!existente) throw Object.assign(new Error('Lembrete nao encontrado.'), { status: 404 });

  if (existente.lidoEm) return { ok: true, jaLido: true };

  await prisma.lembrete.update({
    where: { id },
    data: { lidoEm: new Date() },
  });
  return { ok: true };
}

export async function marcarTodosComoLidos({ tenantId, usuarioId }) {
  const r = await prisma.lembrete.updateMany({
    where: {
      tenantId,
      destinatarioId: usuarioId,
      status: 'ENVIADO',
      lidoEm: null,
    },
    data: { lidoEm: new Date() },
  });
  return { ok: true, atualizados: r.count };
}

// ─── Disparo (worker) ────────────────────────────────────────────────────────
// Calcula a proxima ocorrencia a partir de uma data base + recorrencia.
function calcularProximaOcorrencia(baseDate, recorrencia) {
  const d = new Date(baseDate);
  if (recorrencia === 'DIARIA')   d.setDate(d.getDate() + 1);
  if (recorrencia === 'SEMANAL')  d.setDate(d.getDate() + 7);
  if (recorrencia === 'MENSAL')   d.setMonth(d.getMonth() + 1);
  return d;
}

function montarLinkEntidade(lembrete) {
  if (!lembrete.entidadeTipo || !lembrete.entidadeId) return null;
  const base = {
    OS_CORRETIVA: '/os-corretiva',
    EQUIPAMENTO:  '/equipamentos',
    UNIDADE:      '/unidades',
    SEGURO:       '/seguros',
    CONTRATO:     '/contratos',
  };
  const prefixo = base[lembrete.entidadeTipo];
  if (!prefixo) return null;
  return `${prefixo}/${lembrete.entidadeId}`;
}

async function enviarPeloTelegram(lembrete, { avisoAntesMinutos = 0 } = {}) {
  // Lembretes usam o bot dedicado (@Lembretes-SIMEC) — separado do bot de
  // alertas do sistema. Fallback: se o token do bot de lembretes nao estiver
  // configurado, nao envia (evita que lembrete caia no grupo de alertas).
  if (!telegramConfigurado('LEMBRETES')) {
    return { ok: false, motivo: 'bot_lembretes_nao_configurado' };
  }

  // Prioridade: enviar NO PRIVADO do destinatario (TelegramNotificacao com
  // usuarioId = destinatarioId e botTipo = LEMBRETES). Chats de grupo
  // (usuarioId null) so entram se o criador marcou avisarGrupo=true —
  // guardado no array canais como "TELEGRAM_GRUPO" alem de "TELEGRAM".
  const avisarGrupo = Array.isArray(lembrete.canais) && lembrete.canais.includes('TELEGRAM_GRUPO');

  const chats = await prisma.telegramNotificacao.findMany({
    where: {
      tenantId: lembrete.tenantId,
      ativo: true,
      botTipo: 'LEMBRETES',
      OR: [
        { usuarioId: lembrete.destinatarioId },        // privado do destinatario
        ...(avisarGrupo ? [{ usuarioId: null }] : []), // grupos vinculados ao bot de lembretes (opt-in)
      ],
    },
    select: { chatId: true, usuarioId: true },
  });

  console.log(
    `[LEMBRETE_TG] lembrete=${lembrete.id} destinatarioId=${lembrete.destinatarioId} ` +
    `avisarGrupo=${avisarGrupo} chatsEncontrados=${chats.length} ` +
    `chatIds=[${chats.map((c) => `${c.chatId}(user=${c.usuarioId || 'grupo'})`).join(', ')}]`
  );

  if (chats.length === 0) {
    console.warn(
      `[LEMBRETE_TG] SEM CHAT pra lembrete=${lembrete.id} destinatarioId=${lembrete.destinatarioId} ` +
      `tenantId=${lembrete.tenantId} — verificar se o destinatario vinculou o Telegram privado.`
    );
    return {
      ok: false,
      motivo: 'sem_chat_privado_vinculado',
      detalhe: 'Destinatario nao vinculou o bot Lembretes-SIMEC e grupo nao foi marcado.',
    };
  }

  const link = montarLinkEntidade(lembrete);
  const ehAviso = avisoAntesMinutos > 0;
  const prefixo = ehAviso ? `⏰ Em ${formatarDuracaoMin(avisoAntesMinutos)}` : '🔔';
  const hora = new Date(lembrete.lembrarEm).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const texto = formatarAlerta({
    titulo: `${prefixo}: ${lembrete.titulo}`,
    subtitulo: [
      lembrete.descricao || null,
      `Agendado para: ${hora}`,
      `Para: ${lembrete.destinatario?.nome || 'voce'}`,
      lembrete.entidadeLabel ? `Referente a: ${lembrete.entidadeLabel}` : null,
    ].filter(Boolean).join('\n'),
    tipoCategoria: 'LEMBRETE',
    prioridade: 'Media',
    link,
  });

  const resultados = await Promise.allSettled(chats.map((c) => enviarMensagem(c.chatId, texto, 'LEMBRETES')));
  resultados.forEach((r, i) => {
    const chat = chats[i];
    if (r.status === 'fulfilled') {
      console.log(`[LEMBRETE_TG] ✓ enviado chatId=${chat.chatId} lembrete=${lembrete.id}`);
    } else {
      console.error(`[LEMBRETE_TG] ✗ falhou chatId=${chat.chatId} lembrete=${lembrete.id} erro=${r.reason?.message || r.reason}`);
    }
  });
  const sucessos = resultados.filter((r) => r.status === 'fulfilled').length;
  return { ok: sucessos > 0, enviados: sucessos, total: chats.length };
}

async function enviarPorEmail(lembrete, { avisoAntesMinutos = 0 } = {}) {
  const emailDest = lembrete.destinatario?.email;
  if (!emailDest) return { ok: false, motivo: 'sem_email' };

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '').split(',')[0];
  const link = montarLinkEntidade(lembrete);
  const linkBotao = link && frontendUrl ? `${frontendUrl}${link}` : (frontendUrl ? `${frontendUrl}/lembretes` : '#');

  const detalhes = {
    'Data/Hora': new Date(lembrete.lembrarEm).toLocaleString('pt-BR'),
    'Criado por': lembrete.criadoPor?.nome || '—',
  };
  if (lembrete.entidadeLabel) detalhes['Referente a'] = lembrete.entidadeLabel;
  if (lembrete.descricao)     detalhes['Observacao'] = lembrete.descricao;

  const ehAviso = avisoAntesMinutos > 0;
  const assunto = ehAviso
    ? `[SIMEC] ⏰ Em ${formatarDuracaoMin(avisoAntesMinutos)}: ${lembrete.titulo}`
    : `[SIMEC] Lembrete: ${lembrete.titulo}`;
  const mensagem = ehAviso
    ? `Aviso antecipado: este lembrete esta marcado pra daqui ${formatarDuracaoMin(avisoAntesMinutos)}.`
    : 'Voce tem um lembrete programado no SIMEC:';

  await enviarEmail({
    para: emailDest,
    assunto,
    dadosTemplate: {
      nomeDestinatario: lembrete.destinatario?.nome || 'usuario',
      tituloAlerta: lembrete.titulo,
      mensagemPrincipal: mensagem,
      detalhes,
      textoBotao: link ? 'Abrir' : 'Ver lembretes',
      linkBotao,
    },
  });
  return { ok: true };
}

/** Formata minutos em algo humano: "15 min", "1h", "2h 30min", "1 dia", "2 dias". */
function formatarDuracaoMin(minutos) {
  const abs = Math.abs(minutos);
  if (abs < 60) return `${abs} min`;
  if (abs < 1440) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}min`;
  }
  const dias = Math.round(abs / 1440);
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

function emitirRealtime(lembrete) {
  try {
    const io = global.io;
    if (!io) return;
    io.emit(`lembrete:${lembrete.tenantId}:${lembrete.destinatarioId}`, {
      tipo: 'novo',
      lembrete: {
        id: lembrete.id,
        titulo: lembrete.titulo,
        lembrarEm: lembrete.lembrarEm,
        entidadeTipo: lembrete.entidadeTipo,
        entidadeId: lembrete.entidadeId,
      },
    });
  } catch (err) {
    console.warn('[LEMBRETE_REALTIME]', err.message);
  }
}

/**
 * Processa todos os lembretes pendentes cuja hora ja chegou + dispara avisos
 * antecipados dos que ainda estao no futuro mas cruzaram o limiar (ex: "15min
 * antes" de um lembrete marcado pra daqui 10min).
 *
 * Chamado pelo worker a cada 1min. Idempotente — avisos ja enviados ficam em
 * avisosDisparados, nao dispara 2 vezes.
 */
export async function processarLembretesPendentes() {
  const agora = new Date();

  // Avisos antecipados primeiro — processa SEPARADO pra nao conflitar com o
  // disparo principal (que muda status pra ENVIADO).
  const avisosResultado = await processarAvisosAntecipados({ agora });

  const pendentes = await prisma.lembrete.findMany({
    where: {
      status: 'PENDENTE',
      lembrarEm: { lte: agora },
    },
    include: INCLUDE_RELACOES,
    take: 200,
    orderBy: { lembrarEm: 'asc' },
  });

  if (pendentes.length === 0) {
    return { ok: true, processados: 0, avisosAntecipados: avisosResultado };
  }

  let sucessos = 0;
  let falhas = 0;

  for (const lembrete of pendentes) {
    try {
      // Dispara canais em paralelo (painel = sempre, demais = opt-in).
      const tarefas = [];
      if (lembrete.canais.includes('TELEGRAM')) tarefas.push(enviarPeloTelegram(lembrete).catch((e) => ({ ok: false, erro: e.message })));
      if (lembrete.canais.includes('EMAIL'))    tarefas.push(enviarPorEmail(lembrete).catch((e) => ({ ok: false, erro: e.message })));
      await Promise.all(tarefas);

      emitirRealtime(lembrete);

      // Marca como enviado.
      await prisma.lembrete.update({
        where: { id: lembrete.id },
        data: { status: 'ENVIADO', enviadoEm: new Date() },
      });

      // Se recorrente, agenda proxima ocorrencia num NOVO lembrete filho.
      if (lembrete.recorrencia && lembrete.recorrencia !== 'UNICA') {
        const proximaData = calcularProximaOcorrencia(lembrete.lembrarEm, lembrete.recorrencia);
        await prisma.lembrete.create({
          data: {
            tenantId:       lembrete.tenantId,
            criadoPorId:    lembrete.criadoPorId,
            destinatarioId: lembrete.destinatarioId,
            titulo:         lembrete.titulo,
            descricao:      lembrete.descricao,
            lembrarEm:      proximaData,
            recorrencia:    lembrete.recorrencia,
            canais:         lembrete.canais,
            alertasAntes:   lembrete.alertasAntes,
            entidadeTipo:   lembrete.entidadeTipo,
            entidadeId:     lembrete.entidadeId,
            entidadeLabel:  lembrete.entidadeLabel,
            status:         'PENDENTE',
          },
        });
      }

      sucessos += 1;
    } catch (err) {
      console.error(`[LEMBRETE_DISPATCH] Erro no lembrete ${lembrete.id}:`, err.message);
      falhas += 1;
    }
  }

  return { ok: true, processados: pendentes.length, sucessos, falhas, avisosAntecipados: avisosResultado };
}

/**
 * Processa avisos antecipados: pra cada lembrete PENDENTE no futuro com
 * alertasAntes definido, dispara os avisos cujo limiar (lembrarEm - minutos)
 * ja passou e que ainda nao foram enviados (nao estao em avisosDisparados).
 *
 * Idempotente: marca cada aviso enviado em avisosDisparados pra nao duplicar.
 * Nao altera o status do lembrete — o disparo principal segue separado.
 */
async function processarAvisosAntecipados({ agora }) {
  const candidatos = await prisma.lembrete.findMany({
    where: {
      status: 'PENDENTE',
      lembrarEm: { gt: agora },  // ainda no futuro — o principal ainda nao chegou
      // Postgres: alertas_antes != '{}' seleciona lembretes com alguma config
      NOT: { alertasAntes: { equals: [] } },
    },
    include: INCLUDE_RELACOES,
    take: 500,
  });

  if (candidatos.length === 0) return { avaliados: 0, enviados: 0 };

  let enviados = 0;

  for (const lembrete of candidatos) {
    const alvoMs = new Date(lembrete.lembrarEm).getTime();
    const jaDisparados = new Set(lembrete.avisosDisparados || []);

    // Minutos que ainda nao foram disparados e cujo limiar ja chegou.
    const paraDisparar = (lembrete.alertasAntes || [])
      .filter((min) => !jaDisparados.has(min))
      .filter((min) => (alvoMs - min * 60_000) <= agora.getTime());

    if (paraDisparar.length === 0) continue;

    for (const minutos of paraDisparar) {
      try {
        const tarefas = [];
        if (lembrete.canais.includes('TELEGRAM')) {
          tarefas.push(enviarPeloTelegram(lembrete, { avisoAntesMinutos: minutos })
            .catch((e) => console.error(`[LEMBRETE_AVISO] telegram falhou:`, e.message)));
        }
        if (lembrete.canais.includes('EMAIL')) {
          tarefas.push(enviarPorEmail(lembrete, { avisoAntesMinutos: minutos })
            .catch((e) => console.error(`[LEMBRETE_AVISO] email falhou:`, e.message)));
        }
        await Promise.all(tarefas);

        // Marca como disparado ATOMICAMENTE (append sem substituir o array).
        await prisma.lembrete.update({
          where: { id: lembrete.id },
          data: { avisosDisparados: { push: minutos } },
        });
        enviados += 1;
      } catch (err) {
        console.error(`[LEMBRETE_AVISO] erro no lembrete ${lembrete.id} aviso ${minutos}min:`, err.message);
      }
    }
  }

  return { avaliados: candidatos.length, enviados };
}
