import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faKey } from '@fortawesome/free-solid-svg-icons';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button, Input } from '@/components/ui';
import { forgotPassword } from '@/services/api';

function ForgotPasswordPage() {
  const [tenant, setTenant] = useState('simec-default');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await forgotPassword({ tenant, username, email });
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Nao foi possivel iniciar a recuperacao.'
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
            Recuperacao de acesso
          </div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Recuperar senha
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Informe empresa e usuario ou e-mail para receber o link de redefinicao.
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
            label="Empresa / slug"
            value={tenant}
            onChange={(event) => setTenant(event.target.value)}
            required
          />
          <Input
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Voce pode usar usuario ou e-mail"
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            leadingIcon={<FontAwesomeIcon icon={faEnvelope} />}
          />

          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de redefinicao'}
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

export default ForgotPasswordPage;
