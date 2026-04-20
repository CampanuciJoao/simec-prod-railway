import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button, Input } from '@/components/ui';
import { resetPassword } from '@/services/api';

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (senha !== confirmacao) {
      setError('As senhas nao coincidem.');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword({ token, senha });
      setMessage(response.message);
      window.setTimeout(() => navigate('/login', { replace: true }), 1600);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Nao foi possivel redefinir sua senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full rounded-3xl border p-8 shadow-2xl backdrop-blur-sm md:p-10"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
        }}
      >
        <div className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{
              borderColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
              backgroundColor: 'var(--brand-primary-surface-soft)',
            }}
          >
            <FontAwesomeIcon icon={faKey} />
            Nova senha
          </div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Redefinir senha
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Defina uma nova senha segura para voltar ao seu tenant.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Input
            label="Nova senha"
            type="password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
            required
          />

          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
            Voltar para o login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
