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
import { Card } from '@/components/ui';

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
      <Card
        className="w-full overflow-hidden rounded-3xl shadow-2xl"
        padded={false}
        style={{
          background:
            'linear-gradient(180deg, var(--brand-primary-surface-soft) 0%, var(--brand-primary-surface) 100%)',
          borderColor: 'var(--brand-primary-soft)',
          boxShadow: '0 24px 60px rgba(2, 6, 23, 0.28)',
        }}
      >
        <div className="p-8 md:p-10">
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{
                borderColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
                backgroundColor: 'var(--bg-elevated)',
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
            <Card
              surface="elevated"
              className="rounded-2xl"
              style={{ borderColor: 'var(--brand-primary-soft)' }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faBuildingShield} className="mr-2" />
                Empresa isolada
              </div>
              <div
                className="mt-1 text-xs leading-5"
                style={{ color: 'var(--text-muted)' }}
              >
                Cada login é vinculado ao tenant informado.
              </div>
            </Card>

            <Card
              surface="elevated"
              className="rounded-2xl"
              style={{ borderColor: 'var(--brand-primary-soft)' }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faShieldHalved} className="mr-2" />
                Rotas protegidas
              </div>
              <div
                className="mt-1 text-xs leading-5"
                style={{ color: 'var(--text-muted)' }}
              >
                O sistema exige token válido em toda a área autenticada.
              </div>
            </Card>

            <Card
              surface="elevated"
              className="rounded-2xl"
              style={{ borderColor: 'var(--brand-primary-soft)' }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />
                Sessão controlada
              </div>
              <div
                className="mt-1 text-xs leading-5"
                style={{ color: 'var(--text-muted)' }}
              >
                Sessões expiradas são descartadas automaticamente.
              </div>
            </Card>
          </div>

          <Card surface="default" className="rounded-2xl">
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
          </Card>

          <div className="mt-6 text-center">
            <Link
              to="/recuperar-senha"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--brand-primary)' }}
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default LoginPage;
