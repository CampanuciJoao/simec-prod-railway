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

    // Busca equipamentos PARA INJETAR NO CONTEXTO
    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });
    const listaEquipStr = JSON.stringify(equipamentosAtivos);

    const modelosBackup = ["gemini-2.5-flash", "gemini-1.5-flash"];
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            // INJEÇÃO FORÇADA DE CONTEXTO: Toda chamada reenvia a lista de equipamentos
            const systemInstruction = `Você é o Guardião SIMEC. 
            LISTA DE EQUIPAMENTOS ATUAIS (Use estes IDs): ${listaEquipStr}.
            1. PREVENTIVA: Retorne JSON {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
            2. CORRETIVA: Se o usuário pedir corretiva, inclua o numeroChamado e a descrição no JSON.
            3. Se faltar informação (ID ou Chamado), pergunte ao usuário. Não invente IDs.`;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'asc' }, take: 6 });
            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("⚠️"))
                .map(msg => ({ role: msg.role === 'model' ? 'model' : 'user', parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') history.shift();
            
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();

            // LÓGICA DE EXTRAÇÃO DE COMANDO
            if (textoDaIA.includes('"acao_sistema"')) {
                const match = textoDaIA.match(/\{[\s\S]*\}/);
                if (match) {
                    const comando = JSON.parse(match[0]);
                    // Validação de segurança: Se a IA não pegou o ID, peça novamente
                    if (!comando.equipamentoId) textoDaIA = "⚠️ Não encontrei o ID do equipamento. Por favor, especifique qual a tomografia.";
                }
            }

            await prisma.chatHistorico.createMany({
                data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
            });
            return textoDaIA;
        } catch (error) {
            if (error.message.includes("429")) { await new Promise(r => setTimeout(r, 15000)); continue; }
            continue;
        }
    }
    return "Desculpe, tente novamente.";
};