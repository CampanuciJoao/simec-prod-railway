// simec/backend-simec/services/agent/agendamentoUtils.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

// --- 1. CONTRATO DE DADOS (ZOD) ---
const AgendamentoSchema = z.object({
    tipo: z.enum(['Corretiva', 'Preventiva']).nullable(),
    unidadeTexto: z.string().nullable(),
    equipamentoTexto: z.string().nullable(),
    data: z.string().nullable(), 
    horaInicio: z.string().nullable(),
    horaFim: z.string().nullable(),
    numeroChamado: z.string().nullable(),
    descricao: z.string().nullable(),
    confirmacao: z.boolean().nullable()
});

/**
 * Extrai dados estruturados e normaliza formatos de hora/data.
 */
export const extrairCamposComIA = async (mensagem, estado) => {
    const dataHoje = new Date().toISOString().split('T')[0];

    const prompt = `
    DATA_HOJE: ${dataHoje}
    ESTADO_ATUAL: ${JSON.stringify(estado)}
    MENSAGEM: "${mensagem}"
    
    TAREFA: Extraia os dados de agendamento hospitalar para o JSON abaixo.
    { "tipo": null, "unidadeTexto": null, "equipamentoTexto": null, "data": null, "horaInicio": null, "horaFim": null, "numeroChamado": null, "descricao": null, "confirmacao": null }
    
    REGRAS DE OURO:
    1. Se disser "Tomografia de Coxim", extraia "Tomografia" em equipamentoTexto e "Coxim" em unidadeTexto.
    2. "horaInicio/horaFim": Sempre converta para formato HH:mm (Ex: "11h" vira "11:00", "meio dia" vira "12:00").
    3. "data": Se disser "hoje", use ${dataHoje}.
    4. "confirmacao": true para sim/confirmar, false para não/cancelar.
    Retorne APENAS o JSON puro.
    `;
    
    try {
        const result = await model.generateContent(prompt);
        const jsonMatch = result.response.text().match(/{[\s\S]*}/);
        if (!jsonMatch) return {};

        const jsonObjeto = JSON.parse(jsonMatch[0]);

        // Normalização manual de segurança para o formato de hora HH:mm
        if (jsonObjeto.horaInicio) jsonObjeto.horaInicio = normalizarHora(jsonObjeto.horaInicio);
        if (jsonObjeto.horaFim) jsonObjeto.horaFim = normalizarHora(jsonObjeto.horaFim);

        return AgendamentoSchema.parse(jsonObjeto);

    } catch (e) {
        console.error("[AGENT_EXTRACT_ERROR]:", e.message);
        return {};
    }
};

/**
 * Helper: Converte "11h" ou "11:30h" para "11:00" ou "11:30"
 */
const normalizarHora = (texto) => {
    if (!texto) return null;
    let h = texto.toLowerCase().replace('h', '').trim();
    if (!h.includes(':')) {
        h = h.length === 1 ? `0${h}:00` : `${h}:00`;
    }
    if (h.length === 4 && h.includes(':')) h = `0${h}`;
    return h;
};

/**
 * Validação de Regra de Negócio: Impede agendamentos no passado.
 */
export const validarHorarioFuturo = (data, hora) => {
    if (!data || !hora) return { valido: true };
    const agora = new Date();
    const solicitado = new Date(`${data}T${hora}:00`);
    
    if (solicitado < agora) {
        const agoraFmt = `${agora.getHours()}:${agora.getMinutes().toString().padStart(2, '0')}`;
        return { 
            valido: false, 
            msg: `O horário **${hora}** já passou. Agora são **${agoraFmt}**. Por favor, informe um horário futuro.` 
        };
    }
    return { valido: true };
};

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

export const getFaltantes = (estado) => {
    const base = ['unidadeId', 'equipamentoId', 'tipo', 'data', 'horaInicio', 'horaFim'];
    const obrigatorios = estado.tipo === 'Corretiva' ? [...base, 'numeroChamado', 'descricao'] : base;
    return obrigatorios.filter(campo => !estado[campo]);
};

export const proximaPergunta = (estado, faltantes) => {
    const mapa = { 
        unidadeId: 'a unidade (hospital)', 
        equipamentoId: 'o nome do equipamento', 
        tipo: 'o tipo (Preventiva ou Corretiva)', 
        data: 'a data', 
        horaInicio: 'o horário de início', 
        horaFim: 'o horário de término', 
        numeroChamado: 'o número do chamado', 
        descricao: 'a descrição do problema' 
    };
    return `Para agendar, por favor me informe **${mapa[faltantes[0]]}**.`;
};

export const buildResumoConfirmacao = (estado) => {
    const dataFmt = estado.data ? estado.data.split('-').reverse().join('/') : '';
    return `📋 **Resumo para Agendamento**
- **Ativo:** ${estado.equipamentoNome} (Tag: ${estado.tag})
- **Local:** ${estado.unidadeNome}
- **Tipo:** ${estado.tipo}
- **Horário:** ${dataFmt} | das ${estado.horaInicio} às ${estado.horaFim}
${estado.tipo === 'Corretiva' ? `- **Chamado:** ${estado.numeroChamado}` : ''}

**Confirma a criação desta manutenção?** (Responda **Sim** ou **Não**)`;
};