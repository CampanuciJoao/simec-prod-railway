// Ficheiro: backend-simec/services/agentService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';
import { getAgora } from './timeService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    // Utilizamos EXATAMENTE o modelo que o seu Google AI Studio liberou (visto na imagem)
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
            // Aqui ensinamos a IA a ser inteligente e a desambiguar as coisas sozinha.
            const systemInstruction = `
                Você é o Guardião SIMEC, assistente de Engenharia Clínica.
                DATA ATUAL DO SERVIDOR: ${agora.toISOString()}
                Lista de equipamentos cadastrados: ${listaEquipamentosStr}

                REGRAS DE COMPORTAMENTO:
                1. CONVERSA NORMAL: Responda perguntas técnicas ou dúvidas normalmente em texto.
                
                2. DESAMBIGUAÇÃO (MUITO IMPORTANTE): Se o usuário pedir para agendar manutenção, olhe a lista de equipamentos. 
                   Se a descrição bater com MAIS DE UM equipamento, NÃO gere o JSON. Pergunte em texto normal: "Encontrei X equipamentos com esse nome na unidade Y. Qual a Tag (Série) do correto?".
                
                3. AGENDAMENTO: Se você tiver CERTEZA de qual é o equipamento (único) e a data, responda APENAS com este JSON:
                   {"acao_sistema": "CRIAR_MANUTENCAO", "equipamentoId": "ID", "tipo": "Preventiva ou Corretiva", "descricao": "...", "dataInicio": "ISO_DATE", "confirmado": false}
                
                4. CONFIRMAÇÃO: Se o usuário disser "sim, confirme", "pode agendar", mude o JSON para "confirmado": true.
                
                5. RELATÓRIOS: Para relatórios, responda APENAS:
                   {"acao_sistema": "GERAR_RELATORIO", "tipo": "manutencoesRealizadas", "filtros": {"tipo": "Preventiva ou Corretiva"}}
                
                6. ANÁLISE DE SAÚDE: Para saber o status, responda APENAS:
                   {"acao_sistema": "ANALISAR_SAUDE", "equipamentoId": "ID"}
                
                IMPORTANTE: Se for gerar JSON, escreva APENAS o JSON puro, sem crases, marcações ou explicações em volta.
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
            // Verificamos "acao_sistema" para não tentar parsear respostas normais do chatbot
            if (textoDaIA.includes('"acao_sistema"')) {
                try {
                    const inicio = textoDaIA.indexOf('{');
                    const fim = textoDaIA.lastIndexOf('}');
                    const jsonLimpo = textoDaIA.substring(inicio, fim + 1);
                    const comando = JSON.parse(jsonLimpo);

                    // Ação: CRIAR OS
                    if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                        if (comando.confirmado === true) {
                            const numeroOSGerado = `OS-${Date.now()}`;
                            await prisma.manutencao.create({
                                data: {
                                    numeroOS: numeroOSGerado,
                                    tipo: comando.tipo,
                                    status: "Agendada",
                                    descricaoProblemaServico: comando.descricao,
                                    dataHoraAgendamentoInicio: new Date(comando.dataInicio),
                                    equipamentoId: comando.equipamentoId
                                }
                            });
                            respostaFinalTexto = `✅ Agendamento concluído com sucesso! OS gerada: **${numeroOSGerado}**.`;
                        } else {
                            respostaFinalTexto = `Entendido. Deseja agendar uma manutenção ${comando.tipo} para o equipamento selecionado no dia ${new Date(comando.dataInicio).toLocaleDateString('pt-BR')}. Posso confirmar este agendamento?`;
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
                    // Ação: PREDITIVA
                    else if (comando.acao_sistema === "ANALISAR_SAUDE") {
                        const ocorrencias = await prisma.ocorrencia.findMany({
                            where: { equipamentoId: comando.equipamentoId, data: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } },
                            orderBy: { data: 'desc' },
                            take: 10
                        });
                        // Pede para a IA avaliar o resultado do banco
                        const promptSaude = `O sistema encontrou estas ocorrências no último ano: ${JSON.stringify(ocorrencias)}. Comporte-se como um engenheiro especialista e faça um breve laudo da saúde deste equipamento para o usuário.`;
                        const analise = await chat.sendMessage(promptSaude);
                        respostaFinalTexto = analise.response.text();
                    }
                } catch (jsonErr) {
                    console.warn("[AGENTE] A IA retornou um formato JSON inválido:", textoDaIA);
                    // Se falhar o parse, a resposta volta a ser o texto bruto da IA (evita quebrar a tela)
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
            // O loop vai tentar o próximo modelo (ex: gemini-1.5-flash)
        }
    }

    // Se todos falharem:
    throw new Error(`Falha ao processar com IA. O servidor do Google pode estar instável. Detalhe: ${erroUltimaTentativa}`);
};