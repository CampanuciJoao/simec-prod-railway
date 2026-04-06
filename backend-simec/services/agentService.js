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

    // --- INTERCEPTAÇÃO DE CONFIRMAÇÃO (MANTIDA) ---
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
    
    // Injeção de contexto detalhada para não perder o foco
    const systemInstruction = `Você é o Guardião SIMEC, assistente de engenharia.
    LISTA DE EQUIPAMENTOS DISPONÍVEIS: ${JSON.stringify(equipamentosAtivos)}.
    REGRAS DE CONTEXTO:
    1. SE O USUÁRIO FORNECER DADOS PARCIAIS, ARMAZENE-OS MENTALMENTE.
    2. SE O USUÁRIO PEDIR CORRETIVA E VOCÊ NÃO TIVER O CHAMADO, PEÇA APENAS O CHAMADO.
    3. SE TIVER TUDO, retorne JSON: {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "...", "numeroChamado": "...", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
    4. Mantenha o tom profissional e direto. Use a lista de equipamentos para identificar o ID corretamente.`;

    const modelosBackup = ["gemini-2.5-flash", "gemini-1.5-flash"];
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            
            // Histórico estendido para a IA lembrar das respostas anteriores
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'asc' }, take: 10 });
            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("⚠️"))
                .map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') history.shift();
            
            const chat = model.startChat({ history });
            
            // Enriquecimento: se o histórico mostrar que ela perguntou algo, a IA já leva o contexto
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();

            await prisma.chatHistorico.createMany({
                data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
            });
            return textoDaIA;
        } catch (error) {
            if (error.message.includes("429")) { await new Promise(r => setTimeout(r, 15000)); continue; }
            console.error(`Falha no ${nomeModelo}:`, error.message);
            continue;
        }
    }
    return "Desculpe, estou com instabilidade. Tente novamente em instantes.";
};