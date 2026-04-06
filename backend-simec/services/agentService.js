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

    // 1. RECUPERAR ESTADO ATUAL
    const ultimaInteracao = await prisma.chatHistorico.findFirst({
        where: { usuario: usuarioNome, role: 'model' },
        orderBy: { createdAt: 'desc' }
    });

    let estadoAtual = {
        equipamentoId: null, tipo: null, numeroChamado: null, descricao: null, dataInicio: null, dataFim: null
    };

    if (ultimaInteracao) {
        const match = ultimaInteracao.mensagem.match(/\{[\s\S]*\}/);
        if (match) {
            try { estadoAtual = JSON.parse(match[0]); } catch (e) { console.error("Erro ao ler estado:", e); }
        }
    }

    // 2. CONFIGURAR IA
    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });

    const systemInstruction = `Você é um formulário de manutenção SIMEC. 
    ESTADO ATUAL: ${JSON.stringify(estadoAtual)}.
    EQUIPAMENTOS: ${JSON.stringify(equipamentosAtivos)}.
    
    REGRA DE OURO: 
    - Retorne SEMPRE um JSON.
    - Se faltar dado: Retorne JSON com os campos preenchidos e o campo "mensagem" indicando o que falta.
    - Se TUDO estiver preenchido: Retorne JSON com "acao_sistema": "CRIAR_MANUTENCAO" e todos os dados preenchidos.
    - Estrutura obrigatória: {"estado": {...dados}, "mensagem": "...", "acao_sistema": "..." ou null}`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
    
    const promptFinal = `Usuário disse: "${perguntaUsuario}". Responda APENAS em formato JSON seguindo a estrutura definida.`;
    const result = await model.generateContent(promptFinal);
    let textoDaIA = result.response.text();
    const match = textoDaIA.match(/\{[\s\S]*\}/);
    
    if (match) {
        const jsonResposta = JSON.parse(match[0]);

        // 4. INTERCEPTAR AÇÃO FINAL
        if (jsonResposta.acao_sistema === "CRIAR_MANUTENCAO") {
            const numeroOSGerado = `OS-${Date.now()}`;
            await prisma.manutencao.create({
                data: {
                    numeroOS: numeroOSGerado,
                    tipo: jsonResposta.tipo,
                    status: "Agendada",
                    numeroChamado: jsonResposta.numeroChamado,
                    descricaoProblemaServico: jsonResposta.descricao,
                    dataHoraAgendamentoInicio: forcarFusoMS(jsonResposta.dataInicio),
                    dataHoraAgendamentoFim: forcarFusoMS(jsonResposta.dataFim),
                    equipamentoId: jsonResposta.equipamentoId
                }
            });
            textoDaIA = `✅ Agendamento concluído! OS: ${numeroOSGerado}`;
        } else {
            textoDaIA = jsonResposta.mensagem;
        }
    }

    await prisma.chatHistorico.createMany({
        data: [{ usuario: usuarioNome, role: "user", mensagem: perguntaUsuario }, { usuario: usuarioNome, role: "model", mensagem: textoDaIA }]
    });

    return textoDaIA;
};