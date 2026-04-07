// simec/backend-simec/services/agent/entityResolver.js
import prisma from '../prismaService.js';

/**
 * Resolve os nomes de texto da IA para IDs reais do banco de dados.
 * Transforma termos vagos como "Tomógrafo" em IDs únicos e seguros.
 */
export async function resolverEntidades(estado) {
    const novo = { ...estado };

    // Limpeza Crítica: Remove ambiguidades de rodadas anteriores para garantir
    // que o sistema sempre trabalhe com dados frescos desta interação.
    delete novo.ambiguidadeEquipamento;

    // 1. RESOLVER UNIDADE (Hospital)
    // Se o usuário forneceu um nome mas ainda não temos o ID validado no banco.
    if (novo.unidadeTexto && !novo.unidadeId) {
        const unidade = await prisma.unidade.findFirst({
            where: {
                OR: [
                    { nomeSistema: { contains: novo.unidadeTexto, mode: 'insensitive' } },
                    { nomeFantasia: { contains: novo.unidadeTexto, mode: 'insensitive' } }
                ]
            }
        });

        if (unidade) {
            novo.unidadeId = unidade.id;
            novo.unidadeNome = unidade.nomeSistema;
        }
    }

    // 2. RESOLVER EQUIPAMENTO (Ativo)
    // Se temos um termo de busca e ainda não temos o ID único do equipamento.
    if (novo.equipamentoTexto && !novo.equipamentoId) {
        const equipamentos = await prisma.equipamento.findMany({
            where: {
                // Filtro Inteligente: Se já resolvemos a unidade acima, buscamos apenas 
                // equipamentos que pertencem a esse hospital. Isso evita erros de homônimos.
                unidadeId: novo.unidadeId || undefined, 
                OR: [
                    { modelo: { contains: novo.equipamentoTexto, mode: 'insensitive' } },
                    { tag: { contains: novo.equipamentoTexto, mode: 'insensitive' } }
                ]
            },
            include: { unidade: true },
            take: 5 // Limite de performance: não precisamos de mais do que 5 resultados para decidir.
        });

        // Caso A: Encontramos exatamente UM equipamento (Caminho Feliz)
        if (equipamentos.length === 1) {
            const eq = equipamentos[0];
            novo.equipamentoId = eq.id;
            novo.equipamentoNome = eq.modelo;
            novo.tag = eq.tag;
            
            // Sincronização Reversa Sênior: Se o usuário não disse a unidade, 
            // mas achamos o equipamento, o sistema já preenche a unidade correta dele.
            novo.unidadeId = eq.unidadeId;
            novo.unidadeNome = eq.unidade.nomeSistema;
        } 
        // Caso B: Encontramos mais de um item (Ambiguidade)
        else if (equipamentos.length > 1) {
            novo.ambiguidadeEquipamento = equipamentos.map(e => ({ 
                id: e.id, 
                nome: e.modelo, 
                tag: e.tag 
            }));
        }
    }

    return novo;
}