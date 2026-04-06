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

    const modelosBackup = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let erroUltimaTentativa = null;

    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const agora = getAgora();

            const equipamentosAtivos = await prisma.equipamento.findMany({
                select: { 
                    id: true, tag: true, modelo: true, fabricante: true, 
                    numeroPatrimonio: true, tipo: true, setor: true,
                    unidade: { select: { nomeFantasia: true, nomeSistema: true } }
                },
                take: 200
            });

            const listaEquipamentosStr = JSON.stringify(equipamentosAtivos);
            const dataHoje = agora.toISOString().split('T')[0]; 
            const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                DATA E HORA ATUAL: ${dataHoje} ${horaHoje}.
                Lista de equipamentos: ${listaEquipamentosStr}

                REGRAS:
                1. Se o usuário pedir manutenção, retorne APENAS: {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva", "descricao": "...", "dataInicio": "YYYY-MM-DDTHH:mm:00", "dataFim": "YYYY-MM-DDTHH:mm:00", "confirmado": false}
                2. SE RECEBER UM ERRO (ex: "data passou"), ESQUEÇA o JSON anterior. Não repita comandos recusados. Peça uma nova data válida ao usuário.
                3. NÃO escreva explicações, markdown ou saudações. Apenas o JSON puro se for um comando.
            `;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });

            const historicoBanco = await prisma.chatHistorico.findMany({
                where: { usuario: usuarioNome },
                orderBy: { createdAt: 'asc' },
                take: 10
            });

            let history = historicoBanco
                .filter(msg => !msg.mensagem.includes("Agendamento Recusado"))
                .map(msg => ({ role: msg.role, parts: [{ text: msg.mensagem }] }));
            
            while (history.length > 0 && history[0].role !== 'user') { history.shift(); }

            const chat = model.startChat({ history });
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();
            let respostaFinalTexto = textoDaIA;

            // Lógica de processamento
            if (textoDaIA.includes('"acao_sistema"')) {
                try {
                    const inicio = textoDaIA.indexOf('{');
                    const fim = textoDaIA.lastIndexOf('}');
                    const jsonLimpo = textoDaIA.substring(inicio, fim + 1);
                    const comando = JSON.parse(jsonLimpo);

                    if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                        const equipTarget = equipamentosAtivos.find(e => e.id === comando.equipamentoId);
                        const nomeEquipamento = equipTarget ? `${equipTarget.modelo} (Tag: ${equipTarget.tag})` : "Equipamento Desconhecido";
                        const dataInicioObj = forcarFusoMS(comando.dataInicio);
                        const dataFimObj = forcarFusoMS(comando.dataFim);
                        const limiteMinimo = new Date(agora.getTime() - 5 * 60000);

                        if (dataInicioObj < limiteMinimo && comando.confirmado === false) {
                            respostaFinalTexto = `⚠️ **Agendamento Recusado:** A data solicitada (${dataInicioObj.toLocaleString('pt-BR')}) já passou. Por favor, sugira uma data futura.`;
                        } 
                        else if (comando.confirmado === true) {
                            const numeroOSGerado = `OS-${Date.now()}`;
                            await prisma.manutencao.create({
                                data: {
                                    numeroOS: numeroOSGerado, tipo: comando.tipo, status: "Agendada",
                                    descricaoProblemaServico: comando.descricao || 'Manutenção agendada via IA',
                                    dataHoraAgendamentoInicio: dataInicioObj, dataHoraAgendamentoFim: dataFimObj,
                                    equipamentoId: comando.equipamentoId
                                }
                            });
                            respostaFinalTexto = `✅ Agendamento concluído! OS: ${numeroOSGerado}`;
                        } else {
                            respostaFinalTexto = `📋 Confirmar agendamento para ${nomeEquipamento} em ${dataInicioObj.toLocaleString('pt-BR')}? (Responda "Sim")`;
                        }
                    }
                } catch (jsonErr) {
                    console.warn("[AGENTE] Falha ao processar JSON da IA.");
                }
            }

            // A MUDANÇA MAIS IMPORTANTE: Salvamos sempre, mas como o histórico foi filtrado, 
            // a IA nunca "lerá" o erro passado, apenas a resposta amigável.
            await prisma.chatHistorico.createMany({
                data: [
                    { usuario: usuarioNome, role: "user", mensagem: perguntaUsuario },
                    { usuario: usuarioNome, role: "model", mensagem: respostaFinalTexto }
                ]
            });
            return respostaFinalTexto;
        } catch (error) {
            console.error(`[AGENTE] Falha:`, error.message);
            erroUltimaTentativa = error.message;
        }
    }
    throw new Error(`Falha ao processar com IA.`);
};