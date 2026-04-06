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

    const modelosBackup = ["gemini-3.1-flash-lite", "gemini-1.5-flash"];
    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const agora = getAgora();
            const equipamentosAtivos = await prisma.equipamento.findMany({ select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, take: 200 });
            
            const systemInstruction = `Você é o Guardião SIMEC. Regras:
            1. PREVENTIVA: Retorne JSON {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva", "descricao": "...", "dataInicio": "...", "dataFim": "...", "confirmado": false}
            2. CORRETIVA: Se não houver numeroChamado, responda APENAS: "Para corretivas, preciso do número do chamado." Se tiver, inclua "numeroChamado": "XXXX" no JSON.
            3. Não escreva explicações, apenas JSON puro ou a pergunta solicitada.`;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });
            const historicoBanco = await prisma.chatHistorico.findMany({ where: { usuario: usuarioNome }, orderBy: { createdAt: 'desc' }, take: 2 });
            let history = historicoBanco.reverse().filter(msg => !msg.mensagem.includes("⚠️")).map(msg => ({ role: msg.role, parts: [{ text: msg.mensagem }] }));
            
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
            if (error.message.includes("429")) { await new Promise(r => setTimeout(r, 12000)); continue; }
            throw error;
        }
    }
};