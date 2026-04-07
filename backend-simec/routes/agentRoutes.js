// simec/backend-simec/routes/agentRoutes.js
import express from 'express';
import { RoteadorAgente } from '../services/agent/router.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * ROTA: POST /api/agent/chat
 * DESCRIÇÃO: Ponto de entrada para conversas com o Agente Guardião.
 * ACESSO: Protegido por JWT.
 */
router.post('/chat', proteger, async (req, res) => {
    const { mensagem } = req.body;

    // 1. Validação de Entrada: Impede o processamento de mensagens vazias.
    if (!mensagem || mensagem.trim() === "") {
        return res.status(400).json({ 
            message: "Por favor, digite uma mensagem para o Agente." 
        });
    }

    try {
        // 2. Orquestração: O Controller apenas recebe o dado e o entrega ao Maestro (Router).
        // Passamos o nome do usuário extraído do token para o agente manter a pessoalidade.
        const resposta = await RoteadorAgente(mensagem, req.usuario.nome);
        
        // 3. Resposta de Sucesso: Retorna o texto gerado pela lógica do Agente.
        return res.json({ resposta });

    } catch (error) {
        // 4. Observabilidade: Log detalhado para o desenvolvedor no terminal do Railway.
        console.error(`[AGENT_CONTROLLER_ERROR] Usuário: ${req.usuario.nome} | Erro:`, error.message);
        
        // 5. Segurança de Resposta: Mensagem genérica para o frontend em caso de falha crítica.
        return res.status(500).json({ 
            message: "O Agente Guardião encontrou uma instabilidade técnica. Tente novamente em alguns minutos.",
            error: true
        });
    }
});

export default router;