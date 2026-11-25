// Rotas de Lembretes pessoais.
// Todas as rotas abaixo exigem autenticacao (middleware proteger ja aplicado
// em server.js). Tenant isolado por req.tenantContext.
//
//   GET    /api/lembretes                  lista lembretes do usuario autenticado
//   GET    /api/lembretes/badge            contagem para o sino no header
//   POST   /api/lembretes                  cria novo lembrete
//   PATCH  /api/lembretes/:id              atualiza campos de um lembrete
//   DELETE /api/lembretes/:id              exclui (apenas criador)
//   POST   /api/lembretes/:id/concluir     marca como concluido
//   POST   /api/lembretes/:id/descartar    descarta (destinatario nao quer mais)
//   POST   /api/lembretes/:id/lido         marca a notificacao como lida no painel
//   POST   /api/lembretes/marcar-todos-lidos  marca todos como lidos (sino → "limpar")

import express from 'express';
import {
  criarLembrete,
  listarLembretes,
  contarBadge,
  atualizarLembrete,
  concluirLembrete,
  descartarLembrete,
  excluirLembrete,
  marcarComoLido,
  marcarTodosComoLidos,
} from '../services/lembretes/lembreteService.js';
import prisma from '../services/prismaService.js';

const router = express.Router();

// GET /api/lembretes?escopo=meus|criados|todos&status=ABERTOS|PENDENTE|...
router.get('/', async (req, res) => {
  try {
    const items = await listarLembretes({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      escopo: req.query.escopo || 'meus',
      status: req.query.status || 'ABERTOS',
      limite: req.query.limite,
    });
    res.json(items);
  } catch (err) {
    console.error('[LEMBRETES_LIST]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao listar lembretes.' });
  }
});

// GET /api/lembretes/badge — usado pelo sino no header a cada 60s.
router.get('/badge', async (req, res) => {
  try {
    const r = await contarBadge({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(r);
  } catch (err) {
    console.error('[LEMBRETES_BADGE]', err);
    res.status(500).json({ message: 'Erro ao contar lembretes.' });
  }
});

// GET /api/lembretes/usuarios — lista de usuarios do tenant pra select
// "atribuir para". Nao expoe email, so id + nome (minimiza exposicao).
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { tenantId: req.tenantContext },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
    res.json(usuarios);
  } catch (err) {
    console.error('[LEMBRETES_USUARIOS]', err);
    res.status(500).json({ message: 'Erro ao buscar usuarios.' });
  }
});

// POST /api/lembretes
router.post('/', async (req, res) => {
  try {
    const l = await criarLembrete({
      tenantId: req.tenantContext,
      criadoPorId: req.usuario.id,
      destinatarioId: req.body.destinatarioId || req.usuario.id,
      titulo: req.body.titulo,
      descricao: req.body.descricao,
      lembrarEm: req.body.lembrarEm,
      recorrencia: req.body.recorrencia,
      canais: req.body.canais,
      entidadeTipo: req.body.entidadeTipo,
      entidadeId: req.body.entidadeId,
      entidadeLabel: req.body.entidadeLabel,
    });
    res.status(201).json(l);
  } catch (err) {
    console.error('[LEMBRETES_CREATE]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao criar lembrete.' });
  }
});

// PATCH /api/lembretes/:id
router.patch('/:id', async (req, res) => {
  try {
    const l = await atualizarLembrete({
      id: req.params.id,
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      patch: req.body,
    });
    res.json(l);
  } catch (err) {
    console.error('[LEMBRETES_UPDATE]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao atualizar.' });
  }
});

// DELETE /api/lembretes/:id
router.delete('/:id', async (req, res) => {
  try {
    await excluirLembrete({
      id: req.params.id,
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.status(204).send();
  } catch (err) {
    console.error('[LEMBRETES_DELETE]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao excluir.' });
  }
});

// POST /api/lembretes/:id/concluir
router.post('/:id/concluir', async (req, res) => {
  try {
    const l = await concluirLembrete({
      id: req.params.id,
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(l);
  } catch (err) {
    console.error('[LEMBRETES_CONCLUIR]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao concluir.' });
  }
});

// POST /api/lembretes/:id/descartar
router.post('/:id/descartar', async (req, res) => {
  try {
    const l = await descartarLembrete({
      id: req.params.id,
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(l);
  } catch (err) {
    console.error('[LEMBRETES_DESCARTAR]', err);
    res.status(err.status || 500).json({ message: err.message || 'Erro ao descartar.' });
  }
});

// POST /api/lembretes/:id/lido
router.post('/:id/lido', async (req, res) => {
  try {
    const r = await marcarComoLido({
      id: req.params.id,
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(r);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Erro.' });
  }
});

// POST /api/lembretes/marcar-todos-lidos
router.post('/marcar-todos-lidos', async (req, res) => {
  try {
    const r = await marcarTodosComoLidos({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
    });
    res.json(r);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erro.' });
  }
});

// GET /api/lembretes/debug/estado — diagnostico de por que lembretes nao
// chegam no Telegram. Exige usuario autenticado; mostra apenas registros
// do PROPRIO tenant pra nao vazar dados cross-tenant.
router.get('/debug/estado', async (req, res) => {
  try {
    const tenantId = req.tenantContext;
    const usuarioId = req.usuario.id;

    const chatsLembretes = await prisma.telegramNotificacao.findMany({
      where: { tenantId, botTipo: 'LEMBRETES' },
      select: { id: true, chatId: true, nome: true, usuarioId: true, chatType: true, ativo: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
    });

    const lembretes = await prisma.lembrete.findMany({
      where: { tenantId },
      orderBy: { criadoEm: 'desc' },
      take: 10,
      select: {
        id: true, titulo: true, status: true, lembrarEm: true, enviadoEm: true,
        criadoPorId: true, destinatarioId: true, canais: true, alertasAntes: true,
        avisosDisparados: true, criadoEm: true,
      },
    });

    const simulacao = [];
    for (const l of lembretes.filter(x => x.canais?.includes('TELEGRAM'))) {
      const avisarGrupo = l.canais.includes('TELEGRAM_GRUPO');
      const match = await prisma.telegramNotificacao.findMany({
        where: {
          tenantId: l.tenantId || tenantId,
          ativo: true,
          botTipo: 'LEMBRETES',
          OR: [
            { usuarioId: l.destinatarioId },
            ...(avisarGrupo ? [{ usuarioId: null }] : []),
          ],
        },
        select: { chatId: true, usuarioId: true, nome: true, chatType: true, ativo: true },
      });
      simulacao.push({
        lembreteId: l.id,
        titulo: l.titulo,
        destinatarioId: l.destinatarioId,
        avisarGrupo,
        matchCount: match.length,
        matches: match,
      });
    }

    const env = {
      TELEGRAM_LEMBRETES_BOT_TOKEN: !!process.env.TELEGRAM_LEMBRETES_BOT_TOKEN,
      TELEGRAM_LEMBERETES_BOT_TOKEN: !!process.env.TELEGRAM_LEMBERETES_BOT_TOKEN,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    };

    res.json({
      meuUsuarioId: usuarioId,
      tenantId,
      env,
      chatsLembretes,
      lembretesRecentes: lembretes,
      simulacaoMatch: simulacao,
    });
  } catch (err) {
    console.error('[LEMBRETES_DEBUG]', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

export default router;
