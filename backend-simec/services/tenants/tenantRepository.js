import prisma from '../prismaService.js';

export function listarTenants() {
  return prisma.tenant.findMany({
    select: {
      id: true,
      nome: true,
      slug: true,
      timezone: true,
      locale: true,
      ativo: true,
      contatoNome: true,
      contatoEmail: true,
      contatoTelefone: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          usuarios: true,
          unidades: true,
          equipamentos: true,
          alertas: true,
        },
      },
    },
    orderBy: {
      nome: 'asc',
    },
  });
}

export function buscarTenantPorId(id) {
  return prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      slug: true,
      timezone: true,
      locale: true,
      ativo: true,
      contatoNome: true,
      contatoEmail: true,
      contatoTelefone: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          usuarios: true,
          unidades: true,
          equipamentos: true,
          alertas: true,
          historicoAtivoEventos: true,
        },
      },
    },
  });
}

export function buscarTenantPorSlug(slug) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

export function criarTenantComAdmin(data) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: data.tenantData,
    });

    const admin = await tx.usuario.create({
      data: {
        tenantId: tenant.id,
        ...data.adminData,
      },
    });

    return { tenant, admin };
  });
}

export function atualizarTenant(id, data) {
  return prisma.tenant.update({
    where: { id },
    data,
  });
}

export function buscarUsuarioAdminDoTenant(tenantId) {
  return prisma.usuario.findFirst({
    where: {
      tenantId,
      role: {
        in: ['admin', 'superadmin'],
      },
    },
    select: {
      id: true,
      nome: true,
      username: true,
      email: true,
      role: true,
    },
  });
}

export function criarAdminDoTenant({ tenantId, data }) {
  return prisma.usuario.create({
    data: {
      tenantId,
      ...data,
    },
  });
}

export function buscarTenantSettings(tenantId) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      nome: true,
      slug: true,
      timezone: true,
      locale: true,
      ativo: true,
      contatoNome: true,
      contatoEmail: true,
      contatoTelefone: true,
      updatedAt: true,
    },
  });
}
