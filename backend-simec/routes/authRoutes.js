import express from 'express';

import {
  REFRESH_TOKEN_COOKIE,
  autenticarUsuarioService,
  forgotPasswordService,
  getRefreshCookieOptions,
  logoutAuthSessionService,
  refreshAuthSessionService,
  resetPasswordService,
} from '../services/auth/authService.js';

const router = express.Router();

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const attemptBuckets = new Map();

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';

  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

function buildAttemptKey(req, mode) {
  const username = String(req.body?.username || req.body?.email || '')
    .toLowerCase()
    .trim();
  const tenant = String(req.body?.tenant || '').toLowerCase().trim();
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
  return `${mode}:${ip}:${tenant}:${username}`;
}

function getAttemptState(key, windowMs) {
  const now = Date.now();
  const current = attemptBuckets.get(key);

  if (!current || current.expiresAt <= now) {
    const fresh = {
      count: 0,
      expiresAt: now + windowMs,
    };
    attemptBuckets.set(key, fresh);
    return fresh;
  }

  return current;
}

function clearAttemptState(key) {
  attemptBuckets.delete(key);
}

function respondIfRateLimited(res, attemptState, maxAttempts) {
  if (attemptState.count < maxAttempts) {
    return false;
  }

  const retryAfterSeconds = Math.ceil(
    Math.max(0, attemptState.expiresAt - Date.now()) / 1000
  );

  res.status(429).json({
    message:
      'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
    retryAfterSeconds,
  });

  return true;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie?.(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie?.(REFRESH_TOKEN_COOKIE, {
    ...getRefreshCookieOptions(),
    maxAge: 0,
  });
}

router.post('/login', async (req, res) => {
  const attemptKey = buildAttemptKey(req, 'login');
  const attemptState = getAttemptState(attemptKey, LOGIN_WINDOW_MS);

  if (respondIfRateLimited(res, attemptState, LOGIN_MAX_ATTEMPTS)) {
    return;
  }

  try {
    const resultado = await autenticarUsuarioService({
      username: req.body?.username,
      senha: req.body?.senha,
      tenant: req.body?.tenant,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!resultado.ok) {
      attemptState.count += 1;
      attemptBuckets.set(attemptKey, attemptState);

      return res.status(resultado.status).json({
        message: resultado.message,
      });
    }

    clearAttemptState(attemptKey);
    setRefreshCookie(res, resultado.refreshToken);

    return res.status(resultado.status).json(resultado.data);
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  const attemptKey = buildAttemptKey(req, 'forgot-password');
  const attemptState = getAttemptState(attemptKey, RESET_WINDOW_MS);

  if (respondIfRateLimited(res, attemptState, RESET_MAX_ATTEMPTS)) {
    return;
  }

  try {
    const resultado = await forgotPasswordService({
      tenant: req.body?.tenant,
      username: req.body?.username,
      email: req.body?.email,
      appBaseUrl: process.env.FRONTEND_URL,
    });

    clearAttemptState(attemptKey);
    return res.status(resultado.status).json({
      message: resultado.message,
    });
  } catch (error) {
    console.error('[AUTH_FORGOT_PASSWORD_ERROR]', error);
    attemptState.count += 1;
    attemptBuckets.set(attemptKey, attemptState);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const resultado = await resetPasswordService({
      token: req.body?.token,
      senha: req.body?.senha,
    });

    return res.status(resultado.status).json({
      message: resultado.message,
    });
  } catch (error) {
    console.error('[AUTH_RESET_PASSWORD_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const resultado = await refreshAuthSessionService(
      cookies[REFRESH_TOKEN_COOKIE]
    );

    return res.status(resultado.status).json(
      resultado.ok
        ? resultado.data
        : {
            message: resultado.message,
          }
    );
  } catch (error) {
    console.error('[AUTH_REFRESH_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const resultado = await logoutAuthSessionService(
      cookies[REFRESH_TOKEN_COOKIE]
    );

    clearRefreshCookie(res);

    return res.status(resultado.status).json({
      message: resultado.message,
    });
  } catch (error) {
    console.error('[AUTH_LOGOUT_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
    });
  }
});

export default router;
