// simec/backend-simec/services/agent/userAgentMemoryRepository.js
import prisma from '../prismaService.js';

export const UserAgentMemoryRepository = {
    async buscar(usuario) {
        return prisma.userAgentMemory.findUnique({
            where: { usuario }
        });
    },

    async upsertMemoria(usuario, payload) {
        return prisma.userAgentMemory.upsert({
            where: { usuario },
            create: {
                usuario,
                ...payload
            },
            update: {
                ...payload
            }
        });
    }
};