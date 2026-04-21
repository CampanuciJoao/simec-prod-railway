// Ficheiro: services/agent/agentSessionRepository.js
// Versão: Multi-tenant ready

import prisma from '../../prismaService.js';

const SESSION_TTL_MINUTES = 15;

function getExpiryDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + SESSION_TTL_MINUTES);
  return now;
}

export const AgentSessionRepository = {
  async buscarSessaoAtiva(tenantId, usuario, intent) {
    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    if (!intent) {
      throw new Error('INTENT_OBRIGATORIA');
    }

    const agora = new Date();

    const sessao = await prisma.agentSession.findFirst({
      where: {
        tenantId,
        usuario,
        intent,
        status: 'Ativa',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!sessao) return null;

    if (sessao.expiresAt <= agora) {
      await prisma.agentSession.update({
        where: { id: sessao.id },
        data: {
          status: 'Expirada',
          expiradaAt: agora,
        },
      });

      return null;
    }

    return sessao;
  },

  async criarSessao({ usuario, tenantId, intent, step = 'START', state = {} }) {
    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    if (!intent) {
      throw new Error('INTENT_OBRIGATORIA');
    }

    return prisma.agentSession.create({
      data: {
        tenantId,
        usuario,
        intent,
        status: 'Ativa',
        step,
        stateJson: JSON.stringify(state),
        expiresAt: getExpiryDate(),
      },
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
        expiresAt: getExpiryDate(),
      },
    });
  },

  async finalizarSessao(sessionId) {
    return prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'Finalizada',
        step: 'FINALIZADO',
        finalizadaAt: new Date(),
      },
    });
  },

  async cancelarSessao(sessionId) {
    return prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'Cancelada',
        step: 'CANCELADO',
        canceladaAt: new Date(),
      },
    });
  },

  async expirarSessoesAntigas(tenantId, usuario) {
    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    const agora = new Date();

    return prisma.agentSession.updateMany({
      where: {
        tenantId,
        usuario,
        status: 'Ativa',
        expiresAt: { lte: agora },
      },
      data: {
        status: 'Expirada',
        expiradaAt: agora,
      },
    });
  },

  async cancelarSessoesAtivasDoUsuario(tenantId, usuario) {
    if (!tenantId) {
      throw new Error('TENANT_ID_OBRIGATORIO');
    }

    if (!usuario) {
      throw new Error('USUARIO_OBRIGATORIO');
    }

    const agora = new Date();

    return prisma.agentSession.updateMany({
      where: {
        tenantId,
        usuario,
        status: 'Ativa',
      },
      data: {
        status: 'Cancelada',
        step: 'CANCELADO',
        canceladaAt: agora,
      },
    });
  },

  async registrarMensagem(sessionId, role, mensagem, metadata = null) {
    const sessao = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!sessao) {
      throw new Error('SESSAO_NAO_ENCONTRADA');
    }

    if (!sessao.tenantId) {
      throw new Error('TENANT_ID_DA_SESSAO_NAO_ENCONTRADO');
    }

    return prisma.agentMessage.create({
      data: {
        tenantId: sessao.tenantId,
        sessionId,
        role,
        mensagem,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
  },
};
