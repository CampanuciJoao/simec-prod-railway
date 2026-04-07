// simec/backend-simec/services/agent/dbManager.js
import prisma from '../prismaService.js';

/**
 * Persiste a nova manutenção no banco de dados e atualiza o status do ativo.
 * Utiliza transação atômica para garantir a integridade dos dados.
 */
export async function criarManutencaoNoBanco(estado) {
    // 1. Validação de segurança (Defensive Programming)
    if (!estado.equipamentoId) {
        throw new Error("Falha na persistência: ID do equipamento não resolvido.");
    }

    // 2. Geração do Número da OS
    // Buscamos o total para gerar a sequência (ex: 0005)
    const total = await prisma.manutencao.count();
    const osSequence = String(total + 1).padStart(4, '0');
    
    // Extraímos o prefixo da TAG (ex: "RAI") ou usamos "MAN" como fallback
    const tagPrefix = (estado.tag || 'MAN').substring(0, 3).toUpperCase();
    
    // Formato final: [P/C][TAG]-[SEQ] -> ex: CRAI-0005 (Corretiva Raio-X 0005)
    const typeInitial = estado.tipo.charAt(0).toUpperCase();
    const numeroOS = `${typeInitial}${tagPrefix}-${osSequence}`;

    // 3. Preparação de Regras de Negócio
    const descricaoFinal = estado.tipo === 'Corretiva' 
        ? estado.descricao 
        : (estado.descricao || 'Manutenção Preventiva Programada');

    // 4. Execução via PRISMA TRANSACTION
    // Isso garante que se uma operação falhar, a outra sofra ROLLBACK automático.
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            
            // A. Cria o registro da Manutenção
            const novaManutencao = await tx.manutencao.create({
                data: {
                    numeroOS,
                    tipo: estado.tipo, // Deve bater com o Enum do Prisma
                    descricaoProblemaServico: descricaoFinal,
                    tecnicoResponsavel: estado.tecnicoResponsavel || "Agente Guardião",
                    dataHoraAgendamentoInicio: new Date(`${estado.data}T${estado.horaInicio}:00`),
                    dataHoraAgendamentoFim: estado.horaFim ? new Date(`${estado.data}T${estado.horaFim}:00`) : null,
                    numeroChamado: estado.tipo === 'Corretiva' ? estado.numeroChamado : null,
                    equipamentoId: estado.equipamentoId,
                    status: 'Agendada'
                }
            });

            // B. Atualiza o Status do Equipamento para "Em Manutenção"
            await tx.equipamento.update({
                where: { id: estado.equipamentoId },
                data: { status: 'EmManutencao' }
            });

            return novaManutencao;
        });

        console.log(`[DB_MANAGER] Sucesso: OS ${numeroOS} criada e ativo atualizado.`);
        return resultado;

    } catch (error) {
        // Log detalhado para o desenvolvedor no Railway
        console.error("[DB_MANAGER_TRANSACTION_ERROR]:", error);
        
        // Lançamos um erro limpo para o Service tratar e avisar o usuário
        throw new Error("Erro ao processar gravação no banco de dados.");
    }
}