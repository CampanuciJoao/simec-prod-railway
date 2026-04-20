import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingShield,
  faClockRotateLeft,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import AuthLayout from '../../components/auth/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import { useLogin } from '../../hooks/auth/useLogin';

function LoginPage() {
  const {
    tenant,
    username,
    senha,
    error,
    loading,
    setTenant,
    setUsername,
    setSenha,
    handleSubmit,
  } = useLogin();

  return (
    <AuthLayout>
      <div className="w-full rounded-3xl border shadow-2xl backdrop-blur-sm">
        <div
          className="rounded-3xl border p-8 md:p-10"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-soft)',
          }}
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{
                borderColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
                backgroundColor: 'var(--brand-primary-surface-soft)',
              }}
            >
              <FontAwesomeIcon icon={faShieldHalved} />
              Acesso seguro
            </div>

            <h2
              className="mt-4 text-3xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Entrar no SIMEC
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: 'var(--text-muted)' }}
            >
              Use empresa, usuário e senha para acessar seu ambiente com escopo por tenant.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <FontAwesomeIcon icon={faBuildingShield} className="mr-2" />
                Empresa isolada
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Cada login é vinculado ao tenant informado.
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <FontAwesomeIcon icon={faShieldHalved} className="mr-2" />
                Rotas protegidas
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                O sistema exige token válido em toda a área autenticada.
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />
                Sessão controlada
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Sessões expiradas são descartadas automaticamente.
              </div>
            </div>
          </div>

          <LoginForm
            tenant={tenant}
            username={username}
            senha={senha}
            error={error}
            loading={loading}
            onChangeTenant={setTenant}
            onChangeUsername={setUsername}
            onChangeSenha={setSenha}
            onSubmit={handleSubmit}
          />

          <div className="mt-6 text-center">
            <Link
              to="/recuperar-senha"
              className="text-sm font-medium"
              style={{ color: 'var(--brand-primary)' }}
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
