// Ficheiro: simec/backend-simec/services/agentService.js
// VERSÃO 2.0 - COM TRATAMENTO DE ERROS E LOGS PARA DEBUG NO RAILWAY

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

// Verificação de segurança: Se a chave não existir, o sistema avisa nos logs
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("ERRO CRÍTICO: Variável GEMINI_API_KEY não encontrada nas variáveis de ambiente!");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// --- FERRAMENTAS DISPONÍVEIS PARA CONSULTA ---

/**
 * Busca o histórico completo de manutenções e notas técnicas de um equipamento.
 * Útil para a IA identificar padrões de quebra.
 */
async function buscarHistoricoEquipamento(tag) {
    try {
        const equipamento = await prisma.equipamento.findUnique({
            where: { tag },
            include: {
                manutencoes: {
                    include: { notasAndamento: true },
                    orderBy: { dataHoraAgendamentoInicio: 'desc' },
                    take: 10 // Pega as 10 últimas para não sobrecarregar a IA
                },
                unidade: true
            }
        });
        return equipamento ? JSON.stringify(equipamento) : "Equipamento não encontrado no banco.";
    } catch (err) {
        console.error("Erro ao buscar histórico para a IA:", err.message);
        return "Erro ao acessar o banco de dados.";
    }
}

/**
 * Permite ao agente registrar uma nova Ordem de Serviço preventivamente.
 */
async function agendarManutencaoAgente(tag, tipo, descricao) {
    try {
        const equip = await prisma.equipamento.findUnique({ where: { tag } });
        if (!equip) return "Erro: Equipamento não localizado.";

        const total = await prisma.manutencao.count();
        const numeroOS = `IA-${tag}-${String(total + 1).padStart(4, '0')}`;

        const novaOS = await prisma.manutencao.create({
            data: {
                numeroOS,
                tipo: tipo || 'Preventiva',
                descricaoProblemaServico: `[SOLICITAÇÃO IA]: ${descricao}`,
                dataHoraAgendamentoInicio: new Date(),
                equipamentoId: equip.id,
                status: 'Agendada'
            }
        });
        return `OS ${novaOS.numeroOS} gerada com sucesso para ${tag}.`;
    } catch (err) {
        console.error("Erro ao agendar via IA:", err.message);
        return "Falha ao criar agendamento no banco.";
    }
}

// --- MOTOR DE PROCESSAMENTO DO AGENTE ---

/**
 * Processa a conversa do usuário, enviando para o Gemini e retornando a resposta técnica.
 */
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    try {
        // Usamos o modelo Flash para velocidade ou Pro para maior inteligência
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `Você é o Guardião SIMEC, um engenheiro clínico virtual sênior. 
                    Seu objetivo é auxiliar o usuário ${usuarioNome || 'Administrador'} na gestão do hospital.
                    Você tem capacidade de ler históricos e identificar riscos de quebra.
                    Sempre que detectar quebras repetitivas ou 'sinais fracos' (como ruído ou calor), recomende uma manutenção preditiva.
                    Seja direto, técnico e use termos da engenharia biomédica.` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Estou pronto para monitorar o parque tecnológico do SIMEC. Como posso ajudar hoje?" }],
                },
            ],
        });

        console.log(`[Agente SIMEC] Processando comando: "${perguntaUsuario}"`);

        // Envia a mensagem e aguarda a resposta da IA
        const result = await chat.sendMessage(perguntaUsuario);
        const response = await result.response;
        const textoResposta = response.text();

        // Se a IA não retornar nada (por bloqueio de segurança ou erro)
        if (!textoResposta) {
            throw new Error("A IA retornou uma resposta vazia.");
        }

        return textoResposta;

    } catch (error) {
        // LOG CRÍTICO: Isso aparecerá no painel do Railway
        console.error("--- ERRO NO SERVIÇO DO AGENTE ---");
        console.error("Mensagem:", error.message);
        console.error("Stack:", error.stack);
        
        // Retorna uma mensagem amigável para o frontend não quebrar
        throw new Error("Falha na inteligência artificial. Verifique os logs do servidor.");
    }
};