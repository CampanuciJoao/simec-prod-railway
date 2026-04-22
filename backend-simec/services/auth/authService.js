import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import {
  atualizarSenhaUsuario,
  buscarPasswordResetTokenPorHash,
  buscarSessaoPorRefreshHash,
  buscarTenantPorSlug,
  buscarUsuarioPorEmailOuUsername,
  buscarUsuariosPorUsername,
  criarPasswordResetToken,
  criarSessaoAutenticacao,
  invalidarTokensResetDoUsuario,
  marcarPasswordResetTokenComoUsado,
  revogarSessaoPorId,
  revogarSessoesDoUsuario,
} from './authRepository.js';
import { registrarLog } from '../logService.js';
import { enviarEmail } from '../emailService.js';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_COOKIE = 'simec_refresh_token';
const RESET_TOKEN_TTL_MINUTES = 30;
const REFRESH_TOKEN_TTL_DAYS = 14;

const defaultAuthServiceDeps = {
  atualizarSenhaUsuario,
  buscarPasswordResetTokenPorHash,
  buscarSessaoPorRefreshHash,
  buscarTenantPorSlug,
  buscarUsuarioPorEmailOuUsername,
  buscarUsuariosPorUsername,
  criarPasswordResetToken,
  criarSessaoAutenticacao,
  invalidarTokensResetDoUsuario,
  marcarPasswordResetTokenComoUsado,
  revogarSessaoPorId,
  revogarSessoesDoUsuario,
  registrarLog,
  enviarEmail,
};

let authServiceDeps = { ...defaultAuthServiceDeps };

export function __setAuthServiceDepsForTests(overrides = {}) {
  authServiceDeps = {
    ...defaultAuthServiceDeps,
    ...overrides,
  };
}

export function __resetAuthServiceDepsForTests() {
  authServiceDeps = { ...defaultAuthServiceDeps };
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET nao configurado.');
  }

  return process.env.JWT_SECRET;
}

function hashPlainToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildAuthPayload(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    role: usuario.role,
    tenantId: usuario.tenantId,
  };
}

function buildAuthResponse(usuario, accessToken) {
  return {
    token: accessToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      username: usuario.username,
      email: usuario.email,
      role: usuario.role,
      tenantId: usuario.tenantId,
    },
    tenant: {
      id: usuario.tenant.id,
      nome: usuario.tenant.nome,
      slug: usuario.tenant.slug,
      timezone: usuario.tenant.timezone,
      locale: usuario.tenant.locale,
      contatoNome: usuario.tenant.contatoNome,
      contatoEmail: usuario.tenant.contatoEmail,
      contatoTelefone: usuario.tenant.contatoTelefone,
    },
  };
}

function buildCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function parseTokenHeader(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function buildRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

async function criarSessao(usuario, metadata = {}) {
  const accessToken = jwt.sign(buildAuthPayload(usuario), getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = buildRefreshToken();
  const refreshTokenHash = hashPlainToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await authServiceDeps.criarSessaoAutenticacao({
    tenant: {
      connect: {
        id: usuario.tenantId,
      },
    },
    usuario: {
      connect: {
        tenantId_id: {
          tenantId: usuario.tenantId,
          id: usuario.id,
        },
      },
    },
    refreshTokenHash,
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
    response: buildAuthResponse(usuario, accessToken),
  };
}

export async function autenticarUsuarioService({
  username,
  senha,
  tenant,
  ipAddress,
  userAgent,
}) {
  if (!username || !senha || !tenant) {
    return {
      ok: false,
      status: 400,
      message: 'Empresa, nome de usuario e senha sao obrigatorios.',
    };
  }

  try {
    getJwtSecret();
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error.message);
    return {
      ok: false,
      status: 500,
      message: 'Erro de configuracao do servidor.',
    };
  }

  const usernameNormalizado = String(username).toLowerCase().trim();
  const tenantNormalizado = String(tenant).toLowerCase().trim();
  const usuariosEncontrados = await authServiceDeps.buscarUsuariosPorUsername(
    usernameNormalizado,
    tenantNormalizado
  );

  if (!usuariosEncontrados.length) {
    return {
      ok: false,
      status: 401,
      message: 'Credenciais invalidas para a empresa informada.',
    };
  }

  if (usuariosEncontrados.length > 1) {
    return {
      ok: false,
      status: 409,
      message: 'Existe um conflito de usuarios para esta empresa.',
    };
  }

  const usuario = usuariosEncontrados[0];

  if (!usuario.tenantId || !usuario.tenant) {
    return {
      ok: false,
      status: 403,
      message: 'Usuario sem tenant vinculado. Verifique a configuracao do sistema.',
    };
  }

  if (!usuario.tenant.ativo) {
    return {
      ok: false,
      status: 403,
      message: 'A empresa vinculada a este usuario esta inativa.',
    };
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

  if (!senhaCorreta) {
    return {
      ok: false,
      status: 401,
      message: 'Credenciais invalidas para a empresa informada.',
    };
  }

  const { accessToken, refreshToken, response } = await criarSessao(usuario, {
    ipAddress,
    userAgent,
  });

  await authServiceDeps.registrarLog({
    tenantId: usuario.tenantId,
    usuarioId: usuario.id,
    acao: 'LOGIN',
    entidade: 'Autenticacao',
    entidadeId: usuario.id,
    detalhes: `Login realizado para o tenant "${usuario.tenant.slug}".`,
  });

  return {
    ok: true,
    status: 200,
    data: response,
    accessToken,
    refreshToken,
    cookieOptions: buildCookieOptions(),
  };
}

export async function refreshAuthSessionService(refreshToken) {
  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      message: 'Sessao invalida.',
    };
  }

  const refreshTokenHash = hashPlainToken(refreshToken);
  const session = await authServiceDeps.buscarSessaoPorRefreshHash(refreshTokenHash);

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return {
      ok: false,
      status: 401,
      message: 'Sessao invalida ou expirada.',
    };
  }

  if (!session.tenant?.ativo) {
    return {
      ok: false,
      status: 403,
      message: 'A empresa vinculada a esta sessao esta inativa.',
    };
  }

  const accessToken = jwt.sign(
    buildAuthPayload({
      ...session.usuario,
      tenantId: session.tenantId,
    }),
    getJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_TTL,
    }
  );

  return {
    ok: true,
    status: 200,
    data: buildAuthResponse(
      {
        ...session.usuario,
        tenantId: session.tenantId,
        tenant: session.tenant,
      },
      accessToken
    ),
  };
}

export async function logoutAuthSessionService(refreshToken) {
  if (!refreshToken) {
    return {
      ok: true,
      status: 200,
      message: 'Sessao encerrada.',
      clearCookie: true,
    };
  }

  const refreshTokenHash = hashPlainToken(refreshToken);
  const session = await authServiceDeps.buscarSessaoPorRefreshHash(refreshTokenHash);

  if (session && !session.revokedAt) {
    await authServiceDeps.revogarSessaoPorId(session.id);

    await authServiceDeps.registrarLog({
      tenantId: session.tenantId,
      usuarioId: session.usuarioId,
      acao: 'LOGOUT',
      entidade: 'Autenticacao',
      entidadeId: session.usuarioId,
      detalhes: 'Sessao encerrada manualmente.',
    });
  }

  return {
    ok: true,
    status: 200,
    message: 'Sessao encerrada.',
    clearCookie: true,
  };
}

