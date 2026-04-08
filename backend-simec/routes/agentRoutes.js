// simec/backend-simec/routes/agentRoutes.js
import express from 'express';
import { RoteadorAgente } from '../services/agent/router.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ROTA: POST /api/agent/chat
 * DESCRIÇÃO: Ponto de entrada para conversas com o agente do SIMEC.
 * ACESSO: Protegido por JWT.
 */
router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;

    if (!mensagem || mensagem.trim() === '') {
        return res.status(400).json({
            message: 'Por favor, digite uma mensagem para o agente.'
        });
    }

    try {
        const resposta = await RoteadorAgente(mensagem, req.usuario.nome);

        // Caso 1: fluxo legado ou resposta simples em texto
        if (typeof resposta === 'string') {
            return res.json({
                resposta: {
                    mensagem: resposta
                }
            });
        }

        // Caso 2: resposta estruturada moderna
        if (resposta && typeof resposta === 'object') {
            return res.json({
                resposta: {
                    mensagem: resposta.mensagem || 'Operação concluída.',
                    acao: resposta.acao || null,
                    contexto: resposta.contexto || null,
                    meta: resposta.meta || null
                }
            });
        }

        // Caso 3: fallback extremo
        return res.json({
            resposta: {
                mensagem: 'Recebi sua solicitação, mas não consegui montar uma resposta válida.'
            }
        });

    } catch (error) {
        console.error(`[AGENT_CONTROLLER_ERROR] Usuário: ${req.usuario.nome} | Erro:`, error.message);

        return res.status(500).json({
            resposta: {
                mensagem: 'O agente encontrou uma instabilidade técnica. Tente novamente em alguns instantes.'
            },
            error: true
        });
    }
});

export default router;