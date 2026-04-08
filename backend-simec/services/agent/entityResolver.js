// simec/backend-simec/services/agent/entityResolver.js
import prisma from '../prismaService.js';

/**
 * Normaliza texto removendo excesso de espaços e padronizando minúsculas.
 */
function normalizarTexto(texto = '') {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Expande sinônimos comuns usados pelos usuários para equipamentos médicos.
 */
function expandirSinonimosEquipamento(texto = '') {
    const t = normalizarTexto(texto);

    const sinonimos = new Set([t]);

    if (/\b(rm|rnm|ressonancia magnetica|ressonancia)\b/.test(t)) {
        sinonimos.add('ressonancia');
        sinonimos.add('ressonancia magnetica');
        sinonimos.add('rm');
        sinonimos.add('rnm');
    }

    if (/\b(tc|ct|tomografia|tomografo)\b/.test(t)) {
        sinonimos.add('tomografia');
        sinonimos.add('tomografo');
        sinonimos.add('tc');
        sinonimos.add('ct');
    }

    if (/\b(rx|raio x|raio-x|radiografia)\b/.test(t)) {
        sinonimos.add('raio x');
        sinonimos.add('raio-x');
        sinonimos.add('radiografia');
        sinonimos.add('rx');
    }

    if (/\b(us|uss|ultrassom|ultra-sonografia|ultrasonografia|ultra)\b/.test(t)) {
        sinonimos.add('ultrassom');
        sinonimos.add('ultrasonografia');
        sinonimos.add('us');
        sinonimos.add('uss');
        sinonimos.add('ultra');
    }

    if (/\b(dr|radiografia digital)\b/.test(t)) {
        sinonimos.add('dr');
        sinonimos.add('radiografia digital');
    }

    if (/\b(mammo|mamografia|mamografo|mamografo)\b/.test(t)) {
        sinonimos.add('mamografia');
        sinonimos.add('mamografo');
        sinonimos.add('mammo');
    }

    if (/\b(act revolution)\b/.test(t)) {
        sinonimos.add('act revolution');
        sinonimos.add('tomografia');
    }

    if (/\b(aquilion ct)\b/.test(t)) {
        sinonimos.add('aquilion ct');
        sinonimos.add('ct');
        sinonimos.add('tomografia');
    }

    return Array.from(sinonimos);
}

/**
 * Resolve os nomes de texto da IA para registros reais do banco.
 * Estratégia:
 * 1. Resolver unidade
 * 2. Resolver equipamento primeiro na unidade
 * 3. Se não achar, tenta busca global
 * 4. Se houver múltiplos, devolve ambiguidade
 */
export async function resolverEntidades(estado) {
    const novo = { ...estado };

    delete novo.ambiguidadeEquipamento;

    // 1) Resolver unidade
    if (novo.unidadeTexto && !novo.unidadeId) {
        const unidadeTextoNormalizado = normalizarTexto(novo.unidadeTexto);

        const unidade = await prisma.unidade.findFirst({
            where: {
                OR: [
                    { nomeSistema: { contains: unidadeTextoNormalizado, mode: 'insensitive' } },
                    { nomeFantasia: { contains: unidadeTextoNormalizado, mode: 'insensitive' } },
                    { cidade: { contains: unidadeTextoNormalizado, mode: 'insensitive' } }
                ]
            }
        });

        if (unidade) {
            novo.unidadeId = unidade.id;
            novo.unidadeNome = unidade.nomeSistema;
        }
    }

    // 2) Resolver equipamento
    if (novo.equipamentoTexto && !novo.equipamentoId) {
        const termosBusca = expandirSinonimosEquipamento(novo.equipamentoTexto);

        const montarOR = () => {
            const condicoes = [];

            for (const termo of termosBusca) {
                condicoes.push({ modelo: { contains: termo, mode: 'insensitive' } });
                condicoes.push({ tipo: { contains: termo, mode: 'insensitive' } });
                condicoes.push({ tag: { contains: termo, mode: 'insensitive' } });
                condicoes.push({ fabricante: { contains: termo, mode: 'insensitive' } });
                condicoes.push({ setor: { contains: termo, mode: 'insensitive' } });
            }

            return condicoes;
        };

        const montarWhere = (comUnidade = true) => ({
            ...(comUnidade && novo.unidadeId ? { unidadeId: novo.unidadeId } : {}),
            OR: montarOR()
        });

        let equipamentos = await prisma.equipamento.findMany({
            where: montarWhere(true),
            include: { unidade: true },
            take: 10
        });

        // 3) Busca global se nada encontrado dentro da unidade
        if (equipamentos.length === 0 && novo.unidadeId) {
            equipamentos = await prisma.equipamento.findMany({
                where: montarWhere(false),
                include: { unidade: true },
                take: 10
            });
        }

        // 4) Refinamento extra:
        // se houver unidade resolvida, prioriza equipamentos dessa unidade
        if (equipamentos.length > 1 && novo.unidadeId) {
            const daMesmaUnidade = equipamentos.filter(e => e.unidadeId === novo.unidadeId);
            if (daMesmaUnidade.length > 0) {
                equipamentos = daMesmaUnidade;
            }
        }

        if (equipamentos.length === 1) {
            const eq = equipamentos[0];

            novo.equipamentoId = eq.id;
            novo.equipamentoNome = eq.modelo;
            novo.modelo = eq.modelo;
            novo.tipoEquipamento = eq.tipo || null;
            novo.tag = eq.tag;
            novo.fabricante = eq.fabricante || null;
            novo.setor = eq.setor || null;

            // Sincronia da unidade real do equipamento
            novo.unidadeId = eq.unidadeId;
            novo.unidadeNome = eq.unidade.nomeSistema;
        } else if (equipamentos.length > 1) {
            novo.ambiguidadeEquipamento = equipamentos.map(e => ({
                id: e.id,
                modelo: e.modelo,
                tipo: e.tipo,
                tag: e.tag,
                unidade: e.unidade.nomeSistema
            }));
        }
    }

    return novo;
}