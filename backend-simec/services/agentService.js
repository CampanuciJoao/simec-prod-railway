// Ficheiro: backend-simec/services/agentService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

// Função utilitária corrigida para evitar fuso horário automático
function forcarFusoMS(dataIsoDaIA) {
    if (!dataIsoDaIA || dataIsoDaIA === "null") return null;
    // O pulo do gato: removemos o 'Z' e garantimos que o JS leia como data local do servidor
    // Como o servidor agora tem TZ=America/Campo_Grande, isso é o suficiente.
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
            const agora = getAgora(); // getAgora já respeita o TZ configurado no Railway

            // 1. BUSCANDO OS EQUIPAMENTOS NO BANCO PARA DAR "VISÃO" À IA
            const equipamentosAtivos = await prisma.equipamento.findMany({
                select: { 
                    id: true, tag: true, modelo: true, fabricante: true, 
                    numeroPatrimonio: true, tipo: true, setor: true,
                    unidade: { select: { nomeFantasia: true, nomeSistema: true } }
                },
                take: 200
            });

            const listaEquipamentosStr = JSON.stringify(equipamentosAtivos);

            // Formatação do tempo real para injetar na mente da IA
            const dataHoje = agora.toISOString().split('T')[0]; 
            const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // 2. O CÉREBRO (INSTRUÇÃO MESTRA)
            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                DATA E HORA ATUAL DO SISTEMA: ${dataHoje} ${horaHoje}.
                Lista de equipamentos: ${listaEquipamentosStr}

                REGRAS ABSOLUTAS (NÃO QUEBRE):
                1. AGENDAMENTO NOVO: Se o usuário pedir manutenção, retorne APENAS este JSON puro:
                   {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva ou Corretiva", "descricao": "...", "dataInicio": "YYYY-MM-DDTHH:mm:00", "dataFim": "YYYY-MM-DDTHH:mm:00", "confirmado": false}
                
                2. REGRAS DE HORA: Se o usuário der hora de início e hora de fim, use o ano atual. Retorne o formato ISO SEM "Z" (Ex: ${dataHoje}T10:30:00).
                
                3. CONFIRMAÇÃO: Se o usuário confirmar (ex: "sim", "pode"), leia a última mensagem JSON, copie os valores exatos de dataInicio e dataFim, e altere APENAS "confirmado": true.
                
                4. DESAMBIGUAÇÃO: Se o equipamento não for claro, NÃO gere JSON. Pergunte em texto.
                
                5. RELATÓRIOS: Responda JSON: {"acao_sistema": "GERAR_RELATORIO", "tipo": "manutencoesRealizadas", "filtros": {"tipo": "Preventiva ou Corretiva"}}
                
                6. ANÁLISE DE SAÚDE: Responda JSON: {"acao_sistema": "ANALISAR_SAUDE", "equipamentoId": "ID"}
                
                NÃO escreva explicações, código markdown ou saudações antes ou depois do JSON. Apenas o JSON cru.
            `;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });

            // 3. RECUPERANDO A MEMÓRIA DA CONVERSA
            const historicoBanco = await prisma.chatHistorico.findMany({
                where: { usuario: usuarioNome },
                orderBy: { createdAt: 'asc' },
                take: 10
            });

            let history = historicoBanco.map(msg => ({ role: msg.role, parts: [{ text: msg.mensagem }] }));
            while (history.length > 0 && history[0].role !== 'user') { history.shift(); }

            const chat = model.startChat({ history });

            // 4. ENVIANDO A PERGUNTA
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();
            let respostaFinalTexto = textoDaIA;

            // 5. INTERCEPTANDO AÇÕES
            if (textoDaIA.includes('"acao_sistema"')) {
                try {
                    const inicio = textoDaIA.indexOf('{');
                    const fim = textoDaIA.lastIndexOf('}');
                    const jsonLimpo = textoDaIA.substring(inicio, fim + 1);
                    const comando = JSON.parse(jsonLimpo);

                    if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                        const equipTarget = equipamentosAtivos.find(e => e.id === comando.equipamentoId);
                        const nomeEquipamento = equipTarget ? `${equipTarget.modelo} (Tag: ${equipTarget.tag}) - ${equipTarget.unidade?.nomeSistema}` : "Equipamento Desconhecido";

                        const dataInicioObj = forcarFusoMS(comando.dataInicio);
                        const dataFimObj = forcarFusoMS(comando.dataFim);

                        // TRAVA: Tolerância de 5 minutos
                        const limiteMinimo = new Date(getAgora().getTime() - 5 * 60000);

                        if (dataInicioObj < limiteMinimo && comando.confirmado === false) {
                            respostaFinalTexto = `⚠️ **Agendamento Recusado:** A data solicitada (${dataInicioObj.toLocaleString('pt-BR')}) já passou.`;
                            comando.confirmado = false;
                        } 
                        else if (comando.confirmado === true) {
                            const numeroOSGerado = `OS-${Date.now()}`;
                            await prisma.manutencao.create({
                                data: {
                                    numeroOS: numeroOSGerado,
                                    tipo: comando.tipo,
                                    status: "Agendada",
                                    descricaoProblemaServico: comando.descricao || 'Manutenção agendada via IA',
                                    dataHoraAgendamentoInicio: dataInicioObj,
                                    dataHoraAgendamentoFim: dataFimObj,
                                    equipamentoId: comando.equipamentoId
                                }
                            });
                            respostaFinalTexto = `✅ Agendamento concluído!\n**OS:** ${numeroOSGerado}\n**Ativo:** ${nomeEquipamento}\n**Início:** ${dataInicioObj.toLocaleString('pt-BR')}`;
                        } else {
                            respostaFinalTexto = `📋 **Confirmar agendamento:**\nEquipamento: ${nomeEquipamento}\nInício: ${dataInicioObj.toLocaleString('pt-BR')}\nPosso confirmar? (Responda: "Sim")`;
                        }
                    } 
                    else if (comando.acao_sistema === "GERAR_RELATORIO") {
                        const umAnoAtras = new Date(agora);
                        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
                        const contagem = await prisma.manutencao.count({
                            where: { tipo: comando.filtros.tipo, dataConclusao: { gte: umAnoAtras, lte: agora } }
                        });
                        respostaFinalTexto = `📊 Levantamento concluído: ${contagem} manutenções do tipo ${comando.filtros.tipo} no último ano.`;
                    }
                    else if (comando.acao_sistema === "ANALISAR_SAUDE") {
                        const ocorrencias = await prisma.ocorrencia.findMany({
                            where: { equipamentoId: comando.equipamentoId, data: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } },
                            orderBy: { data: 'desc' },
                            take: 10
                        });
                        const promptSaude = `O sistema encontrou estas ocorrências no último ano: ${JSON.stringify(ocorrencias)}. Comporte-se como um engenheiro especialista e faça um breve laudo da saúde deste equipamento para o usuário.`;
                        const analise = await chat.sendMessage(promptSaude);
                        respostaFinalTexto = analise.response.text();
                    }
                } catch (jsonErr) {
                    console.warn("[AGENTE] Falha ao ler JSON da IA.");
                }
            }

            await prisma.chatHistorico.createMany({
                data: [
                    { usuario: usuarioNome, role: "user", mensagem: perguntaUsuario },
                    { usuario: usuarioNome, role: "model", mensagem: respostaFinalTexto }
                ]
            });
            return respostaFinalTexto;
        } catch (error) {
            console.error(`[AGENTE] Falha no modelo ${nomeModelo}:`, error.message);
            erroUltimaTentativa = error.message;
        }
    }
    throw new Error(`Falha ao processar com IA: ${erroUltimaTentativa}`);
};