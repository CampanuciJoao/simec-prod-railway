// simec/backend-simec/services/agent/entityResolver.js
import prisma from '../prismaService.js';

/**
 * Resolve os nomes de texto da IA para registros Reais no Banco de Dados.
 * Implementa Busca em Cascata: Unidade -> Equipamento (Local) -> Equipamento (Global).
 */
export async function resolverEntidades(estado) {
    const novo = { ...estado };

    // Limpeza de segurança: remove ambiguidades de rodadas anteriores
    delete novo.ambiguidadeEquipamento;

    // 1. ETAPA: RESOLVER UNIDADE (ONDE)
    // Busca a unidade pelo apelido (nomeSistema) ou nome fantasia
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

    // 2. ETAPA: RESOLVER EQUIPAMENTO (O QUÊ)
    if (novo.equipamentoTexto && !novo.equipamentoId) {
        const termoBusca = novo.equipamentoTexto.trim();

        // --- BUSCA NÍVEL 1: Dentro da Unidade já resolvida (Alta Precisão) ---
        let equipamentos = await prisma.equipamento.findMany({
            where: {
                unidadeId: novo.unidadeId || undefined, // Filtra se tiver a unidadeId
                OR: [
                    { modelo: { contains: termoBusca, mode: 'insensitive' } },
                    { tag: { contains: termoBusca, mode: 'insensitive' } },
                    { tipo: { contains: termoBusca, mode: 'insensitive' } }
                ]
            },
            include: { unidade: true },
            take: 10
        });

        // --- BUSCA NÍVEL 2: Cascata Global (Se não achou nada no hospital informado) ---
        if (equipamentos.length === 0 && novo.unidadeId) {
            console.log(`[RESOLVER] Não achou em ${novo.unidadeNome}. Tentando busca global para: ${termoBusca}`);
            equipamentos = await prisma.equipamento.findMany({
                where: {
                    OR: [
                        { modelo: { contains: termoBusca, mode: 'insensitive' } },
                        { tag: { contains: termoBusca, mode: 'insensitive' } },
                        { tipo: { contains: termoBusca, mode: 'insensitive' } }
                    ]
                },
                include: { unidade: true },
                take: 10
            });
        }

        // --- TRATAMENTO DOS RESULTADOS ---

        // Caso A: Encontrou EXATAMENTE UM (Caminho Feliz)
        if (equipamentos.length === 1) {
            const eq = equipamentos[0];
            novo.equipamentoId = eq.id;
            novo.equipamentoNome = eq.modelo;
            novo.tag = eq.tag;
            
            // Sincronização Reversa: Garante que a unidade do estado seja a do equipamento real
            novo.unidadeId = eq.unidadeId;
            novo.unidadeNome = eq.unidade.nomeSistema;
        } 
        
        // Caso B: Encontrou Múltiplos (Ambiguidade)
        else if (equipamentos.length > 1) {
            novo.ambiguidadeEquipamento = equipamentos.map(e => ({ 
                id: e.id, 
                nome: e.modelo, 
                tag: e.tag,
                unidade: e.unidade.nomeSistema 
            }));
        }
    }

    return novo;
}