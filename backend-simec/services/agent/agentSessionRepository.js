// simec/backend-simec/services/agent/agentSessionRepository.js
import prisma from '../prismaService.js';

const SESSION_TTL_MINUTES = 15;

function getExpiryDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + SESSION_TTL_MINUTES);
    return now;
}

export const AgentSessionRepository = {
    async buscarSessaoAtiva(usuario, intent) {
        const agora = new Date();

        const sessao = await prisma.agentSession.findFirst({
            where: {
                usuario,
                intent,
                status: 'Ativa'
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!sessao) return null;

        if (sessao.expiresAt <= agora) {
            await prisma.agentSession.update({
                where: { id: sessao.id },
                data: {
                    status: 'Expirada',
                    expiradaAt: agora
                }
            });

            return null;
        }

        return sessao;
    },

    async criarSessao({ usuario, intent, step = 'START', state = {} }) {
        return prisma.agentSession.create({
            data: {
                usuario,
                intent,
                status: 'Ativa',
                step,
                stateJson: JSON.stringify(state),
                expiresAt: getExpiryDate()
            }
        });
    },

    async salvarSessao(sessionId, { step, state, resumo = null }) {
        return prisma.agentSession.update({
            where: { id: sessionId },
            data: {
                step,
                stateJson: JSON.stringify(state),
                resumo,
                lastInteractionAt: new Date(),
                expiresAt: getExpiryDate()
            }
        });
    },

    async finalizarSessao(sessionId) {
        return prisma.agentSession.update({
            where: { id: sessionId },
            data: {
                status: 'Finalizada',
                step: 'FINALIZADO',
                finalizadaAt: new Date()
            }
        });
    },

    async cancelarSessao(sessionId) {
        return prisma.agentSession.update({
            where: { id: sessionId },
            data: {
                status: 'Cancelada',
                step: 'CANCELADO',
                canceladaAt: new Date()
            }
        });
    },

    async expirarSessoesAntigas(usuario) {
        return prisma.agentSession.updateMany({
            where: {
                usuario,
                status: 'Ativa',
                expiresAt: { lte: new Date() }
            },
            data: {
                status: 'Expirada',
                expiradaAt: new Date()
            }
        });
    },

    async registrarMensagem(sessionId, role, mensagem, metadata = null) {
        return prisma.agentMessage.create({
            data: {
                sessionId,
                role,
                mensagem,
                metadataJson: metadata ? JSON.stringify(metadata) : null
            }
        });
    }
};