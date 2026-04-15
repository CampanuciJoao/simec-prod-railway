import React from 'react';
import { Link } from 'react-router-dom';

import AuthLayout from '../../components/auth/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';
import { useLogin } from '../../hooks/auth/useLogin';

function LoginPage() {
  const {
    username,
    senha,
    error,
    loading,
    setUsername,
    setSenha,
    handleSubmit,
  } = useLogin();

  return (
    <AuthLayout>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl md:p-10">

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            Entrar
          </h2>
          <p className="text-sm text-slate-500">
            Acesse sua conta
          </p>
        </div>

        <LoginForm
          username={username}
          senha={senha}
          error={error}
          loading={loading}
          onChangeUsername={setUsername}
          onChangeSenha={setSenha}
          onSubmit={handleSubmit}
        />

        <div className="mt-6 text-center">
          <Link
            to="/recuperar-senha"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
}

export default LoginPage;