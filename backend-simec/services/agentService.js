import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    const API_KEY = process.env.GEMINI_API_KEY?.trim();
    if (!API_KEY) throw new Error("Chave não configurada no .env.");

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        // =========================================================================
        // 1. DANDO "SUPER OLHOS" PARA A IA (Visão detalhada do banco)
        // =========================================================================
        const equipamentosAtivos = await prisma.equipamento.findMany({
            select: { 
                id: true, 
                tag: true, 
                modelo: true,
                fabricante: true,         // Para buscas por marca
                numeroPatrimonio: true,   // Para buscas por série/patrimônio
                tipo: true,               // Ex: Ventilador Pulmonar
                setor: true,              // Ex: UTI
                unidade: {                // Ex: Casa do Nilton
                    select: { nomeFantasia: true, nomeSistema: true }
                }
            },
            take: 200 // Limite aumentado para ver mais equipamentos de uma vez
        });
        const listaEquipamentosStr = JSON.stringify(equipamentosAtivos);

        // =========================================================================
        // 2. A INSTRUÇÃO MESTRA (O "Cérebro" do Agente)
        // =========================================================================
        const systemInstruction = `
            Você é o Guardião SIMEC, assistente de Engenharia Clínica.
            
            Lista de equipamentos no banco de dados (incluindo unidades, setores, patrimônio e fabricante):
            ${listaEquipamentosStr}

            REGRAS DE AÇÃO:
            1. O usuário pode pedir agendamento citando Fabricante, Unidade, Setor ou Patrimônio.
            2. Se o usuário pedir para agendar, mas faltar data, hora, ou não ficar claro o equipamento, PERGUNTE NORMALMENTE em texto.
            3. SÓ SE VOCÊ TIVER CERTEZA do equipamento e da data, responda APENAS com um bloco JSON no seguinte formato (sem texto extra):
            
            {
              "acao_sistema": "CRIAR_MANUTENCAO",
              "equipamentoId": "coloque_o_id_aqui",
              "tipo": "Preventiva ou Corretiva",
              "descricao": "Resumo do que o usuario pediu",
              "dataInicio": "2024-05-20T10:00:00Z",
              "dataFim": "2024-05-20T17:00:00Z"
            }

            Atenção: A "dataFim" é opcional, envie null se ele não falar o horário que finaliza.
        `;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction
        });

        // =========================================================================
        // 3. RECUPERANDO A MEMÓRIA DO USUÁRIO
        // =========================================================================
        const historicoBanco = await prisma.chatHistorico.findMany({
            where: { usuario: usuarioNome },
            orderBy: { createdAt: 'asc' },
            take: 10 // Lembra das últimas 10 mensagens
        });

        const history = historicoBanco.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.mensagem }]
        }));

        console.log(`[AGENTE] Memória: ${history.length} msgs. Processando: "${perguntaUsuario}"...`);

        // INICIA O CHAT COM A MEMÓRIA
        const chat = model.startChat({ history: history });

        // =========================================================================
        // 4. ENVIANDO PARA O GOOGLE E RECEBENDO RESPOSTA
        // =========================================================================
        const result = await chat.sendMessage(perguntaUsuario);
        let textoDaIA = result.response.text();
        let respostaFinalTexto = textoDaIA;

        // =========================================================================
        // 5. A MÁGICA DA AUTOMAÇÃO: INTERCEPTANDO A AÇÃO!
        // =========================================================================
        if (textoDaIA.includes('"acao_sistema":') || textoDaIA.includes('CRIAR_MANUTENCAO')) {
            console.log("[AGENTE] A IA decidiu executar uma ação no banco!");
            
            try {
                // Limpa formatações Markdown
                let jsonLimpo = textoDaIA.replace(/```json/g, '').replace(/```/g, '').trim();
                const comando = JSON.parse(jsonLimpo);

                if (comando.acao_sistema === "CRIAR_MANUTENCAO") {
                    
                    const numeroOSGerado = `OS-${Date.now()}`;

                    // EXECUTA NO BANCO DE DADOS
                    await prisma.manutencao.create({
                        data: {
                            numeroOS: numeroOSGerado,
                            tipo: comando.tipo || "Preventiva",
                            status: "Agendada",
                            descricaoProblemaServico: comando.descricao,
                            dataHoraAgendamentoInicio: new Date(comando.dataInicio),
                            dataHoraAgendamentoFim: comando.dataFim ? new Date(comando.dataFim) : null,
                            equipamentoId: comando.equipamentoId
                        }
                    });

                    // Modifica o texto que o usuário vai ler
                    respostaFinalTexto = `✅ Comando executado! Agendei uma manutenção ${comando.tipo} com sucesso.\nO número da OS gerada é: **${numeroOSGerado}**.`;
                }

            } catch (errExecucao) {
                console.error("Erro ao tentar executar a ação no banco:", errExecucao);
                respostaFinalTexto = "Entendi que você quer agendar, mas faltou algum dado importante ou não achei o equipamento exato. Pode repetir com mais detalhes?";
            }
        }

        // =========================================================================
        // 6. SALVANDO A CONVERSA NO BANCO DE DADOS (MEMÓRIA)
        // =========================================================================
        await prisma.chatHistorico.createMany({
            data: [
                { usuario: usuarioNome, role: "user", mensagem: perguntaUsuario },
                { usuario: usuarioNome, role: "model", mensagem: respostaFinalTexto }
            ]
        });

        // 7. Retorna a resposta (seja texto normal ou o aviso de sucesso da OS)
        return respostaFinalTexto;

    } catch (error) {
        console.error("ERRO NO SDK DO GOOGLE:", error.message);
        throw new Error(`Falha ao conectar com o Google AI: ${error.message}`);
    }
};