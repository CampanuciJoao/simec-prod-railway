import express from 'express';
import { processarComandoAgente } from '../services/agentService.js';

const router = express.Router();

/**
 * ROTA DE TESTE: POST /api/agent/chat
 * Middleware 'proteger' removido temporariamente para testes.
 */
router.post('/chat', async (req, res) => {
    const { mensagem } = req.body;

    if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ message: "Por favor, digite uma mensagem." });
    }

    try {
        // Envia para o processador de IA
        const respostaDaIA = await processarComandoAgente(mensagem, "Administrador");
        
        return res.json({ resposta: respostaDaIA });

    } catch (error) {
        console.error(`[ROTA_AGENTE_ERRO] Falha:`, error.message);

        return res.status(500).json({ 
            message: "O Agente Guardião encontrou uma instabilidade.",
            resposta: `ERRO: ${error.message}`,
            error: true
        });
    }
});

export default router;