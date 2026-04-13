// Ficheiro: services/agent/userAgentMemoryRepository.js
// Versão: Multi-tenant ready

import prisma from '../../prismaService.js';

export const UserAgentMemoryRepository = {
  async buscar(tenantId, usuario) {
    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    return prisma.userAgentMemory.findUnique({
      where: {
        tenantId_usuario: {
          tenantId,
          usuario,
        },
      },
    });
  },

  async upsertMemoria(usuario, payload = {}) {
    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    const { tenantId, ...dados } = payload;

    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    return prisma.userAgentMemory.upsert({
      where: {
        tenantId_usuario: {
          tenantId,
          usuario,
        },
      },
      create: {
        tenantId,
        usuario,
        ...dados,
      },
      update: {
        ...dados,
      },
    });
  },
};