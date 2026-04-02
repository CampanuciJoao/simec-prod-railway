// Ficheiro: simec/backend-simec/routes/agentRoutes.js
import express from 'express';
import { processarComandoAgente } from '../services/agentService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;
    try {
        const resposta = await processarComandoAgente(mensagem, req.usuario.nome);
        res.json({ resposta });
    } catch (error) {
        console.error("Erro no Agente:", error);
        res.status(500).json({ message: "O Agente SIMEC está indisponível no momento." });
    }
});

export default router;