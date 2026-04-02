// Ficheiro: simec/backend-simec/routes/agentRoutes.js
// VERSÃO 4.0 - SINCRONIZADA COM SERVICE v6.0 (SOLUÇÃO DE LOOP DE ERROS)

import express from 'express';
import { processarComandoAgente } from '../services/agentService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ROTA: POST /api/agent/chat
 * FINALIDADE: Receber comandos do usuário e processar via Agente SIMEC (IA).
 * SEGURANÇA: Requer Token JWT.
 */
router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;

    // 1. Validação: Impede que o sistema processe mensagens vazias.
    if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ message: "Por favor, digite uma mensagem." });
    }

    try {
        // 2. Extrai o nome do usuário populado pelo middleware de proteção.
        const nomeDoUsuario = req.usuario?.nome || "Administrador";

        // 3. Envia para o processador de IA no Service.
        const respostaDaIA = await processarComandoAgente(mensagem, nomeDoUsuario);
        
        // 4. Sucesso: Retorna a resposta da IA no formato JSON esperado pelo Frontend.
        return res.json({ resposta: respostaDaIA });

    } catch (error) {
        // 5. Erro: Registra o problema detalhado no console do Railway para análise técnica.
        console.error(`[ROTA_AGENTE_ERRO] Falha na comunicação:`, error.message);

        // Retorna Status 500 mas com a chave 'resposta' preenchida com o erro.
        // Isso permite que o componente ChatBot.jsx mostre a causa da falha no balão de chat.
        return res.status(500).json({ 
            message: "O Agente Guardião encontrou uma instabilidade.",
            resposta: `[AVISO TÉCNICO]: ${error.message}`,
            error: true
        });
    }
});

export default router;