import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logoSimec from '../../assets/images/logo-simec.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faUser, faLock } from '@fortawesome/free-solid-svg-icons';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, senha);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const errorMessage =
        err.message || 'Falha no login. Verifique suas credenciais e a conexão.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <div className="hidden lg:flex flex-col justify-between bg-slate-900 px-12 py-10 text-white">
          <div className="max-w-md">
            <img
              src={logoSimec}
              alt="SIMEC Logo"
              className="h-auto w-auto max-w-[220px] object-contain"
            />

            <div className="mt-10 space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">
                SIMEC
              </h1>
              <p className="text-base leading-7 text-slate-300">
                Sistema de Monitoramento de Engenharia Clínica
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Centralize equipamentos, manutenções, contratos, alertas e
                indicadores em uma única plataforma moderna.
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            Plataforma de gestão para engenharia clínica
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-100 px-4 py-10">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <img
                src={logoSimec}
                alt="SIMEC Logo"
                className="mb-4 h-auto w-auto max-w-[180px] object-contain"
              />
              <p className="text-sm text-slate-500">
                Sistema de Monitoramento de Engenharia Clínica
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Entrar
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Acesse sua conta para continuar no sistema
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="label">
                  Nome de Usuário
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FontAwesomeIcon icon={faUser} />
                  </span>

                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    required
                    disabled={loading}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="senha" className="label">
                  Senha
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <FontAwesomeIcon icon={faLock} />
                  </span>

                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                    disabled={loading}
                    className="input pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/recuperar-senha"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;