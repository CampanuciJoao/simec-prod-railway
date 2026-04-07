// services/agent/chatRepository.js
import prisma from '../prismaService.js';

export const ChatRepository = {
    async buscarEstado(usuario) {
        const chat = await prisma.chatHistorico.findFirst({
            where: { usuario },
            orderBy: { createdAt: 'desc' }
        });
        return chat ? JSON.parse(chat.mensagem) : {};
    },

    async salvarEstado(usuario, estado) {
        // Limpa o estado anterior para não sobrecarregar o histórico com lixo
        await prisma.chatHistorico.deleteMany({ where: { usuario } });
        return await prisma.chatHistorico.create({
            data: { usuario, role: 'model', mensagem: JSON.stringify(estado) }
        });
    },

    async limparEstado(usuario) {
        return await prisma.chatHistorico.deleteMany({ where: { usuario } });
    }
};