export async function forgotPasswordService({
  tenant,
  username,
  email,
  appBaseUrl,
}) {
  const tenantSlug = String(tenant || '').toLowerCase().trim();
  const usernameNormalizado = String(username || '').toLowerCase().trim();
  const emailNormalizado = String(email || '').toLowerCase().trim();

  if (!tenantSlug || (!usernameNormalizado && !emailNormalizado)) {
    return {
      ok: false,
      status: 400,
      message: 'Informe a empresa e o usuario ou e-mail para recuperar a senha.',
    };
  }

  const tenantData = await authServiceDeps.buscarTenantPorSlug(tenantSlug);

  if (!tenantData || !tenantData.ativo) {
    return {
      ok: true,
      status: 200,
      message:
        'Se os dados informados estiverem corretos, enviaremos as instrucoes de redefinicao.',
    };
  }

  const usuario = await authServiceDeps.buscarUsuarioPorEmailOuUsername({
    tenantSlug,
    username: usernameNormalizado,
    email: emailNormalizado,
  });

  if (!usuario?.email) {
    return {
      ok: true,
      status: 200,
      message:
        'Se os dados informados estiverem corretos, enviaremos as instrucoes de redefinicao.',
    };
  }

  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashPlainToken(plainToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await authServiceDeps.invalidarTokensResetDoUsuario({
    tenantId: usuario.tenantId,
    usuarioId: usuario.id,
  });

  await authServiceDeps.criarPasswordResetToken({
    tenant: {
      connect: {
        id: usuario.tenantId,
      },
    },
    usuario: {
      connect: {
        tenantId_id: {
          tenantId: usuario.tenantId,
          id: usuario.id,
        },
      },
    },
    tokenHash,
    expiresAt,
  });

  const baseUrl =
    appBaseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${baseUrl.replace(/\/$/, '')}/redefinir-senha/${plainToken}`;

  await authServiceDeps.enviarEmail({
    para: usuario.email,
    assunto: 'SIMEC | Redefinicao de senha',
    dadosTemplate: {
      nomeDestinatario: usuario.nome,
      tituloAlerta: 'Redefinicao de senha',
      mensagemPrincipal:
        'Recebemos uma solicitacao para redefinir sua senha no SIMEC. Se foi voce, use o botao abaixo para continuar.',
      detalhes: {
        Empresa: usuario.tenant.nome,
        Usuario: usuario.username,
        Validade: `${RESET_TOKEN_TTL_MINUTES} minutos`,
      },
      textoBotao: 'Redefinir senha',
      linkBotao: resetLink,
    },
  });

  await authServiceDeps.registrarLog({
    tenantId: usuario.tenantId,
    usuarioId: usuario.id,
    acao: 'RESET_SOLICITADO',
    entidade: 'Autenticacao',
    entidadeId: usuario.id,
    detalhes: 'Solicitacao de redefinicao de senha registrada.',
  });

  return {
    ok: true,
    status: 200,
    message:
      'Se os dados informados estiverem corretos, enviaremos as instrucoes de redefinicao.',
  };
}

export async function resetPasswordService({ token, senha }) {
  if (!token || !senha) {
    return {
      ok: false,
      status: 400,
      message: 'Token e nova senha sao obrigatorios.',
    };
  }

  if (String(senha).length < 6) {
    return {
      ok: false,
      status: 400,
      message: 'A senha deve ter no minimo 6 caracteres.',
    };
  }

  const tokenHash = hashPlainToken(token);
  const resetToken = await authServiceDeps.buscarPasswordResetTokenPorHash(tokenHash);

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= new Date() ||
    !resetToken.tenant?.ativo
  ) {
    return {
      ok: false,
      status: 400,
      message: 'Token invalido ou expirado.',
    };
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  await authServiceDeps.atualizarSenhaUsuario({
    tenantId: resetToken.tenantId,
    usuarioId: resetToken.usuarioId,
    senhaHash,
  });
  await authServiceDeps.marcarPasswordResetTokenComoUsado(resetToken.id);
  await authServiceDeps.revogarSessoesDoUsuario({
    tenantId: resetToken.tenantId,
    usuarioId: resetToken.usuarioId,
  });

  await authServiceDeps.registrarLog({
    tenantId: resetToken.tenantId,
    usuarioId: resetToken.usuarioId,
    acao: 'RESET_CONCLUIDO',
    entidade: 'Autenticacao',
    entidadeId: resetToken.usuarioId,
    detalhes: 'Senha redefinida com sucesso.',
  });

  return {
    ok: true,
    status: 200,
    message: 'Senha redefinida com sucesso.',
  };
}

export function extrairAccessToken(headers = {}) {
  const authorization = headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice(7);
}

export function validarAccessToken(token) {
  if (!token) return null;
  return parseTokenHeader(token);
}

export function getRefreshCookieOptions() {
  return buildCookieOptions();
}
