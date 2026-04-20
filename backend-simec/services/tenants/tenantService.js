import bcrypt from 'bcryptjs';

import {
  atualizarTenant,
  buscarTenantPorId,
  buscarTenantPorSlug,
  buscarTenantSettings,
  buscarUsuarioAdminDoTenant,
  criarAdminDoTenant,
  criarTenantComAdmin,
  listarTenants,
} from './tenantRepository.js';
import { registrarLog } from '../logService.js';

function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeTenantPayload(payload = {}) {
  return {
    nome: String(payload.nome || '').trim(),
    slug: normalizeSlug(payload.slug),
    timezone: String(payload.timezone || 'America/Cuiaba').trim(),
    locale: String(payload.locale || 'pt-BR').trim(),
    contatoNome: payload.contatoNome ? String(payload.contatoNome).trim() : null,
    contatoEmail: payload.contatoEmail
      ? String(payload.contatoEmail).toLowerCase().trim()
      : null,
    contatoTelefone: payload.contatoTelefone
      ? String(payload.contatoTelefone).trim()
      : null,
  };
}

function sanitizeAdminPayload(payload = {}) {
  return {
    nome: String(payload.nome || '').trim(),
    username: String(payload.username || '').toLowerCase().trim(),
    email: String(payload.email || '').toLowerCase().trim(),
    role: 'admin',
  };
}

function mapTenantListItem(item) {
  return {
    ...item,
    metricas: {
      usuarios: item._count.usuarios,
      unidades: item._count.unidades,
      equipamentos: item._count.equipamentos,
      alertas: item._count.alertas,
    },
  };
}

export async function listarTenantsService() {
  const tenants = await listarTenants();
  return tenants.map(mapTenantListItem);
}

export async function detalharTenantService(id) {
  const tenant = await buscarTenantPorId(id);
  if (!tenant) {
    return {
      ok: false,
      status: 404,
      message: 'Tenant nao encontrado.',
    };
  }

  return {
    ok: true,
    status: 200,
    data: {
      ...tenant,
      metricas: {
        usuarios: tenant._count.usuarios,
        unidades: tenant._count.unidades,
        equipamentos: tenant._count.equipamentos,
        alertas: tenant._count.alertas,
        historicoEventos: tenant._count.historicoAtivoEventos,
      },
    },
  };
}

