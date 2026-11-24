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
  entidadeTipo,
  entidadeId,
  entidadeLabel,
}) {
  const payload = {
    titulo,
    lembrarEm,
    recorrencia,
    canais,
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

async function enviarPeloTelegram(lembrete) {
  if (!telegramConfigurado()) return { ok: false, motivo: 'bot_nao_configurado' };

  // Prioridade: enviar NO PRIVADO do destinatario (TelegramNotificacao com
  // usuarioId = destinatarioId). Chats de grupo (usuarioId null) so entram
  // se o criador marcou avisarGrupo=true — guardado no array canais como
  // "TELEGRAM_GRUPO" alem de "TELEGRAM".
  const avisarGrupo = Array.isArray(lembrete.canais) && lembrete.canais.includes('TELEGRAM_GRUPO');

  const chats = await prisma.telegramNotificacao.findMany({
    where: {
      tenantId: lembrete.tenantId,
      ativo: true,
      OR: [
        { usuarioId: lembrete.destinatarioId },                       // privado do destinatario
        ...(avisarGrupo ? [{ usuarioId: null }] : []),                // grupos (opt-in)
      ],
    },
    select: { chatId: true, usuarioId: true },
  });

  if (chats.length === 0) {
    return {
      ok: false,
      motivo: 'sem_chat_privado_vinculado',
      detalhe: 'Destinatario nao vinculou o Telegram privado e grupo nao foi marcado.',
    };
  }

  const link = montarLinkEntidade(lembrete);
  const texto = formatarAlerta({
    titulo: `🔔 ${lembrete.titulo}`,
    subtitulo: [
      lembrete.descricao || null,
      `Para: ${lembrete.destinatario?.nome || 'voce'}`,
      lembrete.entidadeLabel ? `Referente a: ${lembrete.entidadeLabel}` : null,
    ].filter(Boolean).join('\n'),
    tipoCategoria: 'LEMBRETE',
    prioridade: 'Media',
    link,
  });

  const resultados = await Promise.allSettled(chats.map((c) => enviarMensagem(c.chatId, texto)));
  const sucessos = resultados.filter((r) => r.status === 'fulfilled').length;
  return { ok: sucessos > 0, enviados: sucessos, total: chats.length };
}

async function enviarPorEmail(lembrete) {
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

  await enviarEmail({
    para: emailDest,
    assunto: `[SIMEC] Lembrete: ${lembrete.titulo}`,
    dadosTemplate: {
      nomeDestinatario: lembrete.destinatario?.nome || 'usuario',
      tituloAlerta: lembrete.titulo,
      mensagemPrincipal: 'Voce tem um lembrete programado no SIMEC:',
      detalhes,
      textoBotao: link ? 'Abrir' : 'Ver lembretes',
      linkBotao,
    },
  });
  return { ok: true };
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
 * Processa todos os lembretes pendentes cuja hora ja chegou.
 * Chamado pelo worker a cada 1min.
 */
export async function processarLembretesPendentes() {
  const agora = new Date();

  const pendentes = await prisma.lembrete.findMany({
    where: {
      status: 'PENDENTE',
      lembrarEm: { lte: agora },
    },
    include: INCLUDE_RELACOES,
    take: 200,
    orderBy: { lembrarEm: 'asc' },
  });

  if (pendentes.length === 0) return { ok: true, processados: 0 };

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

  return { ok: true, processados: pendentes.length, sucessos, falhas };
}
