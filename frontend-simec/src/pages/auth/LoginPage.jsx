import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';

import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
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
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
          borderColor: 'rgba(148,163,184,0.2)',
          boxShadow: '0 30px 80px rgba(15, 23, 42, 0.28)',
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
                style={{ color: '#0f172a' }}
              >
                Entrar no SIMEC
              </h2>
              <p
                className="mt-2 text-sm leading-6"
                style={{ color: '#64748b' }}
              >
                Acesse sua area de trabalho para acompanhar ativos,
                manutencoes, contratos e indicadores em um unico ambiente de
                operacao.
              </p>
            </div>
          </div>

          <div
            className="rounded-[28px] border p-5 sm:p-6"
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#dbe4f0',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
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
          </div>

          <div
            className="flex items-center justify-between gap-4 border-t pt-5"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="text-xs" style={{ color: '#64748b' }}>
              Acesso exclusivo para clientes autorizados.
            </div>

            <Link
              to="/recuperar-senha"
            className="text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#2563eb' }}
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
