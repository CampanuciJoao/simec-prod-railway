// Ficheiro: simec/backend-simec/routes/agentRoutes.js
// VERSÃO 2.0 - COM VALIDAÇÃO DE ENTRADA E LOGS DE ERRO DETALHADOS

import express from 'express';
import { processarComandoAgente } from '../services/agentService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ROTA: POST /api/agent/chat
 * FINALIDADE: Receber comandos e dúvidas do usuário e processar via Gemini IA.
 * ACESSO: Protegido (Requer Token JWT válido).
 */
router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;

    // 1. Validação: Impede que o servidor gaste recursos com mensagens vazias
    if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ message: "A mensagem não pode estar vazia." });
    }

    try {
        // 2. Processamento: Envia para o serviço do agente passando o nome do usuário logado
        // O nome vem do middleware 'proteger' que populou req.usuario
        const resposta = await processarComandoAgente(mensagem, req.usuario.nome);
        
        // 3. Sucesso: Retorna a resposta gerada pela IA
        res.json({ resposta });

    } catch (error) {
        // 4. Tratamento de Erro: Registra o erro no log do servidor (Railway)
        console.error(`[AGENT_ROUTE_ERROR] Erro ao processar chat para o usuário ${req.usuario?.nome}:`, error.message);

        // Retorna status 500 mas com uma mensagem que o frontend pode tratar
        res.status(500).json({ 
            message: "O Agente SIMEC está indisponível no momento.",
            details: error.message 
        });
    }
});

export default router;