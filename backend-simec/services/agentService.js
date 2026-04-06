import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    // 1. RECUPERAR ESTADO DO BANCO
    const ultimaInteracao = await prisma.chatHistorico.findFirst({
        where: { usuario: usuarioNome, role: 'model' },
        orderBy: { createdAt: 'desc' }
    });

    let estadoAtual = {
        equipamentoId: null, tag: null, tipo: null, numeroChamado: null, 
        descricao: null, dataInicio: null, dataFim: null
    };

    if (ultimaInteracao) {
        try { estadoAtual = JSON.parse(ultimaInteracao.mensagem); } catch (e) {}
    }

    // 2. PROMPT OBJETIVO (O segredo: sem explicações, sem listas longas)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Você é um extrator de dados. Seu objetivo é preencher este JSON: ${JSON.stringify(estadoAtual)}.
    Usuário disse: "${perguntaUsuario}".
    
    REGRAS:
    1. Preencha apenas os campos que o usuário forneceu.
    2. Se o usuário fornecer um nome de equipamento, apenas coloque o NOME no campo "tag" ou "modelo", não tente adivinhar o ID.
    3. Retorne APENAS um JSON válido. Não diga nada.
    4. Se for Corretiva, "numeroChamado" é obrigatório.
    `;

    const result = await model.generateContent(prompt);
    const jsonIA = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)[0]);

    // 3. RESOLUÇÃO NO BACKEND (Aqui é onde a mágica acontece)
    // Se a IA extraiu um nome de equipamento, o seu backend busca o ID real
    if (jsonIA.tag || jsonIA.modelo) {
        const equip = await prisma.equipamento.findFirst({
            where: { OR: [{ tag: { contains: jsonIA.tag || '' } }, { modelo: { contains: jsonIA.modelo || '' } }] }
        });
        if (equip) jsonIA.equipamentoId = equip.id;
    }

    // 4. VALIDAÇÃO DE CAMPOS (Backend decide o que falta)
    const faltantes = [];
    if (!jsonIA.equipamentoId) faltantes.push("Equipamento");
    if (jsonIA.tipo === 'Corretiva' && !jsonIA.numeroChamado) faltantes.push("Número do Chamado");
    if (!jsonIA.descricao) faltantes.push("Descrição do problema");

    // 5. RESPOSTA AO USUÁRIO
    let resposta = "";
    if (faltantes.length > 0) {
        resposta = `Falta preencher: ${faltantes.join(', ')}.`;
    } else {
        // TUDO PRONTO
        await prisma.manutencao.create({ /* ... criar OS ... */ });
        resposta = "✅ Agendamento concluído!";
        jsonIA = { /* resetar estado */ };
    }

    await prisma.chatHistorico.create({ data: { usuario: usuarioNome, role: "model", mensagem: JSON.stringify(jsonIA) } });
    return resposta;
};