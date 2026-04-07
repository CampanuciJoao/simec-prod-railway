// simec/backend-simec/services/agent/agendamentoUtils.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
// MANTER VERSÃO 2.5 CONFORME REGRA DE AMBIENTE
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// --- CONTRATO DE DADOS (SCHEMA ZOD) ---
const AgendamentoSchema = z.object({
    tipo: z.enum(['Corretiva', 'Preventiva']).nullable(),
    unidadeTexto: z.string().nullable(),
    equipamentoTexto: z.string().nullable(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // Valida YYYY-MM-DD
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),  // Valida HH:mm
    horaFim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),     // Valida HH:mm
    numeroChamado: z.string().nullable(),
    descricao: z.string().nullable(),
    confirmacao: z.boolean().nullable()
});

/**
 * Usa a IA para extrair informações estruturadas da conversa.
 */
export const extrairCamposComIA = async (mensagem, estado) => {
    // Fornece o contexto de hoje para a IA calcular datas relativas corretamente
    const dataHoje = new Date().toISOString().split('T')[0];

    const prompt = `
    DATA_HOJE: ${dataHoje}
    ESTADO_ATUAL: ${JSON.stringify(estado)}
    MENSAGEM_USUARIO: "${mensagem}"
    
    TAREFA: Extraia os dados para agendamento de manutenção hospitalar.
    Retorne APENAS o JSON puro. Sem textos extras, sem markdown.
    
    ESTRUTURA:
    { "tipo": null, "unidadeTexto": null, "equipamentoTexto": null, "data": null, "horaInicio": null, "horaFim": null, "numeroChamado": null, "descricao": null, "confirmacao": null }
    
    REGRAS:
    1. "data": Se o usuário disser "amanhã", retorne a data de amanhã em YYYY-MM-DD.
    2. "confirmacao": true para sim/ok/pode/confirmo. false para não/cancela/mudar.
    3. Mantenha null se a informação não estiver clara na mensagem.
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const textoBruto = result.response.text();
        
        // Limpeza Sênior: Extrai o que está entre { } ignorando ruído da IA
        const jsonMatch = textoBruto.match(/{[\s\S]*}/);
        if (!jsonMatch) return {};

        const jsonObjeto = JSON.parse(jsonMatch[0]);
        
        // Validação defensiva com Zod
        const validacao = AgendamentoSchema.safeParse(jsonObjeto);
        
        if (!validacao.success) {
            // Se o Zod falhar (ex: data no formato errado), 
            // limpamos os campos inválidos mas mantemos o resto.
            console.warn("[AGENT_VALIDATION] IA enviou dados fora do padrão. Limpando campos...");
            const dadosLimpos = { ...jsonObjeto };
            validacao.error.issues.forEach(issue => {
                dadosLimpos[issue.path[0]] = null; // Reseta apenas o campo que falhou
            });
            return dadosLimpos;
        }

        return validacao.data;

    } catch (e) {
        console.error("[AGENT_EXTRACT_ERROR]:", e.message);
        return {};
    }
};

/**
 * Une os dados novos com os antigos sem sobrescrever com valores nulos.
 */
export const mergeEstadoSeguro = (estado, extraido) => {
    const novo = { ...estado };
    const CAMPOS = ['tipo', 'unidadeTexto', 'equipamentoTexto', 'data', 'horaInicio', 'horaFim', 'numeroChamado', 'descricao', 'confirmacao'];
    
    CAMPOS.forEach(campo => {
        if (extraido[campo] !== null && extraido[campo] !== undefined && extraido[campo] !== '') {
            novo[campo] = extraido[campo];
        }
    });
    return novo;
};

/**
 * Define o que falta baseado no tipo de manutenção.
 */
export const getFaltantes = (estado) => {
    // Requisitos básicos (precisam de IDs reais do banco)
    const base = ['unidadeId', 'equipamentoId', 'tipo', 'data', 'horaInicio', 'horaFim'];
    
    const obrigatorios = estado.tipo === 'Corretiva' 
        ? [...base, 'numeroChamado', 'descricao'] 
        : base;

    return obrigatorios.filter(campo => !estado[campo]);
};

/**
 * Traduz campos técnicos para perguntas amigáveis no chat.
 */
export const proximaPergunta = (estado, faltantes) => {
    const mapa = { 
        unidadeId: 'a unidade (hospital)', 
        equipamentoId: 'o nome ou modelo do equipamento', 
        tipo: 'o tipo de manutenção (Preventiva ou Corretiva)', 
        data: 'a data (dia/mês/ano)', 
        horaInicio: 'o horário de início', 
        horaFim: 'o horário de término', 
        numeroChamado: 'o número do chamado/ticket', 
        descricao: 'uma breve descrição do problema' 
    };
    return `Para agendar, por favor me informe **${mapa[faltantes[0]]}**.`;
};

/**
 * Gera o resumo visual para a confirmação final.
 */
export const buildResumoConfirmacao = (estado) => {
    const dataFmt = estado.data ? estado.data.split('-').reverse().join('/') : '';
    return `📋 **Resumo para Agendamento**
- **Ativo:** ${estado.equipamentoNome} (Tag: ${estado.tag})
- **Unidade:** ${estado.unidadeNome}
- **Tipo:** ${estado.tipo}
- **Data/Hora:** ${dataFmt} | das ${estado.horaInicio} às ${estado.horaFim}
${estado.tipo === 'Corretiva' ? `- **Chamado:** ${estado.numeroChamado}` : ''}

**Confirma a criação desta manutenção?** (Responda **Sim** ou **Não**)`;
};