export async function criarTenantService({ payload, autor }) {
  const tenantData = sanitizeTenantPayload(payload);
  const adminInput = sanitizeAdminPayload(payload.admin || {});
  const senha = String(payload.admin?.senha || '');

  if (
    !tenantData.nome ||
    !tenantData.slug ||
    !adminInput.nome ||
    !adminInput.username ||
    !adminInput.email ||
    !senha
  ) {
    return {
      ok: false,
      status: 400,
      message: 'Tenant e administrador inicial precisam estar completos.',
    };
  }

  if (senha.length < 6) {
    return {
      ok: false,
      status: 400,
      message: 'A senha do administrador inicial deve ter no minimo 6 caracteres.',
    };
  }

  const existente = await buscarTenantPorSlug(tenantData.slug);
  if (existente) {
    return {
      ok: false,
      status: 409,
      message: 'Ja existe um tenant com este slug.',
    };
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const { tenant } = await criarTenantComAdmin({
    tenantData,
    adminData: {
      ...adminInput,
      senha: senhaHash,
    },
  });

  await registrarLog({
    tenantId: autor.tenantId,
    usuarioId: autor.id,
    acao: 'CRIACAO',
    entidade: 'Tenant',
    entidadeId: tenant.id,
    detalhes: `Tenant "${tenant.nome}" criado no backoffice global.`,
  });

  return {
    ok: true,
    status: 201,
    data: await buscarTenantPorId(tenant.id),
  };
}

export async function atualizarTenantService({ id, payload, autor }) {
  const tenantData = sanitizeTenantPayload(payload);
  const atual = await buscarTenantPorId(id);

  if (!atual) {
    return {
      ok: false,
      status: 404,
      message: 'Tenant nao encontrado.',
    };
  }

  if (!tenantData.nome) {
    return {
      ok: false,
      status: 400,
      message: 'Nome do tenant e obrigatorio.',
    };
  }

  const dataUpdate = {
    nome: tenantData.nome,
    timezone: tenantData.timezone,
    locale: tenantData.locale,
    contatoNome: tenantData.contatoNome,
    contatoEmail: tenantData.contatoEmail,
    contatoTelefone: tenantData.contatoTelefone,
  };

  const atualizado = await atualizarTenant(id, dataUpdate);

  await registrarLog({
    tenantId: autor.tenantId,
    usuarioId: autor.id,
    acao: 'EDICAO',
    entidade: 'Tenant',
    entidadeId: id,
    detalhes: `Tenant "${atualizado.nome}" atualizado no backoffice global.`,
  });

  return {
    ok: true,
    status: 200,
    data: atualizado,
  };
}

export async function alterarStatusTenantService({ id, ativo, autor }) {
  const atual = await buscarTenantPorId(id);

  if (!atual) {
    return {
      ok: false,
      status: 404,
      message: 'Tenant nao encontrado.',
    };
  }

  const atualizado = await atualizarTenant(id, { ativo: !!ativo });

  await registrarLog({
    tenantId: autor.tenantId,
    usuarioId: autor.id,
    acao: 'STATUS',
    entidade: 'Tenant',
    entidadeId: id,
    detalhes: `Tenant "${atualizado.nome}" ${ativo ? 'ativado' : 'inativado'}.`,
  });

  return {
    ok: true,
    status: 200,
    data: atualizado,
  };
}

export async function bootstrapAdminTenantService({ id, payload, autor }) {
  const atual = await buscarTenantPorId(id);

  if (!atual) {
    return {
      ok: false,
      status: 404,
      message: 'Tenant nao encontrado.',
    };
  }

  const adminExistente = await buscarUsuarioAdminDoTenant(id);
  if (adminExistente) {
    return {
      ok: false,
      status: 409,
      message: 'Este tenant ja possui um administrador principal.',
    };
  }

  const adminInput = sanitizeAdminPayload(payload);
  const senha = String(payload?.senha || '');

  if (!adminInput.nome || !adminInput.username || !adminInput.email || !senha) {
    return {
      ok: false,
      status: 400,
      message: 'Os dados do administrador estao incompletos.',
    };
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await criarAdminDoTenant({
    tenantId: id,
    data: {
      ...adminInput,
      senha: senhaHash,
    },
  });

  await registrarLog({
    tenantId: autor.tenantId,
    usuarioId: autor.id,
    acao: 'CRIACAO',
    entidade: 'TenantAdmin',
    entidadeId: usuario.id,
    detalhes: `Administrador inicial criado para o tenant "${atual.nome}".`,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: usuario.id,
      nome: usuario.nome,
      username: usuario.username,
      email: usuario.email,
      role: usuario.role,
    },
  };
}

export async function obterTenantSettingsService(tenantId) {
  const settings = await buscarTenantSettings(tenantId);

  if (!settings) {
    return {
      ok: false,
      status: 404,
      message: 'Configuracoes do tenant nao encontradas.',
    };
  }

  return {
    ok: true,
    status: 200,
    data: settings,
  };
}

export async function atualizarTenantSettingsService({
  tenantId,
  payload,
  autor,
}) {
  const tenantData = sanitizeTenantPayload(payload);

  if (!tenantData.nome) {
    return {
      ok: false,
      status: 400,
      message: 'Nome da empresa e obrigatorio.',
    };
  }

  const atualizado = await atualizarTenant(tenantId, {
    nome: tenantData.nome,
    timezone: tenantData.timezone,
    locale: tenantData.locale,
    contatoNome: tenantData.contatoNome,
    contatoEmail: tenantData.contatoEmail,
    contatoTelefone: tenantData.contatoTelefone,
  });

  await registrarLog({
    tenantId,
    usuarioId: autor.id,
    acao: 'EDICAO',
    entidade: 'TenantSettings',
    entidadeId: tenantId,
    detalhes: 'Configuracoes da empresa atualizadas.',
  });

  return {
    ok: true,
    status: 200,
    data: atualizado,
  };
}
