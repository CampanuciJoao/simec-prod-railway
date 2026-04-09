// simec/backend-simec/services/agent/dbManager.js
import prisma from '../prismaService.js';

function normalizarTipoManutencao(tipoManutencao) {
    const tipo = (tipoManutencao || '').toString().trim().toLowerCase();

    if (tipo === 'preventiva') return 'Preventiva';
    if (tipo === 'corretiva') return 'Corretiva';
    if (tipo === 'calibracao' || tipo === 'calibração') return 'Calibracao';
    if (tipo === 'inspecao' || tipo === 'inspeção') return 'Inspecao';

    return null;
}

export async function criarManutencaoNoBanco(estado) {
    if (!estado.equipamentoId) {
        throw new Error('Falha na persistência: ID do equipamento não resolvido.');
    }

    const tipoManutencao = normalizarTipoManutencao(estado.tipoManutencao);

    if (!tipoManutencao) {
        throw new Error(
            `Falha na persistência: tipo de manutenção inválido (${estado.tipoManutencao || 'não informado'}).`
        );
    }

    const total = await prisma.manutencao.count();
    const osSequence = String(total + 1).padStart(4, '0');

    const tagPrefix = (estado.tag || 'MAN').substring(0, 3).toUpperCase();
    const typeInitial = tipoManutencao.charAt(0).toUpperCase();
    const numeroOS = `${typeInitial}${tagPrefix}-${osSequence}`;

    const descricaoFinal =
        tipoManutencao === 'Corretiva'
            ? (estado.descricao || 'Manutenção Corretiva')
            : (estado.descricao || 'Manutenção Preventiva Programada');

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const novaManutencao = await tx.manutencao.create({
                data: {
                    numeroOS,
                    tipo: tipoManutencao,
                    descricaoProblemaServico: descricaoFinal,
                    tecnicoResponsavel: estado.tecnicoResponsavel || 'Agente Guardião',
                    dataHoraAgendamentoInicio: new Date(`${estado.data}T${estado.horaInicio}:00`),
                    dataHoraAgendamentoFim: estado.horaFim
                        ? new Date(`${estado.data}T${estado.horaFim}:00`)
                        : null,
                    numeroChamado: tipoManutencao === 'Corretiva' ? (estado.numeroChamado || null) : null,
                    equipamentoId: estado.equipamentoId,
                    status: 'Agendada'
                }
            });

            await tx.equipamento.update({
                where: { id: estado.equipamentoId },
                data: { status: 'EmManutencao' }
            });

            return novaManutencao;
        });

        console.log(`[DB_MANAGER] Sucesso: OS ${numeroOS} criada e ativo atualizado.`);
        return resultado;
    } catch (error) {
        console.error('[DB_MANAGER_TRANSACTION_ERROR]:', error);
        throw new Error('Erro ao processar gravação no banco de dados.');
    }
}