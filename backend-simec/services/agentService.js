import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // 1. DANDO "OLHOS" PARA A IA (Buscando equipamentos no banco)
        // Pegamos os equipamentos para a IA saber exatamente os IDs quando você pedir para agendar
        const equipamentosAtivos = await prisma.equipamento.findMany({
            select: { id: true, tag: true, modelo: true },
            take: 50 // Limitamos para não estourar a memória da IA
        });
        const listaEquipamentosStr = JSON.stringify(equipamentosAtivos);

        // 2. A INSTRUÇÃO MESTRA (O "Cérebro" do Agente)
        const systemInstruction = `
            Você é o Guardião SIMEC, assistente de Engenharia Clínica.
            
            Lista de equipamentos no banco de dados:
            ${listaEquipamentosStr}

            REGRA DE AÇÃO:
            Se o usuário pedir para AGENDAR ou MARCAR uma manutenção (Preventiva, Corretiva, etc), 
            você NÃO deve responder com texto normal. Você DEVE responder APENAS com um bloco JSON no seguinte formato:
            
            {
              "acao_sistema": "CRIAR_MANUTENCAO",
              "equipamentoId": "coloque_o_id_aqui",
              "tipo": "Preventiva ou Corretiva",
              "descricao": "Resumo do que o usuario pediu",
              "data": "Data extraida em formato ISO ex: 2024-05-20T08:00:00Z"
            }

            Atenção: Se você não achar o equipamento na lista, responda normalmente avisando que não encontrou.
            Se for uma pergunta normal, responda normalmente em texto.
        `;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction
        });

        console.log(`[AGENTE] Processando comando: "${perguntaUsuario}"...`);

        // 3. ENVIANDO PARA O GOOGLE
        const result = await model.generateContent(perguntaUsuario);
        let textoDaIA = result.response.text();

        // =========================================================================
        // 4. A MÁGICA DA AUTOMAÇÃO: INTERCEPTANDO A AÇÃO!
        // Se a IA gerou um JSON com a "acao_sistema", nós pegamos e executamos!
        // =========================================================================
        if (textoDaIA.includes('"acao_sistema":') || textoDaIA.includes('CRIAR_MANUTENCAO')) {
            console.log("[AGENTE] A IA decidiu executar uma ação no banco!");
            
            try {
                // Limpa a formatação de código Markdown que a IA as vezes coloca (```json)
                let jsonLimpo = textoDaIA.replace(/```json/g, '').replace(/```/g, '').trim();
                const comando = JSON.parse(jsonLimpo);

                if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                    
                    // Gera um número de OS único
                    const numeroOSGerado = `OS-${Date.now()}`;

                    // EXECUTA NO BANCO DE DADOS (Cria a manutenção)
                    await prisma.manutencao.create({
                        data: {
                            numeroOS: numeroOSGerado,
                            tipo: comando.tipo || "Preventiva",
                            status: "Agendada",
                            descricaoProblemaServico: comando.descricao,
                            dataHoraAgendamentoInicio: new Date(comando.data),
                            equipamentoId: comando.equipamentoId
                        }
                    });

                    // Retorna a resposta de sucesso para o usuário
                    return `✅ Comando executado! Agendei uma manutenção ${comando.tipo} com sucesso.\nO número da OS gerada é: **${numeroOSGerado}**.`;
                }

            } catch (errExecucao) {
                console.error("Erro ao tentar executar a ação no banco:", errExecucao);
                return "Entendi que você quer agendar, mas faltou algum dado importante (como nome exato do equipamento ou data). Pode repetir?";
            }
        }

        // 5. Se não era uma ação, apenas devolve a resposta normal da IA
        return textoDaIA;

    } catch (error) {
        console.error("ERRO NO SDK DO GOOGLE:", error.message);
        throw new Error(`Falha ao conectar com o Google AI: ${error.message}`);
    }
};