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

    const totalMensagens = await prisma.chatHistorico.count({ where: { usuario: usuarioNome } });
    if (totalMensagens > 20) await prisma.chatHistorico.deleteMany({ where: { usuario: usuarioNome } });

    // --- INTERCEPTAÇÃO DE CONFIRMAÇÃO ---
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

    const modelosBackup = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const systemInstruction = `Você é o Guardião SIMEC, assistente de engenharia. 
            Regras: 
            1. SE O USUÁRIO RESPONDER A UMA PERGUNTA SUA (ex: número do chamado), USE ESSA INFORMAÇÃO PARA CONCLUIR O JSON DE AGENDAMENTO.
            2. PREVENTIVA: JSON {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
            3. CORRETIVA: Se precisar do chamado, peça. Se já tiver, inclua "numeroChamado": "XXXX" no JSON.
            4. Responda apenas JSON ou a pergunta necessária.`;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'asc' }, take: 6 });
            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("⚠️"))
                .map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') history.shift();
            
            // --- ENRIQUECIMENTO DE CONTEXTO ---
            let promptEnriquecido = perguntaUsuario;
            if (history.length > 0) {
                const ultimaIA = history[history.length - 1];
                if (ultimaIA.role === 'model' && ultimaIA.parts[0].text.includes("número do chamado")) {
                    promptEnriquecido = `O número do chamado é "${perguntaUsuario}". Agora continue o agendamento: ${perguntaUsuario}`;
                }
            }
            
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(promptEnriquecido);
            let textoDaIA = result.response.text();

            if (!textoDaIA || textoDaIA.trim() === "") textoDaIA = "Pode confirmar o dado ou repetir?";

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
    return "Desculpe, o sistema de IA está temporariamente indisponível.";
};