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

    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });
    
    // System Instruction focada em persistência
    const systemInstruction = `Você é o Guardião SIMEC. 
    REGRA DE OURO: Sempre leia o histórico de conversa. Se o usuário fornecer informações (Chamado, Equipamento, Problema), JAMAIS peça novamente.
    EQUIPAMENTOS: ${JSON.stringify(equipamentosAtivos)}.
    Quando tiver todos os dados, retorne APENAS o JSON: {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "...", "tipo": "...", "numeroChamado": "...", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}.
    Se faltar algo, responda: "Tenho [dado X, dado Y]. Falta: [dado Z]".`;

    const modelosBackup = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'asc' }, take: 10 });
            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("⚠️"))
                .map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') history.shift();
            
            const chat = model.startChat({ history });
            
            // O segredo para não esquecer: injetar o resumo do que já foi coletado no prompt
            const result = await chat.sendMessage(`Analise o histórico e complete o agendamento com: ${perguntaUsuario}`);
            let textoDaIA = result.response.text();

            await prisma.chatHistorico.createMany({
                data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
            });
            return textoDaIA;
        } catch (error) {
            console.error(`Falha no ${nomeModelo}:`, error.message);
            if (error.message.includes("429")) { await new Promise(r => setTimeout(r, 15000)); continue; }
            continue;
        }
    }
    return "Desculpe, o sistema está indisponível. Tente novamente.";
};