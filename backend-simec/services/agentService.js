// Ficheiro: simec/backend-simec/services/agentService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from './prismaService.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FERRAMENTAS QUE O AGENTE PODE EXECUTAR ---

// 1. Busca histórico completo de um equipamento pela TAG
async function buscarHistoricoEquipamento(tag) {
    const equipamento = await prisma.equipamento.findUnique({
        where: { tag },
        include: {
            manutencoes: {
                include: { notasAndamento: true },
                orderBy: { dataHoraAgendamentoInicio: 'desc' }
            },
            unidade: true
        }
    });
    return equipamento ? JSON.stringify(equipamento) : "Equipamento não encontrado.";
}

// 2. Agenda uma manutenção via Agente
async function agendarManutencaoAgente(tag, tipo, descricao) {
    const equip = await prisma.equipamento.findUnique({ where: { tag } });
    if (!equip) return "Erro: Equipamento não encontrado para agendamento.";

    const total = await prisma.manutencao.count();
    const numeroOS = `IA-${tag}-${String(total + 1).padStart(4, '0')}`;

    const novaOS = await prisma.manutencao.create({
        data: {
            numeroOS,
            tipo: tipo || 'Preventiva',
            descricaoProblemaServico: `[AGENTE IA]: ${descricao}`,
            dataHoraAgendamentoInicio: new Date(),
            equipamentoId: equip.id,
            status: 'Agendada'
        }
    });
    return `Sucesso! OS ${novaOS.numeroOS} agendada para o equipamento ${tag}.`;
}

// --- CONFIGURAÇÃO DO MODELO ---
export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // Modelo rápido e eficiente
    });

    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: `Você é o Guardião SIMEC, assistente inteligente de engenharia clínica. 
                Seu objetivo é ajudar o usuário ${usuarioNome} a gerir o parque tecnológico.
                Você pode buscar históricos técnicos e agendar manutenções.
                Sempre analise os textos das notas técnicas para identificar riscos de quebra.
                Se notar que um problema se repete (ex: ruído, aquecimento), sugira uma preditiva.` }],
            },
        ],
    });

    // Chamada simplificada (podemos evoluir para Function Calling real depois)
    // Por enquanto, vamos deixar a IA processar a lógica e pediremos para ela retornar JSON se quiser agir
    const promptFinal = `Comando do Usuário: ${perguntaUsuario}. 
    Caso precise de dados, use a TAG do equipamento. 
    Responda de forma técnica e prestativa.`;

    const result = await chat.sendMessage(promptFinal);
    return result.response.text();
};