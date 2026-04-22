import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import test, { afterEach, beforeEach } from 'node:test';

import {
  __resetAuthServiceDepsForTests,
  __setAuthServiceDepsForTests,
  autenticarUsuarioService,
  extrairAccessToken,
  getRefreshCookieOptions,
  refreshAuthSessionService,
  validarAccessToken,
} from '../../services/auth/authService.js';

const originalEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
};

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  __resetAuthServiceDepsForTests();
  process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
});

test('autenticarUsuarioService normaliza username e tenant antes da busca', async () => {
  let received = null;

  __setAuthServiceDepsForTests({
    buscarUsuariosPorUsername: async (username, tenant) => {
      received = { username, tenant };
      return [];
    },
  });

  const resultado = await autenticarUsuarioService({
    username: ' Admin ',
    senha: 'segredo',
    tenant: ' Hospital-Matriz ',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.status, 401);
  assert.deepEqual(received, {
    username: 'admin',
    tenant: 'hospital-matriz',
  });
});

test('autenticarUsuarioService bloqueia tenant inativo', async () => {
  const senhaHash = await bcrypt.hash('segredo', 10);

  __setAuthServiceDepsForTests({
    buscarUsuariosPorUsername: async () => [
      {
        id: 'user-1',
        tenantId: 'tenant-1',
        nome: 'Admin',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        senha: senhaHash,
        tenant: {
          id: 'tenant-1',
          nome: 'Hospital',
          slug: 'hospital',
          ativo: false,
        },
      },
    ],
  });

  const resultado = await autenticarUsuarioService({
    username: 'admin',
    senha: 'segredo',
    tenant: 'hospital',
  });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.status, 403);
  assert.equal(
    resultado.message,
    'A empresa vinculada a este usuario esta inativa.'
  );
});

test('autenticarUsuarioService cria sessao e resposta quando credenciais estao corretas', async () => {
  const senhaHash = await bcrypt.hash('segredo', 10);
  const createdSessions = [];
  const logs = [];

  __setAuthServiceDepsForTests({
    buscarUsuariosPorUsername: async () => [
      {
        id: 'user-1',
        tenantId: 'tenant-1',
        nome: 'Admin',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        senha: senhaHash,
        tenant: {
          id: 'tenant-1',
          nome: 'Hospital',
          slug: 'hospital',
          timezone: 'America/Cuiaba',
          locale: 'pt-BR',
          contatoNome: 'Maria',
          contatoEmail: 'contato@example.com',
          contatoTelefone: '65999999999',
          ativo: true,
        },
      },
    ],
    criarSessaoAutenticacao: async (data) => {
      createdSessions.push(data);
      return { id: 'session-1' };
    },
    registrarLog: async (data) => {
      logs.push(data);
    },
  });

  const resultado = await autenticarUsuarioService({
    username: 'admin',
    senha: 'segredo',
    tenant: 'hospital',
    ipAddress: '127.0.0.1',
    userAgent: 'node-test',
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.status, 200);
  assert.equal(resultado.data.usuario.tenantId, 'tenant-1');
  assert.equal(resultado.data.tenant.slug, 'hospital');
  assert.ok(typeof resultado.accessToken === 'string');
  assert.ok(typeof resultado.refreshToken === 'string');
  assert.equal(createdSessions.length, 1);
  assert.equal(createdSessions[0].ipAddress, '127.0.0.1');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].acao, 'LOGIN');
});

test('refreshAuthSessionService rejeita sessao de tenant inativo', async () => {
  const refreshToken = 'refresh-token';
  const refreshHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  __setAuthServiceDepsForTests({
    buscarSessaoPorRefreshHash: async (hash) => {
      assert.equal(hash, refreshHash);
      return {
        id: 'session-1',
        tenantId: 'tenant-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        tenant: {
          id: 'tenant-1',
          nome: 'Hospital',
          slug: 'hospital',
          ativo: false,
        },
        usuario: {
          id: 'user-1',
          nome: 'Admin',
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
        },
      };
    },
  });

  const resultado = await refreshAuthSessionService(refreshToken);

  assert.equal(resultado.ok, false);
  assert.equal(resultado.status, 403);
});

test('helpers de token e cookie retornam contrato esperado', () => {
  const token = extrairAccessToken({
    authorization: 'Bearer abc.def.ghi',
  });
  const cookieOptions = getRefreshCookieOptions();

  assert.equal(token, 'abc.def.ghi');
  assert.equal(validarAccessToken(null), null);
  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, 'lax');
});
