// services/agent/entityResolver.js
import prisma from '../prismaService.js';

function normalizarTexto(texto = '') {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

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
        sinonimos.add('tomografia computadorizada');
    }

    if (/\b(rx|raio x|raio-x|radiografia)\b/.test(t)) {
        sinonimos.add('raio x');
        sinonimos.add('raio-x');
        sinonimos.add('radiografia');
        sinonimos.add('rx');
    }

    if (/\b(us|uss|ultrassom|ultrasonografia|ultra)\b/.test(t)) {
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

    if (/\b(mamografia|mamografo|mammo)\b/.test(t)) {
        sinonimos.add('mamografia');
        sinonimos.add('mamografo');
        sinonimos.add('mammo');
    }

    if (/\b(act revolution)\b/.test(t)) {
        sinonimos.add('act revolution');
        sinonimos.add('tomografia');
        sinonimos.add('tomografia computadorizada');
    }

    if (/\b(aquilion ct)\b/.test(t)) {
        sinonimos.add('aquilion ct');
        sinonimos.add('ct');
        sinonimos.add('tomografia');
        sinonimos.add('tomografia computadorizada');
    }

    return Array.from(sinonimos);
}

export async function resolverEntidades(estado) {
    const novo = { ...estado };

    delete novo.ambiguidadeEquipamento;

    if (novo.unidadeTexto && !novo.unidadeId) {
        const unidadeTextoNormalizado = normalizarTexto(novo.unidadeTexto);

        const unidade = await prisma.unidade.findFirst({
            where: {
                OR: [
                    {
                        nomeSistema: {
                            contains: unidadeTextoNormalizado,
                            mode: 'insensitive'
                        }
                    },
                    {
                        nomeFantasia: {
                            contains: unidadeTextoNormalizado,
                            mode: 'insensitive'
                        }
                    },
                    {
                        cidade: {
                            contains: unidadeTextoNormalizado,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        });

        if (unidade) {
            novo.unidadeId = unidade.id;
            novo.unidadeNome = unidade.nomeSistema;
        }
    }

    if (novo.equipamentoTexto && !novo.equipamentoId) {
        const sinonimos = expandirSinonimosEquipamento(novo.equipamentoTexto);

        const whereBase = {
            OR: sinonimos.flatMap((s) => [
                { modelo: { contains: s, mode: 'insensitive' } },
                { tipo: { contains: s, mode: 'insensitive' } },
                { fabricante: { contains: s, mode: 'insensitive' } }
            ])
        };

        const where = novo.unidadeId
            ? {
                  ...whereBase,
                  unidadeId: novo.unidadeId
              }
            : whereBase;

        const equipamentos = await prisma.equipamento.findMany({
            where,
            take: 10
        });

        if (equipamentos.length === 1) {
            novo.equipamentoId = equipamentos[0].id;
            novo.equipamentoNome = equipamentos[0].modelo;
            novo.modelo = equipamentos[0].modelo;
            novo.tag = equipamentos[0].tag || null;
            novo.tipoEquipamento = equipamentos[0].tipo || null;
        } else if (equipamentos.length > 1) {
            novo.ambiguidadeEquipamento = equipamentos.map((e) => ({
                id: e.id,
                modelo: e.modelo,
                tag: e.tag,
                tipoEquipamento: e.tipo || null,
                unidade: novo.unidadeNome || null
            }));
        }
    }

    return novo;
}