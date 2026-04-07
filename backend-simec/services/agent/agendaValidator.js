// simec/backend-simec/services/agent/agendamentoUtils.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY?.trim());
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- CONTRATO DE DADOS (ZOD) ---
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizarTipo = (valor) => {
    if (!valor || typeof valor !== 'string') return null;
    const v = valor.trim().toLowerCase();

    if (v.includes('corret')) return 'Corretiva';
    if (v.includes('prevent')) return 'Preventiva';

    return null;
};

const normalizarHora = (texto) => {
    if (!texto || typeof texto !== 'string') return null;

    let h = texto.toLowerCase().trim();

    if (h === 'meio dia' || h === 'meiodia') return '12:00';

    h = h.replace(/hs?$/i, '').replace(/h$/i, '').trim();

    if (/^\d{1,2}$/.test(h)) {
        return `${h.padStart(2, '0')}:00`;
    }

    if (/^\d{1,2}:\d{2}$/.test(h)) {
        const [hora, min] = h.split(':');
        return `${hora.padStart(2, '0')}:${min}`;
    }

    return null;
};

const normalizarData = (valor) => {
    if (!valor || typeof valor !== 'string') return null;
    return valor.trim();
};

const extrairCamposHeuristico = (mensagem, estado = {}) => {
    const msg = mensagem.trim();
    const lower = msg.toLowerCase();

    const extraido = {
        tipo: null,
        unidadeTexto: null,
        equipamentoTexto: null,
        data: null,
        horaInicio: null,
        horaFim: null,
        numeroChamado: null,
        descricao: null,
        confirmacao: null
    };

    // confirmação
    if (/^(sim|s|confirmo|pode confirmar|ok|certo)$/i.test(lower)) {
        extraido.confirmacao = true;
    } else if (/^(não|nao|n|cancelar|cancela)$/i.test(lower)) {
        extraido.confirmacao = false;
    }

    // tipo
    if (lower.includes('corretiva')) extraido.tipo = 'Corretiva';
    if (lower.includes('preventiva')) extraido.tipo = 'Preventiva';

    // unidade
    const matchUnidade = msg.match(/(?:unidade|hospital)\s+(?:de\s+)?(.+)/i);
    if (matchUnidade) {
        extraido.unidadeTexto = matchUnidade[1].trim();
    }

    // padrão "Tomografia de Coxim"
    const matchEquipUnidade = msg.match(/^(.+?)\s+de\s+([a-zà-ú0-9\s-]+)$/i);
    if (matchEquipUnidade && !extraido.equipamentoTexto && !extraido.unidadeTexto) {
        const esquerda = matchEquipUnidade[1].trim();
        const direita = matchEquipUnidade[2].trim();

        if (
            esquerda.length > 2 &&
            !['unidade', 'hospital', 'tipo', 'chamado'].includes(esquerda.toLowerCase())
        ) {
            extraido.equipamentoTexto = esquerda;
            extraido.unidadeTexto = direita;
        }
    }

    // horário tipo "das 12h até as 15h"
    const matchIntervalo = msg.match(/(?:das|de)\s+(\d{1,2}(?::\d{2})?\s*h?)\s+(?:até|as?|à|a)\s+(\d{1,2}(?::\d{2})?\s*h?)/i);
    if (matchIntervalo) {
        extraido.horaInicio = normalizarHora(matchIntervalo[1]);
        extraido.horaFim = normalizarHora(matchIntervalo[2]);
    }

    // data
    if (lower.includes('hoje')) {
        extraido.data = new Date().toISOString().split('T')[0];
    }

    // número do chamado
    const matchChamado = msg.match(/\b\d{4,}\b/);
    if (matchChamado && (estado.tipo === 'Corretiva' || lower.includes('chamado'))) {
        extraido.numeroChamado = matchChamado[0];
    }

    return extraido;
};

const normalizarObjetoIA = (obj) => {
    return {
        tipo: normalizarTipo(obj?.tipo),
        unidadeTexto: typeof obj?.unidadeTexto === 'string' ? obj.unidadeTexto.trim() : null,
        equipamentoTexto: typeof obj?.equipamentoTexto === 'string' ? obj.equipamentoTexto.trim() : null,
        data: normalizarData(obj?.data),
        horaInicio: normalizarHora(obj?.horaInicio),
        horaFim: normalizarHora(obj?.horaFim),
        numeroChamado: obj?.numeroChamado != null ? String(obj.numeroChamado).trim() : null,
        descricao: typeof obj?.descricao === 'string' ? obj.descricao.trim() : null,
        confirmacao: typeof obj?.confirmacao === 'boolean' ? obj.confirmacao : null
    };
};

