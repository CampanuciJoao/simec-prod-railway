import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import test, { afterEach, beforeEach } from 'node:test';

import { admin, proteger, superadmin } from '../../middleware/authMiddleware.js';
import prisma from '../../services/prismaService.js';

const originalFindUnique = prisma.usuario.findUnique;
const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterEach(() => {
  prisma.usuario.findUnique = originalFindUnique;
  process.env.JWT_SECRET = originalJwtSecret;
});

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('proteger retorna 401 quando token nao foi enviado', async () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  await proteger(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Nao autorizado. Nenhum token foi fornecido.');
});

test('proteger popula req.usuario quando token e tenant sao validos', async () => {
  const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const res = createResponse();
  let nextCalled = false;

  prisma.usuario.findUnique = async () => ({
    id: 'user-1',
    nome: 'Admin',
    role: 'admin',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
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
  });

  await proteger(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.usuario.tenantId, 'tenant-1');
  assert.equal(req.auth.role, 'admin');
});

test('proteger bloqueia usuario de tenant inativo', async () => {
  const token = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET);
  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const res = createResponse();

  prisma.usuario.findUnique = async () => ({
    id: 'user-1',
    nome: 'Admin',
    role: 'admin',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    tenant: {
      id: 'tenant-1',
      nome: 'Hospital',
      slug: 'hospital',
      ativo: false,
    },
  });

  await proteger(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.message,
    'A empresa vinculada a este usuario esta inativa.'
  );
});

test('admin e superadmin aplicam politica de acesso por role', () => {
  const forbiddenRes = createResponse();
  let adminNext = false;
  let superadminNext = false;

  admin({ usuario: { role: 'user' } }, forbiddenRes, () => {
    adminNext = true;
  });
  superadmin({ usuario: { role: 'superadmin' } }, createResponse(), () => {
    superadminNext = true;
  });

  assert.equal(adminNext, false);
  assert.equal(forbiddenRes.statusCode, 403);
  assert.equal(superadminNext, true);
});
