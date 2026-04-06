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

    // 1. RECUPERAR ESTADO ATUAL (O JSON que a IA gerou por último)
    const ultimaInteracao = await prisma.chatHistorico.findFirst({
        where: { usuario: usuarioNome, role: 'model' },
        orderBy: { createdAt: 'desc' }
    });

    let estadoAtual = {
        equipamentoId: null, tipo: null, numeroChamado: null, descricao: null, dataInicio: null, dataFim: null
    };

    // Tenta recuperar o que já foi preenchido anteriormente
    if (ultimaInteracao) {
        const match = ultimaInteracao.mensagem.match(/\{[\s\S]*\}/);
        if (match) {
            try { estadoAtual = JSON.parse(match[0]); } catch (e) {}
        }
    }

    // 2. CONFIGURAR A IA COM O ESTADO ATUAL
    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });

    const systemInstruction = `
    Você é o Guardião SIMEC. Seu objetivo é completar este objeto JSON: ${JSON.stringify(estadoAtual)}.
    EQUIPAMENTOS: ${JSON.stringify(equipamentosAtivos)}.
    
    REGRAS:
    1. Analise o que já está preenchido no JSON acima. NÃO PERGUNTE O QUE JÁ ESTÁ PREENCHIDO.
    2. Se faltar algo, pergunte apenas o que falta.
    3. Quando TODOS os campos estiverem preenchidos, retorne APENAS o JSON final com "acao_sistema": "CRIAR_MANUTENCAO".
    4. Se for CORRETIVA, o numeroChamado é obrigatório.
    `;

    const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
    
    // 3. ENVIAR COM O ESTADO EMBUTIDO NO PROMPT
    const promptFinal = `Estado atual dos dados: ${JSON.stringify(estadoAtual)}. Usuário disse: "${perguntaUsuario}". Atualize o JSON e responda.`;
    const result = await model.generateContent(promptFinal);
    let textoDaIA = result.response.text();

    // 4. INTERCEPTAR AÇÃO FINAL
    if (textoDaIA.includes('"acao_sistema": "CRIAR_MANUTENCAO"')) {
        const match = textoDaIA.match(/\{[\s\S]*\}/);
        const comando = JSON.parse(match[0]);
        
        const numeroOSGerado = `OS-${Date.now()}`;
        await prisma.manutencao.create({
            data: {
                numeroOS: numeroOSGerado,
                tipo: comando.tipo,
                status: "Agendada",
                numeroChamado: comando.numeroChamado,
                descricaoProblemaServico: comando.descricao,
                dataHoraAgendamentoInicio: forcarFusoMS(comando.dataInicio),
                dataHoraAgendamentoFim: forcarFusoMS(comando.dataFim),
                equipamentoId: comando.equipamentoId
            }
        });
        textoDaIA = `✅ Agendamento concluído! OS: ${numeroOSGerado}`;
    }

    await prisma.chatHistorico.createMany({
        data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
    });

    return textoDaIA;
};