/**
 * Extrai dados estruturados e normaliza formatos de hora/data.
 * Possui retry curto para 503 e fallback heurístico.
 */
export const extrairCamposComIA = async (mensagem, estado) => {
    const dataHoje = new Date().toISOString().split('T')[0];
    const fallback = extrairCamposHeuristico(mensagem, estado);

    const prompt = `
    DATA_HOJE: ${dataHoje}
    ESTADO_ATUAL: ${JSON.stringify(estado)}
    MENSAGEM: "${mensagem}"

    TAREFA:
    Extraia os dados do agendamento para este JSON:
    {
      "tipo": null,
      "unidadeTexto": null,
      "equipamentoTexto": null,
      "data": null,
      "horaInicio": null,
      "horaFim": null,
      "numeroChamado": null,
      "descricao": null,
      "confirmacao": null
    }

    REGRAS:
    1. Se disser "Tomografia de Coxim", extraia "Tomografia" em equipamentoTexto e "Coxim" em unidadeTexto.
    2. "tipo" deve ser apenas "Corretiva" ou "Preventiva".
    3. "horaInicio/horaFim" em HH:mm.
    4. Se disser "hoje", use ${dataHoje}.
    5. "confirmacao": true para sim/confirmar, false para não/cancelar, null caso contrário.
    6. Retorne APENAS JSON puro.
    `;

    for (let tentativa = 1; tentativa <= 2; tentativa++) {
        try {
            const result = await model.generateContent(prompt);
            const texto = result.response.text();
            const match = texto.match(/{[\s\S]*}/);

            if (!match) throw new Error('JSON não encontrado na resposta da IA');

            const bruto = JSON.parse(match[0]);
            const normalizado = normalizarObjetoIA(bruto);

            return AgendamentoSchema.parse(normalizado);
        } catch (e) {
            console.error(`[AGENT_EXTRACT_ERROR][tentativa ${tentativa}]:`, e.message);

            const erroTexto = String(e.message || '');
            const eh503 = erroTexto.includes('503') || erroTexto.includes('high demand');

            if (tentativa < 2 && eh503) {
                await sleep(700);
                continue;
            }
        }
    }

    try {
        return AgendamentoSchema.parse(normalizarObjetoIA(fallback));
    } catch {
        return {};
    }
};

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
    const CAMPOS = [
        'tipo',
        'unidadeTexto',
        'equipamentoTexto',
        'data',
        'horaInicio',
        'horaFim',
        'numeroChamado',
        'descricao',
        'confirmacao'
    ];

    CAMPOS.forEach(campo => {
        if (extraido[campo] !== null && extraido[campo] !== undefined && extraido[campo] !== '') {
            novo[campo] = extraido[campo];
        }
    });

    return novo;
};

export const getFaltantes = (estado) => {
    const base = ['unidadeId', 'equipamentoId', 'tipo', 'data', 'horaInicio', 'horaFim'];
    const obrigatorios = estado.tipo === 'Corretiva'
        ? [...base, 'numeroChamado', 'descricao']
        : base;

    return obrigatorios.filter(campo => !estado[campo]);
};

export const proximaPergunta = (estado, faltantes) => {
    const mapa = {
        unidadeId: 'a unidade (hospital)',
        equipamentoId: 'o equipamento',
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
- **Ativo:** ${estado.equipamentoNome || estado.modelo || estado.tipoEquipamento || 'Equipamento não resolvido'} (Tag: ${estado.tag || 'sem tag'})
- **Local:** ${estado.unidadeNome || 'Unidade não resolvida'}
- **Tipo:** ${estado.tipo}
- **Horário:** ${dataFmt} | das ${estado.horaInicio} às ${estado.horaFim}
${estado.tipo === 'Corretiva' ? `- **Chamado:** ${estado.numeroChamado}` : ''}

**Confirma a criação desta manutenção?** (Responda **Sim** ou **Não**)`;
};