// Ficheiro: backend-simec/services/uploads/anexoRepository.js

import prisma from '../prismaService.js';

export async function createManyAnexos(data = []) {
  if (!Array.isArray(data) || data.length === 0) {
    return { count: 0 };
  }

  return prisma.anexo.createMany({
    data,
  });
}

export async function listAnexosByOwner({
  tenantId,
  relationField,
  entityId,
}) {
  return prisma.anexo.findMany({
    where: {
      tenantId,
      [relationField]: entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function findAnexoById({ tenantId, anexoId }) {
  return prisma.anexo.findFirst({
    where: {
      id: anexoId,
      tenantId,
    },
  });
}

export async function deleteAnexoById({ tenantId, anexoId }) {
  return prisma.anexo.deleteMany({
    where: {
      id: anexoId,
      tenantId,
    },
  });
}

export async function deleteManyAnexosByOwner({
  tenantId,
  relationField,
  entityId,
}) {
  return prisma.anexo.deleteMany({
    where: {
      tenantId,
      [relationField]: entityId,
    },
  });
}