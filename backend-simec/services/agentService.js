import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prismaService.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const processarComandoAgente = async (perguntaUsuario, usuarioNome = "Admin") => {
    
    // 1. CLASSIFICADOR DE INTENÇÃO (Otimizado)
    const promptClassificador = `
    Classifique a intenção desta mensagem: "${perguntaUsuario}".
    Categorias: AGENDAR_MANUTENCAO, RELATORIO, BUSCAR_APOLICE, MONITORAMENTO, OUTRO.
    Retorne APENAS a categoria em letras maiúsculas.
    `;
    
    const resultClass = await model.generateContent(promptClassificador);
    const intencao = resultClass.response.text().trim();

    // 2. ROTEADOR DE SERVIÇOS
    switch (intencao) {
        case 'AGENDAR_MANUTENCAO':
            return await servicoAgendamento(perguntaUsuario, usuarioNome);
        case 'RELATORIO':
            return "Em breve: Vou gerar relatórios para você.";
        case 'BUSCAR_APOLICE':
            return "Em breve: Vou buscar apólices.";
        default:
            return "Desculpe, não entendi. Posso ajudar a agendar uma manutenção, por exemplo.";
    }
};

// 3. SERVIÇO ESPECÍFICO DE AGENDAMENTO
async function servicoAgendamento(mensagem, usuarioNome) {
    let estado = await buscarEstadoChat(usuarioNome);

    const promptExtracao = `
    Extraia os dados deste JSON: ${JSON.stringify(estado)}.
    Mensagem do usuário: "${mensagem}".
    Regras: Mantenha valores já existentes se o usuário não os alterar.
    Retorne APENAS um objeto JSON válido (sem markdown ou texto extra).
    `;
    
    try {
        const result = await model.generateContent(promptExtracao);
        const textoIA = result.response.text().replace(/```json|```/g, '').trim();
        const extraido = JSON.parse(textoIA);

        // Mescla o estado com o que foi extraído
        estado = { ...estado, ...extraido };
        
        // 4. VALIDAÇÃO NO BACKEND
        const obrigatorios = { 'equipamento': 'Equipamento', 'data': 'Data', 'tipo': 'Tipo' };
        const faltantes = Object.keys(obrigatorios).filter(campo => !estado[campo]);

        if (faltantes.length > 0) {
            await salvarEstadoChat(usuarioNome, estado); // Salva o progresso parcial
            return `Entendido. Para continuar, preciso do: ${obrigatorios[faltantes[0]]}.`;
        }

        // Se chegou aqui, todos os dados foram preenchidos!
        await criarManutencaoNoBanco(estado);
        await limparEstadoChat(usuarioNome);
        return "✅ Agendamento concluído com sucesso!";

    } catch (error) {
        console.error("Erro na extração IA:", error);
        return "Desculpe, não consegui processar as informações. Pode repetir de forma mais simples?";
    }
}

// Funções auxiliares (Persistência)
async function buscarEstadoChat(user) {
    const chat = await prisma.chatHistorico.findFirst({ where: { usuario: user }, orderBy: { createdAt: 'desc' }});
    return chat ? JSON.parse(chat.mensagem) : {};
}

async function salvarEstadoChat(user, estado) {
    // Apaga o estado anterior para manter apenas o atual
    await prisma.chatHistorico.deleteMany({ where: { usuario: user } });
    await prisma.chatHistorico.create({ data: { usuario: user, role: 'model', mensagem: JSON.stringify(estado) } });
}

async function limparEstadoChat(user) {
    await prisma.chatHistorico.deleteMany({ where: { usuario: user } });
}

async function criarManutencaoNoBanco(estado) {
    // Encontra o equipamento real no banco
    const equip = await prisma.equipamento.findFirst({
        where: { OR: [{ modelo: { contains: estado.equipamento } }, { tag: { contains: estado.equipamento } }] }
    });

    if (!equip) throw new Error("Equipamento não encontrado no sistema.");

    // Cria a OS
    const total = await prisma.manutencao.count();
    const numeroOS = `M-${(total + 1).toString().padStart(4, '0')}`;
    
    await prisma.manutencao.create({
        data: {
            numeroOS,
            tipo: estado.tipo,
            descricaoProblemaServico: estado.descricao || "Solicitação via IA",
            dataHoraAgendamentoInicio: new Date(estado.data),
            equipamentoId: equip.id,
            status: 'Agendada'
        }
    });
}