// simec/backend-simec/routes/agentRoutes.js
import express from 'express';
import { RoteadorAgente } from '../services/agent/router.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', proteger, async (req, res) => {
    const mensagem = req.body?.mensagem;

    if (!mensagem || typeof mensagem !== 'string' || mensagem.trim() === '') {
        return res.status(400).json({
            resposta: {
                mensagem: 'Por favor, digite uma mensagem para o agente.',
                acao: null,
                contexto: null,
                meta: null
            }
        });
    }

    try {
        const usuarioNome =
            req.usuario?.nome ||
            req.user?.nome ||
            req.usuario?.name ||
            'Usuário';

        const resultado = await RoteadorAgente(mensagem.trim(), usuarioNome);

        // 1) Compatibilidade com retorno legado em string
        if (typeof resultado === 'string') {
            return res.json({
                resposta: {
                    mensagem: resultado,
                    acao: null,
                    contexto: null,
                    meta: null
                }
            });
        }

        // 2) Retorno estruturado esperado
        if (resultado && typeof resultado === 'object') {
            return res.json({
                resposta: {
                    mensagem: resultado.mensagem || 'Operação concluída.',
                    acao: resultado.acao || null,
                    contexto: resultado.contexto || null,
                    meta: resultado.meta || null
                }
            });
        }

        // 3) Fallback defensivo
        return res.json({
            resposta: {
                mensagem: 'Recebi sua solicitação, mas não consegui montar uma resposta válida.',
                acao: null,
                contexto: null,
                meta: null
            }
        });
    } catch (error) {
        console.error(
            `[AGENT_CHAT_ERROR] Usuário: ${req.usuario?.nome || 'desconhecido'} | Erro:`,
            error
        );

        return res.status(500).json({
            resposta: {
                mensagem: 'Tive um problema ao processar sua solicitação.',
                acao: null,
                contexto: null,
                meta: null
            }
        });
    }
});

export default router;