// simec/backend-simec/services/agent/agendamentoUtils.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONTRATO DE DADOS (SCHEMA ZOD) ---
// Define as regras rígidas de formato para os dados que entram no banco.
const AgendamentoSchema = z.object({
    tipo: z.enum(['Corretiva', 'Preventiva']).nullable(),
    unidadeTexto: z.string().nullable(),
    equipamentoTexto: z.string().nullable(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // YYYY-MM-DD
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),  // HH:mm
    horaFim: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),     // HH:mm
    numeroChamado: z.string().nullable(),
    descricao: z.string().nullable(),
    confirmacao: z.boolean().nullable()
});

/**
 * Usa a IA para extrair informações estruturadas de uma mensagem de texto.
 */
export const extrairCamposComIA = async (mensagem, estado) => {
    // Referência temporal para a IA conseguir calcular "amanhã", "hoje" ou "sexta"
    const dataHoje = new Date().toISOString().split('T')[0];

    const prompt = `
    DATA_REFERENCIA_HOJE: ${dataHoje}
    ESTADO_ATUAL_JSON: ${JSON.stringify(estado)}
    MENSAGEM_USUARIO: "${mensagem}"
    
    Tarefa: Extraia dados para agendamento de manutenção hospitalar.
    Retorne APENAS o JSON no formato abaixo, sem markdown, sem explicações.
    
    { "tipo": null, "unidadeTexto": null, "equipamentoTexto": null, "data": null, "horaInicio": null, "horaFim": null, "numeroChamado": null, "descricao": null, "confirmacao": null }
    
    Regras Críticas:
    1. "data": Se o usuário disser datas relativas, converta para YYYY-MM-DD usando a DATA_REFERENCIA_HOJE.
    2. "confirmacao": true para sim/confirmo, false para não/cancela.
    3. Não invente informações. Se não houver certeza, retorne null.
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const textoBruto = result.response.text();
        
        // Limpeza Sênior: Extrai apenas o conteúdo entre as primeiras e últimas chaves
        const jsonMatch = textoBruto.match(/{[\s\S]*}/);
        if (!jsonMatch) return {};

        const jsonObjeto = JSON.parse(jsonMatch[0]);
        
        // Validação parcial: Pegamos os dados validados pelo Zod
        const resultadoZod = AgendamentoSchema.safeParse(jsonObjeto);
        
        if (!resultadoZod.success) {
            // Se falhar o formato (ex: data errada), logamos o erro e retornamos o que for possível
            console.warn("[AGENT_VALIDATION_WARNING] Campos mal formatados ignorados.");
            return jsonObjeto; 
        }

        return resultadoZod.data;

    } catch (e) {
        console.error("[AGENT_EXTRACT_ERROR] Falha crítica na extração:", e.message);
        return {};
    }
};

/**
 * Mescla o estado antigo com os novos dados, impedindo que campos vazios apaguem dados já salvos.
 */
export const mergeEstadoSeguro = (estado, extraido) => {
    const novo = { ...estado };
    const camposPermitidos = ['tipo', 'unidadeTexto', 'equipamentoTexto', 'data', 'horaInicio', 'horaFim', 'numeroChamado', 'descricao', 'confirmacao'];
    
    camposPermitidos.forEach(campo => {
        const valorNovo = extraido[campo];
        // Só atualiza se o valor novo não for nulo, indefinido ou string vazia.
        if (valorNovo !== null && valorNovo !== undefined && valorNovo !== '') {
            novo[campo] = valorNovo;
        }
    });
    return novo;
};

/**
 * Define quais campos ainda faltam para o agendamento ser considerado completo.
 */
export const getFaltantes = (estado) => {
    // Requisitos mínimos (IDs reais do banco)
    const base = ['unidadeId', 'equipamentoId', 'tipo', 'data', 'horaInicio', 'horaFim'];
    
    // Se for Corretiva, exigimos campos adicionais
    const obrigatorios = estado.tipo === 'Corretiva' 
        ? [...base, 'numeroChamado', 'descricao'] 
        : base;

    return obrigatorios.filter(campo => !estado[campo]);
};

/**
 * Tradutor de nomes técnicos para linguagem humana para as perguntas do chat.
 */
export const proximaPergunta = (estado, faltantes) => {
    const mapa = { 
        unidadeId: 'unidade (hospital)', 
        equipamentoId: 'nome ou modelo do equipamento', 
        tipo: 'tipo de manutenção (Preventiva ou Corretiva)', 
        data: 'data do agendamento', 
        horaInicio: 'horário de início', 
        horaFim: 'horário de término', 
        numeroChamado: 'número do chamado (ticket)', 
        descricao: 'descrição do defeito' 
    };
    return `Entendi. Para continuar, por favor me informe o: **${mapa[faltantes[0]]}**.`;
};

/**
 * Constrói o resumo visual para a confirmação final do usuário.
 */
export const buildResumoConfirmacao = (estado) => {
    // Converte YYYY-MM-DD para DD/MM/YYYY para o usuário ler melhor
    const dataBR = estado.data ? estado.data.split('-').reverse().join('/') : '';
    
    return `📋 **Resumo do Agendamento**
- **Equipamento:** ${estado.equipamentoNome} (Tag: ${estado.tag})
- **Unidade:** ${estado.unidadeNome}
- **Tipo:** ${estado.tipo}
- **Data/Hora:** ${dataBR} das ${estado.horaInicio} às ${estado.horaFim}
${estado.tipo === 'Corretiva' ? `- **Chamado:** ${estado.numeroChamado}` : ''}

**Posso confirmar o agendamento?** (Responda **Sim** ou **Não**)`;
};