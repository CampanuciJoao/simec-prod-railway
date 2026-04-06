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
    
    // System Instruction fortalecida para não perder dados parciais
    const systemInstruction = `Você é o Guardião SIMEC.
    EQUIPAMENTOS: ${JSON.stringify(equipamentosAtivos)}.
    REGRAS DE FORMULÁRIO:
    1. Se o usuário fornecer um dado (Ex: Chamado, Equipamento, Descrição), memorize-o.
    2. SE FOR CORRETIVA e faltar o número do chamado, PEÇA APENAS o chamado.
    3. SE TIVER TUDO (equipamento, tipo, chamado, descrição, data), retorne JSON: {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "...", "numeroChamado": "...", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
    4. NÃO responda apenas "Ok", sempre mostre o resumo do que você já entendeu ou o que falta.`;

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
            
            // Lógica de Enriquecimento: Se a IA perguntou algo antes, reforçamos a pergunta
            let promptEnriquecido = perguntaUsuario;
            if (history.length > 0) {
                const ultimaIA = history[history.length - 1];
                if (ultimaIA.role === 'model' && (ultimaIA.parts[0].text.includes("número do chamado") || ultimaIA.parts[0].text.includes("ID do equipamento"))) {
                    promptEnriquecido = `Usuário respondeu: "${perguntaUsuario}". Complete o formulário com esta informação.`;
                }
            }

            const result = await chat.sendMessage(promptEnriquecido);
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
    return "Desculpe, tente novamente.";
};