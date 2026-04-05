// Ficheiro: backend-simec/services/agentService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    // Utilizamos os modelos liberados na sua conta do AI Studio
    const modelosBackup = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let erroUltimaTentativa = null;

    for (const nomeModelo of modelosBackup) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const agora = getAgora();

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

            // 2. O CÉREBRO (INSTRUÇÃO MESTRA)
            // Rigoroso com fusos horários locais, manutenção do dataFim e extração JSON
            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                DATA E HORA ATUAL DO SISTEMA: ${agora.toLocaleString('pt-BR')} (Fuso horário local).
                
                Lista de equipamentos cadastrados: ${listaEquipamentosStr}

                REGRAS ABSOLUTAS:
                1. AGENDAMENTO: Se o usuário pedir manutenção, você DEVE retornar APENAS este JSON:
                   {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva ou Corretiva", "descricao": "...", "dataInicio": "YYYY-MM-DDTHH:mm:00", "dataFim": "YYYY-MM-DDTHH:mm:00", "confirmado": false}
                
                2. REGRAS DE DATA/HORA: Baseie-se na "DATA E HORA ATUAL DO SISTEMA" informada acima para calcular "hoje", "amanhã", etc. Retorne o formato ISO local SEM a letra Z no final (Ex: 2024-05-20T10:30:00). Se o usuário fornecer hora de início e hora de término, preencha OBRIGATORIAMENTE os campos "dataInicio" e "dataFim". Se não fornecer término, retorne null em dataFim.
                
                3. CONFIRMAÇÃO: Se o usuário estiver confirmando um agendamento anterior (ex: "sim", "pode agendar"), retorne OBRIGATORIAMENTE o mesmo JSON do agendamento (incluindo "equipamentoId", "tipo", "dataInicio" e "dataFim"), mudando apenas "confirmado": true. Nunca perca os dados de data/hora na confirmação.
                
                4. DESAMBIGUAÇÃO: Se o usuário não citar o equipamento de forma clara ou houver mais de um com o mesmo nome, NÃO gere JSON. Pergunte em texto normal pedindo a Tag.
                
                5. RELATÓRIOS: Responda JSON: {"acao_sistema": "GERAR_RELATORIO", "tipo": "manutencoesRealizadas", "filtros": {"tipo": "Preventiva ou Corretiva"}}
                
                6. ANÁLISE DE SAÚDE: Responda JSON: {"acao_sistema": "ANALISAR_SAUDE", "equipamentoId": "ID"}
                
                IMPORTANTE: Não adicione NENHUM texto extra fora do JSON.
            `;

            const model = genAI.getGenerativeModel({ model: nomeModelo, systemInstruction });

            // 3. RECUPERANDO A MEMÓRIA DA CONVERSA
            const historicoBanco = await prisma.chatHistorico.findMany({
                where: { usuario: usuarioNome },
                orderBy: { createdAt: 'asc' },
                take: 10
            });

            const history = historicoBanco.map(msg => ({ role: msg.role, parts: [{ text: msg.mensagem }] }));
            const chat = model.startChat({ history });

            // 4. ENVIANDO A PERGUNTA
            const result = await chat.sendMessage(perguntaUsuario);
            let textoDaIA = result.response.text();
            let respostaFinalTexto = textoDaIA;

            // 5. INTERCEPTANDO AÇÕES (EXTRAÇÃO SEGURA DE JSON)
            if (textoDaIA.includes('"acao_sistema"')) {
                try {
                    const inicio = textoDaIA.indexOf('{');
                    const fim = textoDaIA.lastIndexOf('}');
                    const jsonLimpo = textoDaIA.substring(inicio, fim + 1);
                    const comando = JSON.parse(jsonLimpo);

                    // Ação: CRIAR OS
                    if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                        
                        // Encontra os dados reais do equipamento para mostrar na tela
                        const equipTarget = equipamentosAtivos.find(e => e.id === comando.equipamentoId);
                        const nomeEquipamento = equipTarget ? `${equipTarget.modelo} (Tag: ${equipTarget.tag}) - ${equipTarget.unidade?.nomeSistema}` : "Equipamento Desconhecido";

                        if (comando.confirmado === true) {
                            const numeroOSGerado = `OS-${Date.now()}`;
                            
                            // Cria os objetos Date baseados no JSON sem o 'Z', forçando o Node a respeitar a hora local
                            const dataInicioObj = new Date(comando.dataInicio);
                            const dataFimObj = comando.dataFim ? new Date(comando.dataFim) : null;

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
                            
                            const horaInicioFormatada = dataInicioObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            let horaFimFormatada = "";
                            if (dataFimObj) {
                                horaFimFormatada = ` até ${dataFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            }

                            respostaFinalTexto = `✅ Agendamento concluído com sucesso!\n**OS:** ${numeroOSGerado}\n**Ativo:** ${nomeEquipamento}\n**Horário:** ${horaInicioFormatada}${horaFimFormatada}`;
                        
                        } else {
                            // FORMATAÇÃO DO RESUMO ANTES DE CONFIRMAR
                            const dtInicioObj = new Date(comando.dataInicio);
                            const dataFormatada = dtInicioObj.toLocaleDateString('pt-BR');
                            const horaInicio = dtInicioObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            
                            let textoFim = "";
                            if (comando.dataFim) {
                                const dtFimObj = new Date(comando.dataFim);
                                const horaFim = dtFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                textoFim = ` com término previsto para ${horaFim}`;
                            }

                            respostaFinalTexto = `📋 **Resumo do Agendamento:**\n\n**Equipamento:** ${nomeEquipamento}\n**Tipo:** ${comando.tipo}\n**Data:** ${dataFormatada}\n**Horário:** Início às ${horaInicio}${textoFim}\n\nPosso confirmar e gerar a Ordem de Serviço?`;
                        }
                    } 
                    // Ação: RELATÓRIOS
                    else if (comando.acao_sistema === "GERAR_RELATORIO") {
                        const umAnoAtras = new Date(agora);
                        umAnoAtras.setFullYear(agora.getFullYear() - 1);
                        const contagem = await prisma.manutencao.count({
                            where: { tipo: comando.filtros.tipo, dataConclusao: { gte: umAnoAtras, lte: agora } }
                        });
                        respostaFinalTexto = `📊 Levantamento concluído: O sistema registra **${contagem}** manutenções do tipo ${comando.filtros.tipo} realizadas nos últimos 12 meses.`;
                    }
                    // Ação: PREDITIVA (SAÚDE DO EQUIPAMENTO)
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
                    console.warn("[AGENTE] Falha ao ler JSON da IA:", textoDaIA);
                }
            }

            // 6. SALVANDO A CONVERSA NA MEMÓRIA
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
            // Se falhar (ex: por quota diária), o loop tenta o próximo modelo (gemini-1.5-flash)
        }
    }

    throw new Error(`Falha ao processar com IA. O servidor do Google pode estar instável. Detalhe: ${erroUltimaTentativa}`);
};