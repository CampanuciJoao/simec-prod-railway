// Service que abre/fecha sessões de impersonação para superadmins do
// Tenant System. Toda escrita registra LogAdmin pra trilha auditável.
//
// Regras:
//   - Só superadmin do Tenant System pode impersonar.
//   - Só tenant ativo e do tipo CUSTOMER pode ser alvo.
//   - Limite de 1 sessão ativa simultânea por superadmin (a anterior é
//     encerrada como 'revogada' antes de abrir a nova).
//   - Motivo obrigatório, mínimo 10 caracteres (auditoria útil).

import prisma from '../prismaService.js';
import { signImpersonationToken, signCleanToken } from './authService.js';

const MOTIVO_MIN_LENGTH = 10;

async function registrarLogAdmin({ autorId, acao, alvoTipo, alvoId, motivo, contexto }) {
  await prisma.logAdmin.create({
    data: {
      autorId,
      acao,
      alvoTipo,
      alvoId: alvoId ?? null,
      motivo: motivo ?? null,
      contexto: contexto ?? null,
    },
  });
}

export async function iniciarImpersonacao({ superadmin, tenantAlvoId, motivo }) {
  if (!superadmin || superadmin.role !== 'superadmin' || superadmin.tenant?.kind !== 'SYSTEM') {
    return { ok: false, status: 403, message: 'Apenas superadmin do Tenant System.' };
  }
  if (!tenantAlvoId) {
    return { ok: false, status: 400, message: 'tenantAlvoId é obrigatório.' };
  }
  if (!motivo || motivo.trim().length < MOTIVO_MIN_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `Motivo é obrigatório (mínimo ${MOTIVO_MIN_LENGTH} caracteres).`,
    };
  }

  const tenantAlvo = await prisma.tenant.findUnique({
    where: { id: tenantAlvoId },
    select: { id: true, nome: true, slug: true, kind: true, ativo: true },
  });
  if (!tenantAlvo) {
    return { ok: false, status: 404, message: 'Tenant alvo não encontrado.' };
  }
  if (tenantAlvo.kind !== 'CUSTOMER') {
    return { ok: false, status: 400, message: 'Só é possível impersonar tenants CUSTOMER.' };
  }
  if (!tenantAlvo.ativo) {
    return { ok: false, status: 400, message: 'Tenant alvo está inativo.' };
  }

  // Limite de 1 sessão ativa por superadmin — encerra qualquer anterior
  // como 'revogada' antes de abrir a nova.
  await prisma.impersonacao.updateMany({
    where: { superadminId: superadmin.id, status: 'ativa' },
    data: { status: 'revogada', encerradaEm: new Date() },
  });

  const registro = await prisma.impersonacao.create({
    data: {
      superadminId: superadmin.id,
      actedAsTenantId: tenantAlvoId,
      motivo: motivo.trim(),
      status: 'ativa',
    },
  });

  const token = signImpersonationToken({
    usuario: { id: superadmin.id, nome: superadmin.nome, role: superadmin.role, tenantId: superadmin.tenantId },
    impersonacaoId: registro.id,
    actAsTenantId: tenantAlvoId,
  });

  await registrarLogAdmin({
    autorId: superadmin.id,
    acao: 'impersonacao_iniciada',
    alvoTipo: 'tenant',
    alvoId: tenantAlvoId,
    motivo: motivo.trim(),
    contexto: { tenantAlvoSlug: tenantAlvo.slug, impersonacaoId: registro.id },
  });

  return {
    ok: true,
    status: 200,
    data: {
      token,
      impersonacao: {
        id: registro.id,
        actAsTenantId: registro.actedAsTenantId,
        tenant: tenantAlvo,
        motivo: registro.motivo,
        iniciadaEm: registro.iniciadaEm,
      },
    },
  };
}

export async function encerrarImpersonacao({ superadmin, impersonacaoId }) {
  if (!superadmin) {
    return { ok: false, status: 401, message: 'Não autorizado.' };
  }

  const registro = impersonacaoId
    ? await prisma.impersonacao.findUnique({ where: { id: impersonacaoId } })
    : await prisma.impersonacao.findFirst({
        where: { superadminId: superadmin.id, status: 'ativa' },
        orderBy: { iniciadaEm: 'desc' },
      });

  if (!registro) {
    return { ok: false, status: 404, message: 'Nenhuma sessão de impersonação ativa.' };
  }
  if (registro.superadminId !== superadmin.id) {
    return { ok: false, status: 403, message: 'Sessão pertence a outro superadmin.' };
  }
  if (registro.status !== 'ativa') {
    return { ok: false, status: 410, message: 'Sessão já encerrada.' };
  }

  await prisma.impersonacao.update({
    where: { id: registro.id },
    data: { status: 'encerrada_usuario', encerradaEm: new Date() },
  });

  await registrarLogAdmin({
    autorId: superadmin.id,
    acao: 'impersonacao_encerrada',
    alvoTipo: 'tenant',
    alvoId: registro.actedAsTenantId,
    motivo: null,
    contexto: { impersonacaoId: registro.id, duracaoMs: Date.now() - new Date(registro.iniciadaEm).getTime() },
  });

  const token = signCleanToken({
    usuario: { id: superadmin.id, nome: superadmin.nome, role: superadmin.role, tenantId: superadmin.tenantId },
  });

  return {
    ok: true,
    status: 200,
    data: { token, encerrada: true },
  };
}
