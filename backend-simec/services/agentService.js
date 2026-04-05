// Ficheiro: backend-simec/services/agentService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

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

            // Formatação do tempo real para injetar na mente da IA
            const dataHoje = agora.toISOString().split('T')[0]; // YYYY-MM-DD local
            const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // 2. O CÉREBRO (INSTRUÇÃO MESTRA)
            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                
                REFERÊNCIA TEMPORAL OBRIGATÓRIA: Hoje é dia ${dataHoje} e a hora atual é ${horaHoje}.
                Lista de equipamentos: ${listaEquipamentosStr}

                REGRAS ABSOLUTAS (NÃO QUEBRE):
                1. AGENDAMENTO NOVO: Se o usuário pedir manutenção, retorne APENAS este JSON puro:
                   {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva/Corretiva", "descricao": "...", "dataInicio": "YYYY-MM-DDTHH:mm:00", "dataFim": "YYYY-MM-DDTHH:mm:00", "confirmado": false}
                
                2. REGRAS DE HORA: Se o usuário der hora de início e hora de fim, preencha OBRIGATORIAMENTE os dois campos com a data e hora informadas, formato ISO SEM "Z" (Ex: ${dataHoje}T10:30:00). Se não der fim, dataFim é null.
                
                3. CONFIRMAÇÃO (MUITO IMPORTANTE): Se o usuário confirmar um agendamento anterior (ex: "sim", "pode"), você DEVE ler a sua última resposta JSON, COPIAR EXATAMENTE OS MESMOS VALORES de "dataInicio", "dataFim", "equipamentoId" e "tipo", e retornar o JSON alterando APENAS "confirmado": true. Nunca altere o ano para frente ou invente novas datas ao confirmar.
                
                4. DESAMBIGUAÇÃO: Se o usuário não citar o equipamento de forma clara (ex: "tomografia" mas há duas), NÃO gere JSON. Pergunte em texto normal a Tag.
                
                5. RELATÓRIOS: Responda JSON: {"acao_sistema": "GERAR_RELATORIO", "tipo": "manutencoesRealizadas", "filtros": {"tipo": "Preventiva ou Corretiva"}}
                
                6. ANÁLISE DE SAÚDE: Responda JSON: {"acao_sistema": "ANALISAR_SAUDE", "equipamentoId": "ID"}
                
                NÃO escreva explicações, código markdown (\`\`\`) ou saudações antes ou depois do JSON. Apenas o JSON cru.
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

                    if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                        
                        const equipTarget = equipamentosAtivos.find(e => e.id === comando.equipamentoId);
                        const nomeEquipamento = equipTarget ? `${equipTarget.modelo} (Tag: ${equipTarget.tag}) - ${equipTarget.unidade?.nomeSistema}` : "Equipamento Desconhecido";

                        // Garante que o Node interprete a string como hora LOCAL, e não UTC.
                        const dataInicioStr = comando.dataInicio.includes('T') ? comando.dataInicio : `${comando.dataInicio}T00:00:00`;
                        const dataInicioObj = new Date(dataInicioStr);
                        
                        let dataFimObj = null;
                        if (comando.dataFim && comando.dataFim !== "null") {
                            const dataFimStr = comando.dataFim.includes('T') ? comando.dataFim : `${comando.dataFim}T00:00:00`;
                            dataFimObj = new Date(dataFimStr);
                        }

                        if (comando.confirmado === true) {
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
                            
                            const horaInicioFormatada = dataInicioObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            let horaFimFormatada = "";
                            if (dataFimObj) {
                                horaFimFormatada = ` até ${dataFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            }

                            respostaFinalTexto = `✅ Agendamento concluído com sucesso!\n**OS:** ${numeroOSGerado}\n**Ativo:** ${nomeEquipamento}\n**Horário:** ${horaInicioFormatada}${horaFimFormatada}`;
                        
                        } else {
                            const dataFormatada = dataInicioObj.toLocaleDateString('pt-BR');
                            const horaInicio = dataInicioObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            
                            let textoFim = "";
                            if (dataFimObj) {
                                const horaFim = dataFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                textoFim = ` com término previsto para as ${horaFim}`;
                            }

                            respostaFinalTexto = `📋 **Resumo do Agendamento:**\n\n**Equipamento:** ${nomeEquipamento}\n**Tipo:** ${comando.tipo}\n**Data:** ${dataFormatada}\n**Horário:** Início às ${horaInicio}${textoFim}\n\nPosso confirmar e gerar a Ordem de Serviço?`;
                        }
                    } 
                    else if (comando.acao_sistema === "GERAR_RELATORIO") {
                        const umAnoAtras = new Date(agora);
                        umAnoAtras.setFullYear(agora.getFullYear() - 1);
                        const contagem = await prisma.manutencao.count({
                            where: { tipo: comando.filtros.tipo, dataConclusao: { gte: umAnoAtras, lte: agora } }
                        });
                        respostaFinalTexto = `📊 Levantamento concluído: O sistema registra **${contagem}** manutenções do tipo ${comando.filtros.tipo} realizadas nos últimos 12 meses.`;
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
        }
    }

    throw new Error(`Falha ao processar com IA. O servidor do Google pode estar instável. Detalhe: ${erroUltimaTentativa}`);
};