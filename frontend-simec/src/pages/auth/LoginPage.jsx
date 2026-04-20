import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingShield,
  faClockRotateLeft,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import { Card } from '@/components/ui';
import { useLogin } from '@/hooks/auth/useLogin';

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
      <div
        className="w-full rounded-[32px] border p-6 shadow-2xl sm:p-8"
        style={{
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderColor: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="space-y-6">
          <div className="space-y-4">
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

            <div>
              <h2
                className="text-3xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Entrar no SIMEC
              </h2>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: 'var(--text-muted)' }}
              >
                Acesse seu ambiente com escopo por empresa, sessao controlada e
                isolamento multi-tenant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faBuildingShield} className="mr-2" />
                Tenant
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Cada acesso entra no tenant informado.
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faShieldHalved} className="mr-2" />
                Protecao
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Rotas autenticadas e governanca por perfil.
              </div>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderColor: 'var(--border-soft)',
              }}
            >
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2" />
                Sessao
              </div>
              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Expiracao e renovacao controladas.
              </div>
            </div>
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

          <div
            className="flex items-center justify-between gap-4 border-t pt-5"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ambiente SaaS com operacao por tenant.
            </div>

            <Link
              to="/recuperar-senha"
              className="text-sm font-medium transition-opacity hover:opacity-80"
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
