// Ficheiro: routes/agentRoutes.js
// Versão: Multi-tenant hardened

import express from 'express';
import { randomUUID } from 'node:crypto';
import { RoteadorAgente } from '../services/agent/index.js';
import { proteger } from '../middleware/authMiddleware.js';
import { AgentSessionRepository } from '../services/agent/session/agentSessionRepository.js';
import {
  logAgentError,
  logAgentStage,
} from '../services/agent/core/agentLogger.js';
import { getSessionKey } from '../services/agent/core/sessionKeys.js';

const router = express.Router();

/**
 * POST /api/agent/chat
 * Endpoint principal do agente conversacional.
 * Requer autenticação e contexto multi-tenant válido.
 */
router.post('/chat', proteger, async (req, res) => {
  const mensagem = req.body?.mensagem;
  const requestId = randomUUID();

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
    const mensagemNormalizada = mensagem.trim();
    const logContext = {
      requestId,
      tenantId,
      usuarioId,
      usuarioNome,
    };

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

    logAgentStage('AGENT_REQUEST', logContext, {
      route: '/api/agent/chat',
      mensagem: mensagemNormalizada,
    });

    const resultado = await RoteadorAgente({
      mensagem: mensagemNormalizada,
      usuarioId,
      usuarioNome,
      tenantId,
      requestId,
    });

    if (typeof resultado === 'string') {
      logAgentStage('AGENT_RESPONSE', logContext, {
        responseType: 'string',
        mensagem: resultado,
      });

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
      logAgentStage('AGENT_RESPONSE', logContext, {
        responseType: 'object',
        mensagem: resultado.mensagem || 'Operação concluída.',
        meta: resultado.meta || null,
        acao: resultado.acao || null,
      });

      return res.status(200).json({
        resposta: {
          mensagem: resultado.mensagem || 'Operação concluída.',
          acao: resultado.acao || null,
          contexto: resultado.contexto || null,
          meta: resultado.meta || null,
        },
      });
    }

    logAgentStage('AGENT_RESPONSE', logContext, {
      responseType: 'fallback',
      mensagem:
        'Recebi sua solicitação, mas não consegui montar uma resposta válida.',
    });

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
    logAgentError(
      'AGENT_CHAT_ERROR',
      error,
      {
        requestId,
        tenantId: req.usuario?.tenantId || null,
        usuarioId: req.usuario?.id || null,
        usuarioNome: req.usuario?.nome || 'desconhecido',
      },
      {
        route: '/api/agent/chat',
      }
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

    logAgentStage(
      'AGENT_RESET',
      {
        tenantId,
        usuarioId,
        usuarioNome: req.usuario?.nome || 'Usuário',
      },
      {
        cancelledSessions: resultado?.count || 0,
      }
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
    logAgentError(
      'AGENT_RESET_ERROR',
      error,
      {
        tenantId: req.usuario?.tenantId || null,
        usuarioId: req.usuario?.id || null,
        usuarioNome: req.usuario?.nome || 'desconhecido',
      }
    );

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
