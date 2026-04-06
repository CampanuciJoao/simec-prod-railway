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

    // 1. RECUPERAR O ESTADO DO ÚLTIMO JSON (Memória da conversa)
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

    // 2. CONFIGURAR A IA COM O ESTADO ATUAL
    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });

    const systemInstruction = `Você é um formulário de manutenção SIMEC. 
    ESTADO ATUAL: ${JSON.stringify(estadoAtual)}.
    EQUIPAMENTOS: ${JSON.stringify(equipamentosAtivos)}.
    
    REGRA: Preencha os campos vazios do JSON acima. Se o usuário fornecer um dado, atualize o campo correspondente.
    Se faltar informação, responda APENAS: "Falta: [campo]". Não repita o que já está preenchido.
    Quando tudo estiver preenchido, retorne o JSON completo com "acao_sistema": "CRIAR_MANUTENCAO".`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // 3. ENVIAR COM O ESTADO EMBUTIDO
    const promptFinal = `Usuário disse: "${perguntaUsuario}". Atualize o JSON: ${JSON.stringify(estadoAtual)} e me diga o que falta ou confirme o agendamento.`;
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