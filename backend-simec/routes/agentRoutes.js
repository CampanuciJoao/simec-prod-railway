// Ficheiro: simec/backend-simec/routes/agentRoutes.js
// VERSÃO 3.0 - DIAGNÓSTICO INTEGRADO E TRATAMENTO DE ERROS DA IA

import express from 'express';
import { processarComandoAgente } from '../services/agentService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ROTA: POST /api/agent/chat
 * FINALIDADE: Endpoint principal para interação com o Agente Guardião SIMEC.
 * REQUISITO: Usuário autenticado.
 */
router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;

    // 1. Validação de segurança básica: impede requisições sem conteúdo.
    if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ message: "Por favor, digite uma mensagem para o Agente." });
    }

    try {
        // 2. Extração segura dos dados do usuário logado vindo do middleware 'proteger'.
        const nomeUsuario = req.usuario?.nome || "Administrador";

        // 3. Chamada ao motor de IA no Service.
        const resposta = await processarComandoAgente(mensagem, nomeUsuario);
        
        // 4. Sucesso: Retorna o texto gerado pelo Gemini.
        res.json({ resposta });

    } catch (error) {
        // 5. Tratamento de Erros Críticos (Visíveis no Log do Railway).
        console.error(`[AGENT_ERROR] Usuário: ${req.usuario?.nome || 'Desconhecido'} | Falha:`, error.message);

        // Retorna a falha de forma amigável no chat para que o usuário saiba o que houve.
        // O status continua 500 para o frontend exibir a notificação de erro caso necessário.
        res.status(500).json({ 
            message: "O Agente SIMEC encontrou uma dificuldade técnica.",
            resposta: `[AVISO DO SISTEMA]: Não consegui processar seu pedido agora. Motivo: ${error.message}`,
            error: true
        });
    }
});

export default router;