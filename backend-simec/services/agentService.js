// Ficheiro: simec/backend-simec/services/agentService.js

export const processarComandoAgente = async (perguntaUsuario, usuarioNome) => {
    try {
        // CORREÇÃO: Trocamos 'gemini-1.5-flash' por 'gemini-pro' 
        // ou adicionamos o prefixo correto que o Google exige em algumas regiões.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `Você é o Guardião SIMEC, assistente inteligente de engenharia clínica. 
                    O usuário atual é ${usuarioNome || 'Administrador'}.
                    Sempre responda de forma técnica e prestativa.` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Como posso auxiliar na gestão hospitalar hoje?" }],
                },
            ],
        });

        console.log(`[Agente SIMEC] Processando comando: "${perguntaUsuario}"`);

        const result = await chat.sendMessage(perguntaUsuario);
        const response = await result.response;
        const textoResposta = response.text();

        if (!textoResposta) {
            throw new Error("A IA retornou uma resposta vazia.");
        }

        return textoResposta;

    } catch (error) {
        console.error("--- ERRO NO SERVIÇO DO AGENTE ---");
        console.error("Mensagem:", error.message);
        
        // Se o gemini-pro também falhar, tentaremos a última alternativa de nome
        throw new Error(`Falha na IA: ${error.message}`);
    }
};