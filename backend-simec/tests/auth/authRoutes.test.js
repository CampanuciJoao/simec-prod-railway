import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';

import { buildAuthRouter } from '../../routes/authRoutes.js';

async function withServer(router, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const port = server.address().port;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('login aplica rate limit apos cinco falhas no mesmo bucket', async () => {
  const router = buildAuthRouter({
    autenticarUsuarioService: async () => ({
      ok: false,
      status: 401,
      message: 'Credenciais invalidas para a empresa informada.',
    }),
  });

  await withServer(router, async (baseUrl) => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '10.0.0.1',
        },
        body: JSON.stringify({
          username: 'admin',
          senha: 'errada',
          tenant: 'hospital',
        }),
      });

      assert.equal(response.status, 401);
    }

    const limited = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '10.0.0.1',
      },
      body: JSON.stringify({
        username: 'admin',
        senha: 'errada',
        tenant: 'hospital',
      }),
    });

    const payload = await limited.json();
    assert.equal(limited.status, 429);
    assert.match(payload.message, /Muitas tentativas/);
    assert.ok(payload.retryAfterSeconds > 0);
  });
});

test('refresh le o cookie e devolve payload de sucesso do servico', async () => {
  let receivedRefreshToken = null;
  const router = buildAuthRouter({
    refreshAuthSessionService: async (refreshToken) => {
      receivedRefreshToken = refreshToken;
      return {
        ok: true,
        status: 200,
        data: {
          token: 'access-token',
          usuario: { id: 'user-1' },
          tenant: { id: 'tenant-1' },
        },
      };
    },
  });

  await withServer(router, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: 'simec_refresh_token=refresh-123',
      },
    });

    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(receivedRefreshToken, 'refresh-123');
    assert.equal(payload.token, 'access-token');
  });
});
