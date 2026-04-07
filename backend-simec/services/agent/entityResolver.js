// simec/backend-simec/services/agent/entityResolver.js
import prisma from '../prismaService.js';

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
        const unidade = await prisma.unidade.findFirst({
            where: {
                OR: [
                    { nomeSistema: { contains: novo.unidadeTexto, mode: 'insensitive' } },
                    { nomeFantasia: { contains: novo.unidadeTexto, mode: 'insensitive' } },
                    { cidade: { contains: novo.unidadeTexto, mode: 'insensitive' } }
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
        const termoBusca = novo.equipamentoTexto.trim();

        const montarWhere = (comUnidade = true) => ({
            ...(comUnidade && novo.unidadeId ? { unidadeId: novo.unidadeId } : {}),
            OR: [
                { modelo: { contains: termoBusca, mode: 'insensitive' } },
                { tipo: { contains: termoBusca, mode: 'insensitive' } },
                { tag: { contains: termoBusca, mode: 'insensitive' } },
                { fabricante: { contains: termoBusca, mode: 'insensitive' } },
                { setor: { contains: termoBusca, mode: 'insensitive' } }
            ]
        });

        let equipamentos = await prisma.equipamento.findMany({
            where: montarWhere(true),
            include: { unidade: true },
            take: 10
        });

        // busca global se nada encontrado dentro da unidade
        if (equipamentos.length === 0 && novo.unidadeId) {
            equipamentos = await prisma.equipamento.findMany({
                where: montarWhere(false),
                include: { unidade: true },
                take: 10
            });
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

            // sincronia da unidade real do equipamento
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