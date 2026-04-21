// Ficheiro: routes/agentRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import { RoteadorAgente } from '../services/agent/index.js';
import { proteger } from '../middleware/authMiddleware.js';
import { AgentSessionRepository } from '../services/agent/session/agentSessionRepository.js';
import { getSessionKey } from '../services/agent/core/sessionKeys.js';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Endpoint principal do agente conversacional.
 * Requer autenticação e contexto multi-tenant válido.
 */
router.post('/chat', proteger, async (req, res) => {
  const mensagem = req.body?.mensagem;

  if (!mensagem || typeof mensagem !== 'string' || mensagem.trim() === '') {
    return res.status(400).json({
      resposta: {
        mensagem: 'Por favor, digite uma mensagem para o agente.',
        acao: null,
        contexto: null,
        meta: null,
      },
    });
  }

  try {
    const usuarioId = req.usuario?.id;
    const tenantId = req.usuario?.tenantId;
    const usuarioNome = req.usuario?.nome || 'Usuário';

    if (!usuarioId || !tenantId) {
      return res.status(401).json({
        resposta: {
          mensagem:
            'Sessão inválida. Não foi possível identificar usuário ou tenant.',
          acao: null,
          contexto: null,
          meta: null,
        },
      });
    }

    const resultado = await RoteadorAgente({
      mensagem: mensagem.trim(),
      usuarioId,
      usuarioNome,
      tenantId,
    });

    if (typeof resultado === 'string') {
      return res.status(200).json({
        resposta: {
          mensagem: resultado,
          acao: null,
          contexto: null,
          meta: null,
        },
      });
    }

    if (resultado && typeof resultado === 'object') {
      return res.status(200).json({
        resposta: {
          mensagem: resultado.mensagem || 'Operação concluída.',
          acao: resultado.acao || null,
          contexto: resultado.contexto || null,
          meta: resultado.meta || null,
        },
      });
    }

    return res.status(200).json({
      resposta: {
        mensagem:
          'Recebi sua solicitação, mas não consegui montar uma resposta válida.',
        acao: null,
        contexto: null,
        meta: null,
      },
    });
  } catch (error) {
    console.error(
      `[AGENT_CHAT_ERROR] Usuário: ${req.usuario?.nome || 'desconhecido'} | Tenant: ${req.usuario?.tenantId || 'desconhecido'} | Erro:`,
      error
    );

    return res.status(500).json({
      resposta: {
        mensagem: 'Tive um problema ao processar sua solicitação.',
        acao: null,
        contexto: null,
        meta: null,
      },
    });
  }
});

router.post('/reset', proteger, async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    const tenantId = req.usuario?.tenantId;

    if (!usuarioId || !tenantId) {
      return res.status(401).json({
        resposta: {
          mensagem: 'Sessão inválida. Não foi possível reiniciar o agente.',
          acao: null,
          contexto: null,
          meta: {
            reason: 'INVALID_SESSION',
          },
        },
      });
    }

    const sessionKey = getSessionKey(usuarioId, tenantId);
    const resultado = await AgentSessionRepository.cancelarSessoesAtivasDoUsuario(
      tenantId,
      sessionKey
    );

    return res.status(200).json({
      resposta: {
        mensagem: 'Conversa reiniciada. Como posso ajudar você?',
        acao: null,
        contexto: null,
        meta: {
          reason: 'RESET_CONFIRMED',
          cancelledSessions: resultado?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('[AGENT_RESET_ERROR]', error);

    return res.status(500).json({
      resposta: {
        mensagem: 'Não consegui reiniciar o agente agora. Tente novamente.',
        acao: null,
        contexto: null,
        meta: {
          reason: 'RESET_ERROR',
        },
      },
    });
  }
});

export default router;
