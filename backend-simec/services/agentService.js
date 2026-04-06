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

    // 1. RECUPERAR ESTADO ATUAL DO BANCO (O JSON que a IA gerou por último)
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
            try { 
                const obj = JSON.parse(match[0]);
                estadoAtual = obj.estado || estadoAtual; // Recupera apenas o estado
            } catch (e) { console.error("Erro ao ler estado:", e); }
        }
    }

    // 2. CONFIGURAR IA
    const equipamentosAtivos = await prisma.equipamento.findMany({ 
        select: { id: true, tag: true, modelo: true, unidade: { select: { nomeSistema: true } } }, 
        take: 200 
    });

    const systemInstruction = `Você é um preenchedor de formulário do SIMEC.
    EQUIPAMENTOS DISPONÍVEIS: ${JSON.stringify(equipamentosAtivos)}.
    REGRA: Você deve preencher o JSON abaixo.
    Se o usuário citar um equipamento, busque o ID na lista acima. NÃO PEÇA O ID se puder identificar pelo nome/tag.
    
    ESTRUTURA DE RESPOSTA OBRIGATÓRIA:
    {
      "estado": { "equipamentoId": "...", "tipo": "...", "numeroChamado": "...", "descricao": "...", "dataInicio": "...", "dataFim": "..." },
      "mensagem": "Sua pergunta ou resumo para o usuário",
      "acao_sistema": null 
    }
    Se tudo estiver preenchido, defina "acao_sistema": "CRIAR_MANUTENCAO".`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
    
    // 3. ENVIAR COM ESTADO ATUAL FORÇADO
    const promptFinal = `Estado atual dos dados: ${JSON.stringify(estadoAtual)}. Usuário disse: "${perguntaUsuario}". Atualize os dados e responda.`;
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
                    tipo: jsonResposta.estado.tipo,
                    status: "Agendada",
                    numeroChamado: jsonResposta.estado.numeroChamado,
                    descricaoProblemaServico: jsonResposta.estado.descricao,
                    dataHoraAgendamentoInicio: forcarFusoMS(jsonResposta.estado.dataInicio),
                    dataHoraAgendamentoFim: forcarFusoMS(jsonResposta.estado.dataFim),
                    equipamentoId: jsonResposta.estado.equipamentoId
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