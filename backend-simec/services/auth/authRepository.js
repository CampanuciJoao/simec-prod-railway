import prisma from '../prismaService.js';

export function buscarUsuariosPorUsername(username) {
  return prisma.usuario.findMany({
    where: {
      username,
    },
    include: {
      tenant: {
        select: {
          id: true,
          nome: true,
          slug: true,
          timezone: true,
          locale: true,
          ativo: true,
        },
      },
    },
    take: 2,
  });
}
