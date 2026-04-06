import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

function forcarFusoMS(dataIsoDaIA) {
    if (!dataIsoDaIA || dataIsoDaIA === "null") return null;
    const cleanIso = dataIsoDaIA.replace('Z', '');
    return new Date(cleanIso);
}

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    // Auto-limpeza de histórico
    const totalMensagens = await prisma.chatHistorico.count({ where: { usuario: usuarioNome } });
    if (totalMensagens > 20) await prisma.chatHistorico.deleteMany({ where: { usuario: usuarioNome } });

    // --- INTERCEPTAÇÃO DE CONFIRMAÇÃO (ECONOMIZA COTA) ---
    if (perguntaUsuario.toLowerCase().trim() === "sim") {
        const ultimaInteracao = await prisma.chatHistorico.findFirst({
            where: { usuario: usuarioNome, role: 'model' },
            orderBy: { createdAt: 'desc' }
        });
        if (ultimaInteracao && ultimaInteracao.mensagem.includes('"confirmado": false')) {
            const match = ultimaInteracao.mensagem.match(/\{[\s\S]*\}/);
            if (match) {
                const comando = JSON.parse(match[0]);
                comando.confirmado = true;
                const numeroOSGerado = `OS-${Date.now()}`;
                await prisma.manutencao.create({
                    data: {
                        numeroOS: numeroOSGerado, tipo: comando.tipo, status: "Agendada",
                        numeroChamado: comando.numeroChamado || null,
                        descricaoProblemaServico: comando.descricao || 'Manutenção agendada via IA',
                        dataHoraAgendamentoInicio: forcarFusoMS(comando.dataInicio),
                        dataHoraAgendamentoFim: forcarFusoMS(comando.dataFim),
                        equipamentoId: comando.equipamentoId
                    }
                });
                const resposta = `✅ Agendamento concluído! OS: ${numeroOSGerado}`;
                await prisma.chatHistorico.create({ data: { usuario: usuarioNome, role: "model", mensagem: resposta } });
                return resposta;
            }
        }
    }

    // USANDO O MODELO COM MAIOR COTA (Gemini 2.0 Flash)
    const modelosBackup = ["gemini-2.0-flash", "gemini-1.5-flash"];
    
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const systemInstruction = `Você é o Guardião SIMEC. Regras:
            1. PREVENTIVA: Retorne JSON {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
            2. CORRETIVA: Se não houver numeroChamado, responda APENAS: "Para corretivas, preciso do número do chamado." Se tiver, inclua "numeroChamado": "XXXX" no JSON.
            3. Não escreva explicações, apenas JSON ou a pergunta solicitada.`;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            
            // Histórico reduzido a 2 mensagens para garantir cota de tokens
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'asc' }, take: 2 });
            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("⚠️"))
                .map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') history.shift();
            
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();

            if (textoDaIA.includes('"acao_sistema"')) {
                const match = textoDaIA.match(/\{[\s\S]*\}/);
                if (match) {
                    const comando = JSON.parse(match[0]);
                    if (comando.tipo === 'Corretiva' && !comando.numeroChamado) {
                        textoDaIA = "⚠️ Para manutenções corretivas, é obrigatório informar o número do chamado.";
                    }
                }
            }

            await prisma.chatHistorico.createMany({
                data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
            });
            return textoDaIA;
        } catch (error) {
            console.error(`[AGENTE] Falha no ${nomeModelo}:`, error.message);
            if (error.message.includes("429")) { await new Promise(r => setTimeout(r, 15000)); continue; }
            continue;
        }
    }
    throw new Error("Falha ao processar com IA: Cota esgotada ou modelo indisponível.");
};