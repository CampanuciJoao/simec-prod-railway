import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { buscarUsuariosPorUsername } from './authRepository.js';

export async function autenticarUsuarioService({ username, senha }) {
  if (!username || !senha) {
    return {
      ok: false,
      status: 400,
      message: 'Nome de usuario e senha sao obrigatorios.',
    };
  }

  if (!process.env.JWT_SECRET) {
    console.error('[AUTH_LOGIN_ERROR] JWT_SECRET nao configurado.');
    return {
      ok: false,
      status: 500,
      message: 'Erro de configuracao do servidor.',
    };
  }

  const usernameNormalizado = String(username).toLowerCase().trim();
  const usuariosEncontrados = await buscarUsuariosPorUsername(usernameNormalizado);

  if (!usuariosEncontrados.length) {
    return {
      ok: false,
      status: 401,
      message: 'Credenciais invalidas.',
    };
  }

  if (usuariosEncontrados.length > 1) {
    return {
      ok: false,
      status: 409,
      message:
        'Existem multiplos usuarios com esse login em empresas diferentes. O login precisa ser ajustado para considerar a empresa.',
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
      message: 'Credenciais invalidas.',
    };
  }

  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    role: usuario.role,
    tenantId: usuario.tenantId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });

  return {
    ok: true,
    status: 200,
    data: {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        username: usuario.username,
        role: usuario.role,
        tenantId: usuario.tenantId,
      },
      tenant: {
        id: usuario.tenant.id,
        nome: usuario.tenant.nome,
        slug: usuario.tenant.slug,
        timezone: usuario.tenant.timezone,
        locale: usuario.tenant.locale,
      },
    },
  };
}
